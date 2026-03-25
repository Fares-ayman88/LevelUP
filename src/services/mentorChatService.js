import { getPocketBase } from './pocketbase.js';

const CHATS_COLLECTION = 'mentor_chats';
const MESSAGES_COLLECTION = 'mentor_chat_messages';
const READ_TIMEOUT_MS = 20000;
const WRITE_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 2000;

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

function mapSummary(record) {
  const data = record || {};
  const conversationId = `${data.conversationKey || ''}`.trim() || `${data.id || ''}`.trim();
  return {
    conversationId,
    userId: `${data.userId || ''}`.trim(),
    mentorId: `${data.mentorId || ''}`.trim(),
    mentorName: `${data.mentorName || ''}`.trim(),
    mentorRole: `${data.mentorRole || ''}`.trim(),
    mentorImagePath: `${data.mentorImagePath || data.mentorImageUrl || ''}`.trim(),
    lastMessage: `${data.lastMessage || ''}`.trim(),
    lastMessageAt: toNullableDate(data.lastMessageAt || data.updated || data.created),
    lastMessageFromUser: toBool(data.lastMessageFromUser),
    lastSeenByMentor: toBool(data.lastSeenByMentor, true),
    activeForMentor: toBool(data.activeForMentor),
    unreadForUser: toInt(data.unreadForUser),
    lastUserMessageId: `${data.lastUserMessageId || ''}`.trim(),
  };
}

function mapMessage(record) {
  const data = record || {};
  return {
    id: `${data.id || ''}`.trim(),
    senderRole: `${data.senderRole || 'mentor'}`.trim(),
    text: `${data.text || ''}`,
    createdAt: toDate(data.createdAt || data.created),
    seenByMentor: toBool(data.seenByMentor, true),
  };
}

