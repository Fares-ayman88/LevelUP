import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
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
  extractAliasFromEmail,
  isStaticAdminAlias,
  isStaticAdminEmail,
  staticAdminAuthPasswordForAlias,
  staticAdminEmailsForAlias,
} from '../services/staticAdmins.js';
export { isStaticAdminAlias, isStaticAdminEmail };

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
  const normalized = value.toString().trim();
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
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
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
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email, password) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (result?.user && !result.user.emailVerified) {
    await sendVerificationEmailForUser(result.user);
  }
  return result;
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result?.user;
  if (db && user?.uid) {
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
  }
  return result;
}

export async function sendPasswordReset(email) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  return sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  if (!auth) throw new Error('Firebase auth is not configured.');
  return firebaseSignOut(auth);
}

export async function sendVerificationEmailForUser(user) {
  if (!auth) throw new Error('Firebase auth is not configured.');
  const target = user || auth.currentUser;
  if (!target) throw new Error('No authenticated user to verify.');
  await sendEmailVerification(target);
  return { ok: true, status: 'firebase_default_sent' };
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
