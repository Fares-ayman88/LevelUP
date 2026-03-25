import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from './firebase.js';

const STORAGE_KEY = 'levelup_transactions_v1';
const RECEIPT_SERIAL_KEY = 'levelup_receipt_serial_v1';
const STATUS = {
  waiting: 'waiting',
  paid: 'paid',
  rejected: 'rejected',
};

let cachedTransactions = [];
let localLoaded = false;

function normalizeStatus(value) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (['paid', 'approved', 'accept', 'accepted', 'success'].includes(normalized)) {
    return STATUS.paid;
  }
  if (['rejected', 'declined', 'denied'].includes(normalized)) {
    return STATUS.rejected;
  }
  return STATUS.waiting;
}

function safeParse(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalTransactions() {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

function persistLocalTransactions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function ensureLocalLoaded() {
  if (localLoaded) return;
  localLoaded = true;
  cachedTransactions = readLocalTransactions();
}

function sortNewest(items) {
  const sorted = items.slice();
  sorted.sort((left, right) => {
    const a = new Date(left.createdAt || left.updatedAt || 0).getTime();
    const b = new Date(right.createdAt || right.updatedAt || 0).getTime();
    return b - a;
  });
  return sorted;
}

function mergeById(primary = [], fallback = []) {
  const map = new Map();
  for (const item of fallback) {
    map.set(item.id, item);
  }
  for (const item of primary) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') return value;
  return null;
}

function mapFirestoreDoc(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    userId: `${data.userId || ''}`.trim(),
    userName: `${data.userName || ''}`.trim(),
    userEmail: `${data.userEmail || ''}`.trim(),
    courseId: `${data.courseId || ''}`.trim(),
    mentorId: `${data.mentorId || ''}`.trim(),
    mentorName: `${data.mentorName || ''}`.trim(),
    courseTitle: `${data.courseTitle || ''}`.trim(),
    courseCategory: `${data.courseCategory || ''}`.trim(),
    priceLabel: `${data.priceLabel || ''}`.trim(),
    status: normalizeStatus(data.status),
    receiptCode: `${data.receiptCode || ''}`.trim(),
    barcodeLeft: `${data.barcodeLeft || ''}`.trim(),
    barcodeRight: `${data.barcodeRight || ''}`.trim(),
    courseCoverImagePath: `${data.courseCoverImagePath || data.coverImage || ''}`.trim(),
    coverImage: `${data.coverImage || data.courseCoverImagePath || ''}`.trim(),
    paymentMethod: `${data.paymentMethod || ''}`.trim(),
    senderNumber: `${data.senderNumber || ''}`.trim(),
    attachmentPath: `${data.attachmentPath || ''}`.trim(),
    attachmentName: `${data.attachmentName || ''}`.trim(),
    createdAt: toDateString(data.createdAt),
    updatedAt: toDateString(data.updatedAt),
  };
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextReceiptSerial() {
  const currentRaw = Number.parseInt(localStorage.getItem(RECEIPT_SERIAL_KEY) || '0', 10);
  let current = Number.isFinite(currentRaw) ? currentRaw : 0;
  if (current <= 0) {
    current = randomInRange(100000000, 999999999);
  }
  let next = current + 1;
  if (next > 999999999) {
    next = randomInRange(100000000, 999999999);
  }
  localStorage.setItem(RECEIPT_SERIAL_KEY, `${next}`);
  return next;
}

function createReceiptMeta() {
  const serial = nextReceiptSerial();
  const receiptCode = `SK${`${serial}`.padStart(9, '0')}`;
  const barcodeLeft = `${(serial * 37) % 100000000}`.padStart(8, '0');
  const barcodeRight = `${(serial * 91 + 13579) % 100000000}`.padStart(8, '0');
  return { receiptCode, barcodeLeft, barcodeRight };
}

function resolveUserName(user, fallbackName = '') {
  const name = `${fallbackName || ''}`.trim() || `${user?.displayName || ''}`.trim();
  if (name) return name;
  const email = `${user?.email || ''}`.trim();
  if (email.includes('@')) return email.split('@')[0];
  return 'User';
}

function upsertCache(item) {
  ensureLocalLoaded();
  const map = new Map(cachedTransactions.map((entry) => [entry.id, entry]));
  map.set(item.id, item);
  cachedTransactions = sortNewest(Array.from(map.values()));
  persistLocalTransactions(cachedTransactions);
}

function replaceCache(items) {
  cachedTransactions = sortNewest(items);
  persistLocalTransactions(cachedTransactions);
}

function buildPayload(input = {}, user) {
  const { receiptCode, barcodeLeft, barcodeRight } = createReceiptMeta();
  const nowIso = new Date().toISOString();
  return {
    userId: `${input.userId || user?.uid || ''}`.trim(),
    userName: resolveUserName(user, input.userName),
    userEmail: `${input.userEmail || user?.email || ''}`.trim(),
    courseId: `${input.courseId || ''}`.trim(),
    mentorId: `${input.mentorId || ''}`.trim(),
    mentorName: `${input.mentorName || ''}`.trim(),
    courseTitle: `${input.courseTitle || ''}`.trim(),
    courseCategory: `${input.courseCategory || ''}`.trim(),
    priceLabel: `${input.priceLabel || ''}`.trim(),
    status: STATUS.waiting,
    receiptCode,
    barcodeLeft,
    barcodeRight,
    courseCoverImagePath: `${input.courseCoverImagePath || input.coverImage || ''}`.trim(),
    coverImage: `${input.coverImage || input.courseCoverImagePath || ''}`.trim(),
    paymentMethod: `${input.paymentMethod || ''}`.trim(),
    senderNumber: `${input.senderNumber || ''}`.trim(),
    attachmentPath: `${input.attachmentPath || ''}`.trim(),
    attachmentName: `${input.attachmentName || ''}`.trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function getStoredTransactions() {
  ensureLocalLoaded();
  return cachedTransactions.slice();
}

export function saveStoredTransactions(list) {
  const safe = Array.isArray(list) ? list : [];
  replaceCache(safe);
}

export async function addTransaction(payload) {
  ensureLocalLoaded();
  const user = auth?.currentUser || null;
  const item = {
    id: `tx_${Date.now()}`,
    ...buildPayload(payload, user),
  };

  if (!db || !user?.uid) {
    upsertCache(item);
    return item;
  }

  try {
    const created = await addDoc(collection(db, 'transactions'), {
      ...item,
      status: STATUS.waiting,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = { ...item, id: created.id };
    upsertCache(saved);
    return saved;
  } catch {
    upsertCache(item);
    return item;
  }
}

export async function updateTransactionStatus(id, status) {
  ensureLocalLoaded();
  const transactionId = `${id || ''}`.trim();
  if (!transactionId) return null;
  const normalizedStatus = normalizeStatus(status);
  const updatedAt = new Date().toISOString();

  let updated = null;
  const next = cachedTransactions.map((item) => {
    if (item.id !== transactionId) return item;
    updated = { ...item, status: normalizedStatus, updatedAt };
    return updated;
  });

  if (!updated) return null;

  replaceCache(next);

  if (db) {
    try {
      await setDoc(
        doc(db, 'transactions', transactionId),
        {
          status: normalizedStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {}
  }
  return updated;
}

export function getAllTransactions(seed = []) {
  ensureLocalLoaded();
  const merged = mergeById(cachedTransactions, Array.isArray(seed) ? seed : []);
  return sortNewest(merged);
}

export function findTransaction(id, seed = []) {
  const key = `${id || ''}`.trim();
  if (!key) return null;
  return getAllTransactions(seed).find((item) => item.id === key) || null;
}

export function subscribeTransactions(
  { role = 'student', userId = '', mentorId = '' } = {},
  onData,
  onError
) {
  ensureLocalLoaded();

  const emitMerged = (remoteItems = []) => {
    const merged = sortNewest(mergeById(remoteItems, cachedTransactions));
    replaceCache(merged);
    onData(merged);
  };

  if (!db || !auth?.currentUser) {
    emitMerged(getAllTransactions());
    return () => {};
  }

  const currentUid = auth.currentUser.uid;
  let q;
  if (role === 'admin') {
    q = query(collection(db, 'transactions'));
  } else if (role === 'instructor') {
    const resolvedMentorId = `${mentorId || currentUid}`.trim();
    q = query(collection(db, 'transactions'), where('mentorId', '==', resolvedMentorId));
  } else {
    const resolvedUserId = `${userId || currentUid}`.trim();
    q = query(collection(db, 'transactions'), where('userId', '==', resolvedUserId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const remoteItems = snapshot.docs.map((docItem) => mapFirestoreDoc(docItem));
      emitMerged(remoteItems);
    },
    (error) => {
      if (onError) onError(error);
      emitMerged(getAllTransactions());
    }
  );
}

export function subscribeUserTransactions(userId, onData, onError) {
  return subscribeTransactions({ role: 'student', userId }, onData, onError);
}

export function subscribeAdminTransactions(onData, onError) {
  return subscribeTransactions({ role: 'admin' }, onData, onError);
}

export function subscribeMentorTransactions(mentorId, onData, onError) {
  return subscribeTransactions({ role: 'instructor', mentorId }, onData, onError);
}