async function withTimeout(promise, timeoutMs = READ_TIMEOUT_MS) {
  let timerId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

async function findConversationByKey(conversationKey) {
  const pb = getPocketBase();
  const key = `${conversationKey || ''}`.trim();
  if (!key) return null;
  const filter = pb.filter('conversationKey = {:conversationKey}', { conversationKey: key });
  const result = await withTimeout(
    pb.collection(CHATS_COLLECTION).getList(1, 1, { filter, sort: '-updated' }),
    READ_TIMEOUT_MS
  );
  if (!result?.items?.length) return null;
  return result.items[0];
}

async function fetchUserChats(userId) {
  const pb = getPocketBase();
  const uid = `${userId || ''}`.trim();
  if (!uid) return [];
  const filter = pb.filter('userId = {:userId}', { userId: uid });
  const records = await withTimeout(
    pb.collection(CHATS_COLLECTION).getFullList({
      filter,
      sort: '-lastMessageAt,-updated',
    }),
    READ_TIMEOUT_MS
  );
  const items = records.map(mapSummary);
  items.sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
  return items;
}

async function fetchMessages(conversationId) {
  const pb = getPocketBase();
  const key = `${conversationId || ''}`.trim();
  if (!key) return [];
  const filter = pb.filter('conversationKey = {:conversationKey}', { conversationKey: key });
  const records = await withTimeout(
    pb.collection(MESSAGES_COLLECTION).getFullList({
      filter,
      sort: 'createdAt,created',
    }),
    READ_TIMEOUT_MS
  );
  return records.map(mapMessage);
}

async function fetchConversationSummary(conversationId) {
  const record = await findConversationByKey(conversationId);
  return record ? mapSummary(record) : null;
}

function subscribeWithPolling(loader, onData, onError) {
  let disposed = false;
  let lastSerialized = '';

  const run = async () => {
    try {
      const result = await loader();
      if (disposed) return;
      const serialized = JSON.stringify(result);
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      onData(result);
    } catch (error) {
      if (disposed) return;
      if (onError) onError(error);
    }
  };

  void run();
  const intervalId = setInterval(() => {
    void run();
  }, POLL_INTERVAL_MS);

  return () => {
    disposed = true;
    clearInterval(intervalId);
  };
}

export function buildConversationId({ userId, mentorId }) {
  return `${normalizeKey(userId)}__${normalizeKey(mentorId)}`;
}

export function subscribeUserChats(userId, onData, onError) {
  return subscribeWithPolling(() => fetchUserChats(userId), onData, onError);
}

export function subscribeMessages(conversationId, onData, onError) {
  return subscribeWithPolling(() => fetchMessages(conversationId), onData, onError);
}

export function subscribeConversationSummary(conversationId, onData, onError) {
  return subscribeWithPolling(() => fetchConversationSummary(conversationId), onData, onError);
}

export async function ensureConversation({
  conversationId,
  userId,
  mentorId,
  mentorName,
  mentorRole,
  mentorImagePath = '',
}) {
  const pb = getPocketBase();
  const conversationKey = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  if (!conversationKey || !uid || !mid) return;

  const now = new Date().toISOString();
  const payload = {
    conversationKey,
    userId: uid,
    mentorId: mid,
    mentorName: `${mentorName || ''}`.trim() || 'Mentor',
    mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
    updatedAt: now,
  };
  if (`${mentorImagePath || ''}`.trim()) {
    payload.mentorImagePath = `${mentorImagePath}`.trim();
  }

  const existing = await findConversationByKey(conversationKey);
  if (!existing) {
    await withTimeout(
      pb.collection(CHATS_COLLECTION).create({
        ...payload,
        lastMessage: '',
        lastMessageAt: now,
        lastMessageFromUser: false,
        lastSeenByMentor: true,
        activeForMentor: false,
        unreadForUser: 0,
        lastUserMessageId: '',
      }),
      WRITE_TIMEOUT_MS
    );
    return;
  }

  await withTimeout(pb.collection(CHATS_COLLECTION).update(existing.id, payload), WRITE_TIMEOUT_MS);
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
  const pb = getPocketBase();
  const conversationKey = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  const trimmed = `${text || ''}`.trim();
  if (!conversationKey || !uid || !mid || !trimmed) return;

  await ensureConversation({
    conversationId: conversationKey,
    userId: uid,
    mentorId: mid,
    mentorName,
    mentorRole,
    mentorImagePath,
  });

  const conversation = await findConversationByKey(conversationKey);
  if (!conversation) return;

  const now = new Date().toISOString();
  const messageRecord = await withTimeout(
    pb.collection(MESSAGES_COLLECTION).create({
      chatId: conversation.id,
      conversationKey,
      senderRole: 'user',
      senderId: uid,
      text: trimmed,
      seenByMentor: false,
      createdAt: now,
    }),
    WRITE_TIMEOUT_MS
  );

  const payload = {
    conversationKey,
    userId: uid,
    mentorId: mid,
    mentorName: `${mentorName || ''}`.trim() || 'Mentor',
    mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
    lastMessage: previewText(trimmed),
    lastMessageAt: now,
    lastMessageFromUser: true,
    lastSeenByMentor: false,
    lastUserMessageId: `${messageRecord.id || ''}`.trim(),
    unreadForUser: 0,
    updatedAt: now,
  };
  if (`${mentorImagePath || ''}`.trim()) {
    payload.mentorImagePath = `${mentorImagePath}`.trim();
  }

  await withTimeout(pb.collection(CHATS_COLLECTION).update(conversation.id, payload), WRITE_TIMEOUT_MS);
}

export async function markMentorSeen(conversationId) {
  const pb = getPocketBase();
  const conversationKey = `${conversationId || ''}`.trim();
  if (!conversationKey) return;
  const conversation = await findConversationByKey(conversationKey);
  if (!conversation) return;

  const lastUserMessageId = `${conversation.lastUserMessageId || ''}`.trim();
  if (lastUserMessageId) {
    await withTimeout(
      pb.collection(MESSAGES_COLLECTION).update(lastUserMessageId, { seenByMentor: true }),
      WRITE_TIMEOUT_MS
    );
  }

  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(conversation.id, {
      lastSeenByMentor: true,
      activeForMentor: true,
      updatedAt: new Date().toISOString(),
    }),
    WRITE_TIMEOUT_MS
  );
}

export async function setMentorActive(conversationId, active) {
  const pb = getPocketBase();
  const conversationKey = `${conversationId || ''}`.trim();
  if (!conversationKey) return;
  const conversation = await findConversationByKey(conversationKey);
  if (!conversation) return;
  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(conversation.id, {
      activeForMentor: Boolean(active),
      updatedAt: new Date().toISOString(),
    }),
    WRITE_TIMEOUT_MS
  );
}

export async function markReadForUser(conversationId) {
  const pb = getPocketBase();
  const conversationKey = `${conversationId || ''}`.trim();
  if (!conversationKey) return;
  const conversation = await findConversationByKey(conversationKey);
  if (!conversation) return;
  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(conversation.id, {
      unreadForUser: 0,
      updatedAt: new Date().toISOString(),
    }),
    WRITE_TIMEOUT_MS
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
