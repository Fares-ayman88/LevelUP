import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from '../services/firebase.js';
import {
  requestEmailOtpCode,
  verifyEmailOtpCode,
} from '../services/pocketbaseEmailOtp.js';
import {
  extractAliasFromEmail,
  isStaticAdminAlias,
  isStaticAdminEmail,
  staticAdminAuthPasswordForAlias,
  staticAdminEmailsForAlias,
} from '../services/staticAdmins.js';
export { isStaticAdminAlias, isStaticAdminEmail };

const PENDING_GOOGLE_LINK_KEY = 'levelup_pending_google_link';
const EMAIL_OTP_VERIFIED_FIELD = 'emailOtpVerified';
const EMAIL_OTP_VERIFIED_AT_FIELD = 'emailOtpVerifiedAt';

export function resolveStaticAdminAlias(value = '') {
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return '';
  if (isStaticAdminAlias(normalized)) return normalized;
  if (isStaticAdminEmail(normalized)) return extractAliasFromEmail(normalized);
  return '';
}

function isStaticAdminPasswordValid(alias, password) {
  const normalizedAlias = alias.toString().trim().toLowerCase();
  const normalizedPassword = password.toString().trim();
  if (!normalizedAlias || !normalizedPassword) return false;
  const authPassword = staticAdminAuthPasswordForAlias(normalizedAlias);
  return normalizedPassword === normalizedAlias || normalizedPassword === authPassword;
}

function parseRole(raw) {
  switch ((raw || '').toString().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'instructor':
      return 'instructor';
    default:
      return 'student';
  }
}

function normalizePhotoUrl(value = '') {
  if (value == null) return '';
  const normalized = `${value}`.trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  if (normalized.startsWith('blob:')) return '';
  return normalized;
}

