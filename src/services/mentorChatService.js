import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase.js';

const CHATS_COLLECTION = 'mentor_chats';
const MESSAGES_COLLECTION = 'messages';

function requireDb() {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  return db;
}

function toInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return fallback;
}

function toNullableDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function toDate(value) {
  return toNullableDate(value) || new Date();
}

function normalizeKey(value = '') {
  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized || 'unknown';
}

function previewText(text = '') {
  const trimmed = text.toString().trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.substring(0, 60)}...`;
}

function sortByLatest(items = []) {
  const copy = items.slice();
  copy.sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
  return copy;
}

function sortByCreated(items = []) {
  const copy = items.slice();
  copy.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  return copy;
}

function mapSummary(snapshot) {
  const data = snapshot.data() || {};
  const conversationId = `${data.conversationKey || snapshot.id || ''}`.trim();
  return {
    conversationId,
    userId: `${data.userId || ''}`.trim(),
    mentorId: `${data.mentorId || ''}`.trim(),
    mentorName: `${data.mentorName || ''}`.trim(),
    mentorRole: `${data.mentorRole || ''}`.trim(),
    mentorImagePath: `${data.mentorImagePath || data.mentorImageUrl || ''}`.trim(),
    lastMessage: `${data.lastMessage || ''}`.trim(),
    lastMessageAt: toNullableDate(data.lastMessageAt || data.updatedAt || data.createdAt),
    lastMessageFromUser: toBool(data.lastMessageFromUser),
    lastSeenByMentor: toBool(data.lastSeenByMentor, true),
    activeForMentor: toBool(data.activeForMentor),
    unreadForUser: toInt(data.unreadForUser),
    lastUserMessageId: `${data.lastUserMessageId || ''}`.trim(),
  };
}

function mapMessage(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    senderRole: `${data.senderRole || 'mentor'}`.trim(),
    text: `${data.text || ''}`,
    createdAt: toDate(data.createdAt),
    seenByMentor: toBool(data.seenByMentor, true),
  };
}

function conversationRef(conversationId) {
  return doc(requireDb(), CHATS_COLLECTION, `${conversationId || ''}`.trim());
}

function messagesRef(conversationId) {
  return collection(requireDb(), CHATS_COLLECTION, `${conversationId || ''}`.trim(), MESSAGES_COLLECTION);
}

async function getConversationSnapshot(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return null;
  const snapshot = await getDoc(conversationRef(key));
  return snapshot.exists() ? snapshot : null;
}

export function buildConversationId({ userId, mentorId }) {
  return `${normalizeKey(userId)}__${normalizeKey(mentorId)}`;
}

export function subscribeUserChats(userId, onData, onError) {
  const uid = `${userId || ''}`.trim();
  if (!uid || !db) {
    onData?.([]);
    return () => {};
  }

  const q = query(collection(db, CHATS_COLLECTION), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docItem) => mapSummary(docItem));
      onData?.(sortByLatest(items));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeMessages(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key || !db) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    messagesRef(key),
    (snapshot) => {
      const items = snapshot.docs.map((docItem) => mapMessage(docItem));
      onData?.(sortByCreated(items));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeConversationSummary(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key || !db) {
    onData?.(null);
    return () => {};
  }

  return onSnapshot(
    conversationRef(key),
    (snapshot) => {
      onData?.(snapshot.exists() ? mapSummary(snapshot) : null);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function ensureConversation({
  conversationId,
  userId,
  mentorId,
  mentorName,
  mentorRole,
  mentorImagePath = '',
}) {
  const key = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  if (!key || !uid || !mid) return;

  const now = new Date().toISOString();
  const snapshot = await getConversationSnapshot(key);

  const payload = {
    conversationKey: key,
    userId: uid,
    mentorId: mid,
    mentorName: `${mentorName || ''}`.trim() || 'Mentor',
    mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
    mentorImagePath: `${mentorImagePath || ''}`.trim(),
    updatedAt: now,
  };

  if (!snapshot) {
    await setDoc(conversationRef(key), {
      ...payload,
      lastMessage: '',
      lastMessageAt: now,
      lastMessageFromUser: false,
      lastSeenByMentor: true,
      activeForMentor: false,
      unreadForUser: 0,
      lastUserMessageId: '',
      createdAt: now,
    });
    return;
  }

  await setDoc(conversationRef(key), payload, { merge: true });
}

export async function sendUserText({
  conversationId,
  userId,
  mentorId,
  mentorName,
  mentorRole,
  mentorImagePath = '',
  text,
}) {
  const key = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  const trimmed = `${text || ''}`.trim();
  if (!key || !uid || !mid || !trimmed) return;

  await ensureConversation({
    conversationId: key,
    userId: uid,
    mentorId: mid,
    mentorName,
    mentorRole,
    mentorImagePath,
  });

  const now = new Date().toISOString();
  const messageRecord = await addDoc(messagesRef(key), {
    chatId: key,
    conversationKey: key,
    senderRole: 'user',
    senderId: uid,
    text: trimmed,
    seenByMentor: false,
    createdAt: now,
  });

  await setDoc(
    conversationRef(key),
    {
      conversationKey: key,
      userId: uid,
      mentorId: mid,
      mentorName: `${mentorName || ''}`.trim() || 'Mentor',
      mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
      mentorImagePath: `${mentorImagePath || ''}`.trim(),
      lastMessage: previewText(trimmed),
      lastMessageAt: now,
      lastMessageFromUser: true,
      lastSeenByMentor: false,
      activeForMentor: true,
      unreadForUser: 0,
      lastUserMessageId: messageRecord.id,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function markMentorSeen(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  const snapshot = await getConversationSnapshot(key);
  if (!snapshot) return;

  const data = snapshot.data() || {};
  const lastUserMessageId = `${data.lastUserMessageId || ''}`.trim();
  if (lastUserMessageId) {
    await updateDoc(
      doc(requireDb(), CHATS_COLLECTION, key, MESSAGES_COLLECTION, lastUserMessageId),
      {
        seenByMentor: true,
      }
    );
  }

  await setDoc(
    conversationRef(key),
    {
      lastSeenByMentor: true,
      activeForMentor: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function setMentorActive(conversationId, active) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  await setDoc(
    conversationRef(key),
    {
      activeForMentor: Boolean(active),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function markReadForUser(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  await setDoc(
    conversationRef(key),
    {
      unreadForUser: 0,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export function formatMessageTime(value) {
  const date = value instanceof Date ? value : toDate(value);
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${hour}:${minute}`;
}

export function formatSummaryTime(value) {
  const date = value instanceof Date ? value : toNullableDate(value);
  if (!date) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const other = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - other.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return formatMessageTime(date);
  if (diffDays === 1) return 'Yesterday';
  return `${date.getDate()}/${date.getMonth() + 1}`;
}
