import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { withGlobalLoading } from '../services/globalLoading.js';
import levelupApi, { GOOGLE_CLIENT_ID } from '../services/levelupApi.js';
import {
  extractAliasFromEmail,
  isStaticAdminAlias,
  isStaticAdminEmail,
  staticAdminAuthPasswordForAlias,
  staticAdminEmailsForAlias,
} from '../services/staticAdmins.js';

export { isStaticAdminAlias, isStaticAdminEmail };

const AUTH_CHANGED_EVENT = 'levelup-api-auth-changed';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google sign-in is only available in the browser.'));
      return;
    }
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
}

function requestGoogleCredential({ loginHint = '' } = {}) {
  return new Promise(async (resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google sign-in needs VITE_GOOGLE_CLIENT_ID in .env.'));
      return;
    }
    try {
      const google = await loadGoogleIdentityScript();
      let settled = false;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        login_hint: loginHint || undefined,
        callback: (response) => {
          settled = true;
          if (response?.credential) resolve(response.credential);
          else reject(new Error('Google did not return a sign-in credential.'));
        },
      });
      google.accounts.id.prompt((notification) => {
        if (settled) return;
        if (
          notification?.isNotDisplayed?.() ||
          notification?.isSkippedMoment?.() ||
          notification?.isDismissedMoment?.()
        ) {
          settled = true;
          reject(new Error('Google sign-in popup was closed or blocked. Make sure popups are allowed, then try again.'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function emitAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function resolveStaticAdminAlias(value = '') {
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return '';
  if (isStaticAdminAlias(normalized)) return normalized;
  if (isStaticAdminEmail(normalized)) return extractAliasFromEmail(normalized);
  return '';
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

function toProfile(user = null) {
  if (!user) return null;
  const email = `${user.email || ''}`.trim();
  const role = isStaticAdminEmail(email) ? 'admin' : `${user.role || 'student'}`.trim();
  return {
    uid: user.uid || user.id || '',
    email,
    name: `${user.name || user.displayName || ''}`.trim(),
    photoUrl: normalizePhotoUrl(user.photoUrl || user.photoURL || ''),
    role,
    status: `${user.status || 'active'}`.trim(),
    approved: role === 'admin' || user.approved === true || user.approved === 1,
    isActive: !user.status || `${user.status}`.trim().toLowerCase() === 'active',
    emailOtpVerified: user.isVerified === true || user.emailVerified === true || user.emailOtpVerified === true || user.emailOtpVerified === 1,
    emailOtpVerifiedAt: user.emailOtpVerifiedAt || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function toUser(user = null) {
  if (!user) return null;
  const profile = toProfile(user);
  return {
    uid: profile.uid,
    id: profile.uid,
    email: profile.email,
    displayName: profile.name,
    photoURL: profile.photoUrl,
    emailVerified: profile.emailOtpVerified,
    providerData: [{ providerId: 'password' }],
  };
}

export function isEmailOtpVerifiedProfile(profile = null) {
  return profile?.emailOtpVerified === true || Boolean(profile?.emailOtpVerifiedAt);
}

export function getVerificationEmail(user, profile = null) {
  return (profile?.email || user?.email || '').toString().trim().toLowerCase();
}

export function isEmailVerificationRequired(user = null, profile = null) {
  if (!user && !profile) return false;
  const email = getVerificationEmail(user, profile);
  if (isStaticAdminEmail(email)) return false;
  return !isEmailOtpVerifiedProfile(profile) && user?.emailVerified !== true && user?.isVerified !== true;
}

export async function checkEmailVerificationRequirement(user = null, profile = null) {
  return isEmailVerificationRequired(user, profile);
}

export function resolveAuthRole(profile, user = null) {
  const explicitRole = (profile?.role || '').toString().trim().toLowerCase();
  if (explicitRole === 'admin' || explicitRole === 'instructor' || explicitRole === 'student') {
    return explicitRole;
  }
  const email = (profile?.email || user?.email || '').toString().trim();
  if (isStaticAdminEmail(email)) return 'admin';
  return user ? 'student' : '';
}

export function getAuthErrorMessage(error) {
  if (error?.code === 'ACCOUNT_NOT_FOUND') {
    return 'Please sign up first';
  }
  const message = `${error?.message || ''}`.trim();
  if (message) return message;
  return 'Authentication failed. Please try again.';
}

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
});

async function loadCurrentSession() {
  if (!levelupApi.token) return { user: null, profile: null };
  try {
    const response = await levelupApi.me();
    const user = toUser(response.user);
    return { user, profile: toProfile(response.user) };
  } catch {
    levelupApi.clearToken();
    return { user: null, profile: null };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      setLoading(true);
      const session = await loadCurrentSession();
      if (!alive) return;
      setUser(session.user);
      setProfile(session.profile);
      setLoading(false);
    };

    refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
    };
  }, []);

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithEmail(email, password) {
  return withGlobalLoading(async () => {
    const response = await levelupApi.signIn({ email, password });
    emitAuthChanged();
    return { user: toUser(response.user) };
  }, 'Signing in...');
}

export async function signUpWithEmail(email, password, name = '') {
  return withGlobalLoading(async () => {
    const response = await levelupApi.signUp({ email, password, name });
    if (response.token) emitAuthChanged();
    return {
      user: toUser(response.user),
      email: response.user?.email || email,
      pendingVerification: response.pendingVerification === true || response.data?.pendingVerification === true,
    };
  }, 'Creating account...');
}

export async function signInWithGoogle({ loginHint = '' } = {}) {
  return withGlobalLoading(async () => {
    const credential = await requestGoogleCredential({ loginHint });
    return signInWithGoogleCredential(credential);
  }, 'Connecting account...');
}

export async function signInWithGoogleCredential(credential) {
  return withGlobalLoading(async () => {
    if (!credential) throw new Error('Google did not return a sign-in credential.');
    const response = await levelupApi.signInWithGoogle({
      credential,
      clientId: GOOGLE_CLIENT_ID,
    });
    emitAuthChanged();
    return { user: toUser(response.user) };
  }, 'Connecting account...');
}

export async function completeGoogleRedirectSignIn() {
  return null;
}

export async function sendPasswordReset(email) {
  return {
    ok: true,
    email: email.toString().trim().toLowerCase(),
    hidden: true,
  };
}

export function getGenericPasswordResetMessage(email = '') {
  const normalizedEmail = email.toString().trim();
  if (normalizedEmail) {
    return `If an account exists for ${normalizedEmail}, ask an admin to reset it from the LevelUp database.`;
  }
  return 'If an account exists for that email, ask an admin to reset it from the LevelUp database.';
}

export async function validatePasswordResetCode() {
  return '';
}

export async function confirmPasswordResetWithCode() {
  return { ok: true };
}

export async function signOut() {
  return withGlobalLoading(async () => {
    levelupApi.clearToken();
    emitAuthChanged();
  }, 'Signing out...');
}

export async function markEmailOtpVerified() {
  return { ok: true };
}

export async function requestEmailVerificationCodeForUser(user) {
  const email = (user?.email || user || '').toString().trim().toLowerCase();
  await levelupApi.resendOtp({ email });
  return { ok: true, email, status: 'otp_sent' };
}

export async function verifyEmailVerificationCodeForUser({ user, email, code, otp } = {}) {
  const targetEmail = (email || user?.email || '').toString().trim().toLowerCase();
  const response = await levelupApi.verifyOtp({ email: targetEmail, otp: otp || code });
  emitAuthChanged();
  return {
    ok: true,
    email: targetEmail,
    user: toUser(response.user),
    profile: toProfile(response.user),
  };
}

export async function sendVerificationEmailForUser(user) {
  return requestEmailVerificationCodeForUser(user);
}

export async function fetchUserProfile(uid) {
  return withGlobalLoading(async () => {
    const response = await levelupApi.me();
    const profile = toProfile(response.user);
    return profile?.uid === uid ? profile : null;
  }, 'Loading profile...');
}

export async function saveUserProfile(uid, data) {
  return withGlobalLoading(async () => {
    const response = await levelupApi.updateProfile(data);
    emitAuthChanged();
    return toProfile(response.user);
  }, 'Saving profile...');
}

export async function updateAuthDisplayName(name) {
  return withGlobalLoading(async () => {
    await levelupApi.updateProfile({ name });
    emitAuthChanged();
  }, 'Updating profile...');
}

export async function updateUserProfilePhoto(user, photoUrl) {
  return withGlobalLoading(async () => {
    const targetUid = `${user?.uid || ''}`.trim();
    if (!targetUid) throw new Error('No authenticated user to update.');
    const resolvedPhotoUrl = normalizePhotoUrl(photoUrl);
    if (!resolvedPhotoUrl) throw new Error('Missing profile photo URL.');
    await levelupApi.updateProfile({ photoUrl: resolvedPhotoUrl });
    emitAuthChanged();
  }, 'Updating profile photo...');
}

export async function signInStaticAdmin(alias, password) {
  return withGlobalLoading(async () => {
    const key = resolveStaticAdminAlias(alias);
    if (!key) throw new Error('Invalid admin credentials.');
    const normalizedPassword = `${password || ''}`.trim();
    const authPassword = staticAdminAuthPasswordForAlias(key);
    if (normalizedPassword !== key && normalizedPassword !== authPassword) {
      throw new Error('Invalid admin credentials.');
    }

    let lastError = null;
    for (const email of staticAdminEmailsForAlias(key)) {
      try {
        const response = await levelupApi.signIn({ email, password: authPassword });
        emitAuthChanged();
        return toUser(response.user);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Invalid admin credentials.');
  }, 'Signing in...');
}