function buildProfile({ uid, data = {}, fallbackUser }) {
  const email = (data.email || fallbackUser?.email || '').toString().trim();
  const name =
    (data.name || data.fullName || fallbackUser?.displayName || '')
      .toString()
      .trim();
  const photoUrlCandidates = [
    data.photoUrl,
    data.photoURL,
    fallbackUser?.photoURL,
    data.avatarUrl,
  ];
  const photoUrl = photoUrlCandidates
    .map((item) => normalizePhotoUrl(item))
    .find(Boolean) || '';
  const staticAdmin = isStaticAdminEmail(email);
  const role = staticAdmin ? 'admin' : parseRole(data.role);
  const status = staticAdmin ? 'active' : (data.status || '').toString();
  const approved = staticAdmin ? true : data.approved === true;
  const isActive = status.length === 0 || status.toLowerCase() === 'active';

  return {
    uid,
    email,
    name,
    photoUrl,
    role,
    status,
    approved,
    isActive,
    emailOtpVerified:
      data[EMAIL_OTP_VERIFIED_FIELD] === true ||
      Boolean(data[EMAIL_OTP_VERIFIED_AT_FIELD]),
    emailOtpVerifiedAt: data[EMAIL_OTP_VERIFIED_AT_FIELD] || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeSignInMethod(value = '') {
  return value.toString().trim().toLowerCase();
}

function formatSignInMethodLabel(value = '') {
  switch (normalizeSignInMethod(value)) {
    case 'password':
      return 'email and password';
    case 'google.com':
      return 'Google';
    case 'apple.com':
      return 'Apple';
    case 'facebook.com':
      return 'Facebook';
    case 'github.com':
      return 'GitHub';
    default:
      return value || 'another sign-in method';
  }
}

function hasPasswordProvider(user) {
  return Array.isArray(user?.providerData)
    ? user.providerData.some((provider) => provider?.providerId === 'password')
    : false;
}

export function isEmailOtpVerifiedProfile(profile = null) {
  return profile?.emailOtpVerified === true || Boolean(profile?.emailOtpVerifiedAt);
}

export function getVerificationEmail(user, profile = null) {
  return (profile?.email || user?.email || '').toString().trim().toLowerCase();
}

export function isEmailVerificationRequired(user, profile = null) {
  const normalizedEmail = getVerificationEmail(user, profile);
  if (!user || !normalizedEmail) return false;
  if (isStaticAdminEmail(normalizedEmail)) return false;
  if (!hasPasswordProvider(user)) return false;
  if (user.emailVerified) return false;
  return !isEmailOtpVerifiedProfile(profile);
}

export async function checkEmailVerificationRequirement(user, profile = null) {
  if (!user) return false;
  if (!isEmailVerificationRequired(user, profile)) return false;
  if (profile) return true;
  if (!db || !user.uid) return true;

  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    if (!snapshot.exists()) return true;
    return isEmailVerificationRequired(user, buildProfile({
      uid: user.uid,
      data: snapshot.data(),
      fallbackUser: user,
    }));
  } catch {
    return true;
  }
}

function readPendingGoogleLink() {
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(PENDING_GOOGLE_LINK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    storage.removeItem(PENDING_GOOGLE_LINK_KEY);
    return null;
  }
}

function clearPendingGoogleLink() {
  const storage = getSessionStorage();
  storage?.removeItem(PENDING_GOOGLE_LINK_KEY);
}

function storePendingGoogleLink({ email = '', signInMethods = [], credential = null }) {
  const storage = getSessionStorage();
  if (!storage || !credential) return;
  const idToken = credential.idToken || '';
  const accessToken = credential.accessToken || '';
  if (!idToken && !accessToken) return;
  storage.setItem(
    PENDING_GOOGLE_LINK_KEY,
    JSON.stringify({
      email: email.toString().trim().toLowerCase(),
      signInMethods: Array.isArray(signInMethods)
        ? signInMethods.map((item) => normalizeSignInMethod(item)).filter(Boolean)
        : [],
      idToken,
      accessToken,
    })
  );
}

function buildPendingGoogleCredential(payload) {
  if (!payload) return null;
  const idToken = payload.idToken || undefined;
  const accessToken = payload.accessToken || undefined;
  if (!idToken && !accessToken) return null;
  return GoogleAuthProvider.credential(idToken, accessToken);
}

async function getExistingSignInMethods(email = '') {
  if (!auth || !email) return [];
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch {
    return [];
  }
}

async function linkPendingGoogleCredentialIfNeeded(user) {
  const pending = readPendingGoogleLink();
  if (!user?.email || !pending) return null;

  const normalizedEmail = user.email.toString().trim().toLowerCase();
  if (pending.email && pending.email !== normalizedEmail) {
    return null;
  }

  const credential = buildPendingGoogleCredential(pending);
  if (!credential) {
    clearPendingGoogleLink();
    return null;
  }

  try {
    const linked = await linkWithCredential(user, credential);
    clearPendingGoogleLink();
    return linked;
  } catch (error) {
    const code = error?.code || '';
    if (
      code === 'auth/provider-already-linked' ||
      code === 'provider-already-linked' ||
      code === 'auth/credential-already-in-use' ||
      code === 'credential-already-in-use'
    ) {
      clearPendingGoogleLink();
      return null;
    }
    return null;
  }
}

function shouldPreferGoogleRedirect() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const mobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
    navigator.userAgent || ''
  );
  const mobileDevice =
    navigator.userAgentData?.mobile === true ||
    mobileUserAgent ||
    Boolean(window.matchMedia?.('(max-width: 820px) and (pointer: coarse)').matches);

  return mobileDevice;
}

function createGoogleProvider({ loginHint = '' } = {}) {
  const provider = new GoogleAuthProvider();
  const normalizedHint = loginHint.toString().trim();
  const customParameters = {
    prompt: 'select_account',
  };

  if (normalizedHint.includes('@')) {
    customParameters.login_hint = normalizedHint;
  }

  provider.setCustomParameters(customParameters);
  return provider;
}

