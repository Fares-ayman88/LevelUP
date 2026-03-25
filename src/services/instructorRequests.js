import {
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  collection,
} from 'firebase/firestore';

import { db } from './firebase.js';

const COLLECTION_NAME = 'instructor_requests';

function getCollection() {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, COLLECTION_NAME);
}

function mapRequest(snapshot) {
  const data = snapshot.data() || {};
  const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch {
        return null;
      }
    }
    return null;
  };

  return {
    id: snapshot.id,
    userId: `${data.userId || snapshot.id}`.trim(),
    name: `${data.name || ''}`.trim(),
    email: `${data.email || ''}`.trim(),
    phone: `${data.phone || ''}`.trim(),
    category: `${data.category || ''}`.trim(),
    coursesTaken: `${data.coursesTaken || ''}`.trim(),
    experienceYears: `${data.experienceYears || ''}`.trim(),
    notes: `${data.notes || ''}`.trim(),
    cvUrl: `${data.cvUrl || ''}`.trim(),
    idUrl: `${data.idUrl || ''}`.trim(),
    status: `${data.status || 'pending'}`.trim(),
    requestedAt: toDate(data.requestedAt),
    updatedAt: toDate(data.updatedAt),
    resolvedAt: toDate(data.resolvedAt),
  };
}

export function subscribeInstructorRequestsByStatus(status, onData, onError) {
  const normalized = `${status || 'pending'}`.trim() || 'pending';
  const q = query(
    getCollection(),
    where('status', '==', normalized),
    orderBy('requestedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((docItem) => mapRequest(docItem)));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribePendingInstructorRequests(onData, onError) {
  return subscribeInstructorRequestsByStatus('pending', onData, onError);
}

export async function fetchInstructorRequestForUser(userId) {
  if (!db) throw new Error('Firestore is not configured.');
  const ref = doc(db, COLLECTION_NAME, `${userId || ''}`.trim());
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return mapRequest(snapshot);
}

export function subscribeInstructorRequestForUser(userId, onData, onError) {
  if (!db) throw new Error('Firestore is not configured.');
  const ref = doc(db, COLLECTION_NAME, `${userId || ''}`.trim());
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapRequest(snapshot));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function submitInstructorRequest({
  user,
  name,
  email,
  phone,
  category,
  coursesTaken = '',
  experienceYears = '',
  notes = '',
}) {
  if (!db) throw new Error('Firestore is not configured.');
  const uid = `${user?.uid || ''}`.trim();
  if (!uid) throw new Error('Missing user id');

  const ref = doc(db, COLLECTION_NAME, uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.data() || {};
  const status = `${existing.status || ''}`.trim().toLowerCase();

  if (snapshot.exists() && status === 'approved') {
    return mapRequest(snapshot);
  }

  const payload = {
    userId: uid,
    name: `${name || ''}`.trim(),
    email: `${email || ''}`.trim(),
    phone: `${phone || ''}`.trim(),
    category: `${category || ''}`.trim() || 'General',
    coursesTaken: `${coursesTaken || ''}`.trim(),
    experienceYears: `${experienceYears || ''}`.trim(),
    notes: `${notes || ''}`.trim(),
    cvUrl: `${existing.cvUrl || ''}`.trim(),
    idUrl: `${existing.idUrl || ''}`.trim(),
    status: 'pending',
    updatedAt: serverTimestamp(),
  };

  if (!snapshot.exists() || status === 'rejected' || !existing.requestedAt) {
    payload.requestedAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });
  const updated = await getDoc(ref);
  return updated.exists() ? mapRequest(updated) : null;
}

export async function approveInstructorRequest(request) {
  if (!db) throw new Error('Firestore is not configured.');
  const userId = `${request?.userId || ''}`.trim();
  if (!userId) return;

  const resolvedName = `${request?.name || ''}`.trim() || 'Mentor';
  const resolvedCategory = `${request?.category || ''}`.trim() || 'General';

  const mentorRef = doc(db, 'mentors', userId);
  const mentorSnap = await getDoc(mentorRef);
  const mentorPayload = {
    name: resolvedName,
    category: resolvedCategory,
    subtitle: `${resolvedCategory} Mentor`,
    updatedAt: serverTimestamp(),
  };

  if (!mentorSnap.exists()) {
    mentorPayload.createdAt = serverTimestamp();
    mentorPayload.courses = '0';
    mentorPayload.students = '0';
    mentorPayload.ratings = '0';
  }

  const batch = writeBatch(db);
  batch.set(
    doc(db, 'users', userId),
    {
      role: 'instructor',
      approved: true,
      approvedAt: serverTimestamp(),
      instructorWelcomeSeen: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(
    doc(db, COLLECTION_NAME, userId),
    {
      status: 'approved',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(mentorRef, mentorPayload, { merge: true });
  await batch.commit();
}

export async function rejectInstructorRequest(request) {
  if (!db) throw new Error('Firestore is not configured.');
  const userId = `${request?.userId || ''}`.trim();
  if (!userId) return;
  await setDoc(
    doc(db, COLLECTION_NAME, userId),
    {
      status: 'rejected',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function revokeInstructorRequest(request) {
  if (!db) throw new Error('Firestore is not configured.');
  const userId = `${request?.userId || ''}`.trim();
  if (!userId) return;

  const batch = writeBatch(db);
  batch.set(
    doc(db, 'users', userId),
    {
      role: 'student',
      approved: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(
    doc(db, COLLECTION_NAME, userId),
    {
      status: 'revoked',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  batch.delete(doc(db, 'mentors', userId));
  await batch.commit();
}