function isPasswordResetHiddenError(error) {
  const code = error?.code || '';
  return code === 'auth/user-not-found' || code === 'user-not-found';
}

function shouldRetryPasswordResetWithoutContinueUrl(error) {
  const code = error?.code || '';
  return (
    code === 'auth/invalid-continue-uri' ||
    code === 'invalid-continue-uri' ||
    code === 'auth/missing-continue-uri' ||
    code === 'missing-continue-uri' ||
    code === 'auth/unauthorized-continue-uri' ||
    code === 'unauthorized-continue-uri' ||
    code === 'auth/invalid-dynamic-link-domain' ||
    code === 'invalid-dynamic-link-domain'
  );
}

function buildPasswordResetActionSettings() {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL('/password-reset-success', window.location.origin);
    url.searchParams.set('source', 'reset-email');
    return {
      url: url.toString(),
      handleCodeInApp: false,
    };
  } catch {
    return null;
  }
}

async function dispatchPasswordResetEmail(email, actionCodeSettings = null) {
  if (actionCodeSettings) {
    return sendPasswordResetEmail(auth, email, actionCodeSettings);
  }
  return sendPasswordResetEmail(auth, email);
}

export function getGenericPasswordResetMessage(email = '') {
  const normalizedEmail = email.toString().trim();
  if (normalizedEmail) {
    return `If an account exists for ${normalizedEmail}, we'll send a password reset link shortly.`;
  }
  return "If an account exists for that email, we'll send a password reset link shortly.";
}

async function syncGoogleUserProfile(result) {
  const user = result?.user;
  if (!db || !user?.uid) return result;

  const name = (user.displayName || '').toString().trim();
  const email = (user.email || '').toString().trim();
  const photoUrl = normalizePhotoUrl(user.photoURL || '');
  const payload = {
    updatedAt: serverTimestamp(),
  };

  if (name) {
    payload.name = name;
    payload.fullName = name;
  }
  if (email) payload.email = email;
  if (photoUrl) {
    payload.photoUrl = photoUrl;
    payload.photoURL = photoUrl;
  }

  try {
    await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
  } catch {
    // Do not block auth flow if profile write fails.
  }

  return result;
}

async function enrichGoogleAuthError(error) {
  const code = error?.code || '';
  if (
    code !== 'auth/account-exists-with-different-credential' &&
    code !== 'account-exists-with-different-credential'
  ) {
    return error;
  }

  const email = (error?.customData?.email || '').toString().trim().toLowerCase();
  const existingSignInMethods = await getExistingSignInMethods(email);
  const pendingCredential = GoogleAuthProvider.credentialFromError(error);

  storePendingGoogleLink({
    email,
    signInMethods: existingSignInMethods,
    credential: pendingCredential,
  });

  error.pendingGoogleSignIn = true;
  error.pendingEmail = email;
  error.existingSignInMethods = existingSignInMethods;
  return error;
}

export function resolveAuthRole(profile, user = null) {
  const explicitRole = (profile?.role || '').toString().trim().toLowerCase();
  if (explicitRole === 'admin' || explicitRole === 'instructor' || explicitRole === 'student') {
    return explicitRole;
  }

  const email = (profile?.email || user?.email || '').toString().trim();
  if (isStaticAdminEmail(email)) {
    return 'admin';
  }

  return user ? 'student' : '';
}

export function getAuthErrorMessage(error) {
  const code = error?.code || '';
  const existingMethods = Array.isArray(error?.existingSignInMethods)
    ? error.existingSignInMethods.map((item) => normalizeSignInMethod(item)).filter(Boolean)
    : [];

  switch (code) {
    case 'auth/invalid-email':
    case 'invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
    case 'user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'user-not-found':
      return 'No account found for this email.';
    case 'auth/wrong-password':
    case 'wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
    case 'invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
    case 'email-already-in-use':
      return 'This email is already in use.';
    case 'auth/operation-not-allowed':
    case 'operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase Auth.';
    case 'auth/weak-password':
    case 'weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
    case 'network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
    case 'too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/expired-action-code':
    case 'expired-action-code':
      return 'This password reset link has expired. Request a new one.';
    case 'auth/invalid-action-code':
    case 'invalid-action-code':
      return 'This password reset link is invalid or has already been used.';
    case 'auth/popup-blocked':
    case 'popup-blocked':
      return 'The Google sign-in popup was blocked, so we switched to a full-page Google sign-in.';
    case 'auth/popup-closed-by-user':
    case 'popup-closed-by-user':
      return 'Google sign-in was cancelled before it finished.';
    case 'auth/cancelled-popup-request':
    case 'cancelled-popup-request':
      return 'Another Google sign-in request is already in progress.';
    case 'auth/unauthorized-domain':
    case 'unauthorized-domain':
      return 'This domain is not authorized for Google sign-in in Firebase Auth.';
    case 'auth/account-exists-with-different-credential':
    case 'account-exists-with-different-credential':
      if (existingMethods.includes('password')) {
        return 'This email already has an account. Sign in with your email and password first, and Google will be linked automatically.';
      }
      if (existingMethods.length > 0) {
        const providers = existingMethods.map((item) => formatSignInMethodLabel(item)).join(', ');
        return `This email already exists with ${providers}. Sign in with that method first, then try Google again.`;
      }
      return 'This email already exists with another sign-in method. Sign in with that method first, then try Google again.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      return undefined;
    }

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRef = doc(db, 'users', nextUser.uid);
      unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setProfile(buildProfile({ uid: nextUser.uid, fallbackUser: nextUser }));
          } else {
            setProfile(
              buildProfile({
                uid: nextUser.uid,
                data: snapshot.data(),
                fallbackUser: nextUser,
              })
            );
          }
          setLoading(false);
        },
        () => {
          setProfile(buildProfile({ uid: nextUser.uid, fallbackUser: nextUser }));
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const result = await signInWithEmailAndPassword(auth, email, password);
  await linkPendingGoogleCredentialIfNeeded(result?.user);
  return result;
}

export async function signUpWithEmail(email, password) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle({ loginHint = '' } = {}) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const provider = createGoogleProvider({ loginHint });
  const preferRedirect = shouldPreferGoogleRedirect();

  try {
    if (preferRedirect) {
      await signInWithRedirect(auth, provider);
      return { redirecting: true };
    }

    const result = await signInWithPopup(auth, provider);
    return syncGoogleUserProfile(result);
  } catch (error) {
    const code = error?.code || '';

    if (
      !preferRedirect &&
      (code === 'auth/popup-blocked' || code === 'popup-blocked')
    ) {
      await signInWithRedirect(auth, provider);
      return { redirecting: true };
    }

    throw await enrichGoogleAuthError(error);
  }
}

export async function completeGoogleRedirectSignIn() {
  if (!auth) throw new Error('Firebase auth is not configured.');
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return await syncGoogleUserProfile(result);
  } catch (error) {
    throw await enrichGoogleAuthError(error);
  }
}

export async function sendPasswordReset(email) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const normalizedEmail = email.toString().trim().toLowerCase();
  const actionCodeSettings = buildPasswordResetActionSettings();

  try {
    await dispatchPasswordResetEmail(normalizedEmail, actionCodeSettings);
    return {
      ok: true,
      email: normalizedEmail,
      hidden: false,
    };
  } catch (error) {
    if (actionCodeSettings && shouldRetryPasswordResetWithoutContinueUrl(error)) {
      try {
        await dispatchPasswordResetEmail(normalizedEmail);
        return {
          ok: true,
          email: normalizedEmail,
          hidden: false,
          usedFallback: true,
        };
      } catch (fallbackError) {
        if (isPasswordResetHiddenError(fallbackError)) {
          return {
            ok: true,
            email: normalizedEmail,
            hidden: true,
          };
        }
        throw fallbackError;
      }
    }

    if (isPasswordResetHiddenError(error)) {
      return {
        ok: true,
        email: normalizedEmail,
        hidden: true,
      };
    }

    throw error;
  }
}

export async function validatePasswordResetCode(code) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  return firebaseVerifyPasswordResetCode(auth, code);
}

export async function confirmPasswordResetWithCode(code, newPassword) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  return firebaseConfirmPasswordReset(auth, code, newPassword);
}

export async function signOut() {
  if (!auth) throw new Error('Firebase auth is not configured.');
  clearPendingGoogleLink();
  return firebaseSignOut(auth);
}

export async function markEmailOtpVerified(user) {
  if (!db) throw new Error('Firestore is not configured.');
  const target = user || auth?.currentUser;
  if (!target?.uid) throw new Error('No authenticated user to verify.');

  await setDoc(
    doc(db, 'users', target.uid),
    {
      email: (target.email || '').toString().trim(),
      [EMAIL_OTP_VERIFIED_FIELD]: true,
      [EMAIL_OTP_VERIFIED_AT_FIELD]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
}

export async function requestEmailVerificationCodeForUser(user) {
  const target = user || auth?.currentUser;
  const normalizedEmail = (target?.email || '').toString().trim().toLowerCase();
  if (!target || !normalizedEmail) {
    throw new Error('No authenticated user to verify.');
  }

  const result = await requestEmailOtpCode(normalizedEmail);
  return {
    ok: true,
    email: result.email,
    otpId: result.otpId,
    status: 'pocketbase_otp_sent',
  };
}

export async function verifyEmailVerificationCodeForUser(
  { user, otpId, code } = {}
) {
  const target = user || auth?.currentUser;
  if (!target) {
    throw new Error('No authenticated user to verify.');
  }

  await verifyEmailOtpCode({ otpId, code });
  await markEmailOtpVerified(target);

  return {
    ok: true,
    email: (target.email || '').toString().trim().toLowerCase(),
  };
}

export async function sendVerificationEmailForUser(user) {
  return requestEmailVerificationCodeForUser(user);
}

export async function fetchUserProfile(uid) {
  if (!db) throw new Error('Firestore is not configured.');
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return buildProfile({ uid, data: snapshot.data() });
}

export async function saveUserProfile(uid, data) {
  if (!db) throw new Error('Firestore is not configured.');
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  if (!payload.createdAt) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
}

export async function updateAuthDisplayName(name) {
  if (!auth || !auth.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: name });
}

export async function signInStaticAdmin(alias, password) {
  if (!auth || !db) throw new Error('Firebase auth is not configured.');
  const key = resolveStaticAdminAlias(alias);
  if (!key) {
    throw new Error('Invalid admin credentials.');
  }
  const authPassword = staticAdminAuthPasswordForAlias(key);
  if (!authPassword || !isStaticAdminPasswordValid(key, password)) {
    throw new Error('Invalid admin credentials.');
  }

  const emails = staticAdminEmailsForAlias(key);
  let lastError = null;

  for (const email of emails) {
    try {
      await signInWithEmailAndPassword(auth, email, authPassword);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const code = error?.code || '';
      const shouldCreate = code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'user-not-found' || code === 'invalid-credential';
      if (shouldCreate) {
        try {
          await createUserWithEmailAndPassword(auth, email, authPassword);
          lastError = null;
          break;
        } catch (createError) {
          const createCode = createError?.code || '';
          if (createCode === 'auth/email-already-in-use' || createCode === 'auth/invalid-email') {
            lastError = error;
            continue;
          }
          lastError = createError;
          throw createError;
        }
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-email' || code === 'wrong-password' || code === 'invalid-email') {
        continue;
      } else {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  const user = auth.currentUser;
  if (user && isStaticAdminEmail(user.email || '')) {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        role: 'admin',
        approved: true,
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return user;
}
