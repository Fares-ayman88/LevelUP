import { getPocketBase, hasPocketBaseEndpoint } from './pocketbase.js';

const CHATS_COLLECTION = 'mentor_chats';
const MESSAGES_COLLECTION = 'mentor_chat_messages';

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

function quoteFilter(value = '') {
  return JSON.stringify(`${value || ''}`);
}

function getPbInstance() {
  if (!hasPocketBaseEndpoint()) {
    throw new Error('PocketBase is not configured.');
  }
  const pb = getPocketBase();
  if (!pb) {
    throw new Error('PocketBase is not initialized.');
  }
  return pb;
}

function mapSummary(record = {}) {
  return {
    conversationId: `${record.conversationKey || record.id || ''}`.trim(),
    chatId: `${record.id || ''}`.trim(),
    userId: `${record.userId || ''}`.trim(),
    mentorId: `${record.mentorId || ''}`.trim(),
    mentorName: `${record.mentorName || ''}`.trim(),
    mentorRole: `${record.mentorRole || ''}`.trim(),
    mentorImagePath: `${record.mentorImagePath || ''}`.trim(),
    userName: `${record.userName || ''}`.trim(),
    userImagePath: `${record.userImagePath || ''}`.trim(),
    lastMessage: `${record.lastMessage || ''}`.trim(),
    lastMessageAt: toNullableDate(record.lastMessageAt || record.updated || record.created),
    lastMessageFromUser: toBool(record.lastMessageFromUser),
    lastSeenByMentor: toBool(record.lastSeenByMentor, true),
    activeForMentor: toBool(record.activeForMentor),
    unreadForUser: toInt(record.unreadForUser),
    lastUserMessageId: `${record.lastUserMessageId || ''}`.trim(),
  };
}

function mapMessage(record = {}) {
  return {
    id: `${record.id || ''}`.trim(),
    senderRole: `${record.senderRole || 'mentor'}`.trim(),
    text: `${record.text || ''}`.trim(),
    createdAt: toDate(record.createdAt),
    seenByMentor: toBool(record.seenByMentor, true),
  };
}

async function getConversationRecord(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return null;
  const pb = getPbInstance();
  const records = await pb.collection(CHATS_COLLECTION).getFullList({
    filter: `conversationKey = ${quoteFilter(key)}`,
    limit: 1,
  });
  return records.length ? records[0] : null;
}

async function fetchMessages(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return [];
  const pb = getPbInstance();
  const records = await pb.collection(MESSAGES_COLLECTION).getFullList({
    filter: `conversationKey = ${quoteFilter(key)}`,
    sort: 'createdAt',
  });
  return sortByCreated(records.map(mapMessage));
}

async function fetchConversationSummary(conversationId) {
  const record = await getConversationRecord(conversationId);
  return record ? mapSummary(record) : null;
}

export function buildConversationId({ userId, mentorId }) {
  return `${normalizeKey(userId)}__${normalizeKey(mentorId)}`;
}

export function subscribeParticipantChats(participantId, role, onData, onError) {
  const id = `${participantId || ''}`.trim();
  if (!id || !hasPocketBaseEndpoint()) {
    onData?.([]);
    return () => {};
  }

  const pb = getPbInstance();
  const filterKey = role === 'instructor' ? 'mentorId' : 'userId';

  const emit = async () => {
    try {
      const records = await pb.collection(CHATS_COLLECTION).getFullList({
        filter: `${filterKey} = ${quoteFilter(id)}`,
        sort: '-lastMessageAt',
      });
      onData?.(sortByLatest(records.map(mapSummary)));
    } catch (error) {
      onError?.(error);
    }
  };

  emit().catch((error) => onError?.(error));

  const unsubscribe = pb.collection(CHATS_COLLECTION).subscribe('*', async (event) => {
    const record = event?.record || {};
    const matches = `${record[filterKey] || ''}`.trim() === id;
    if (!matches) return;
    await emit();
  });

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}

export function subscribeMessages(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key || !hasPocketBaseEndpoint()) {
    onData?.([]);
    return () => {};
  }

  const pb = getPbInstance();

  const emit = async () => {
    try {
      const items = await fetchMessages(key);
      onData?.(items);
    } catch (error) {
      onError?.(error);
    }
  };

  emit().catch((error) => onError?.(error));

  const unsubscribe = pb.collection(MESSAGES_COLLECTION).subscribe('*', async (event) => {
    const record = event?.record || {};
    if (`${record.conversationKey || ''}`.trim() !== key) return;
    await emit();
  });

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}

export function subscribeConversationSummary(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key || !hasPocketBaseEndpoint()) {
    onData?.(null);
    return () => {};
  }

  const pb = getPbInstance();

  const emit = async () => {
    try {
      const summary = await fetchConversationSummary(key);
      onData?.(summary);
    } catch (error) {
      onError?.(error);
    }
  };

  emit().catch((error) => onError?.(error));

  const unsubscribe = pb.collection(CHATS_COLLECTION).subscribe('*', async (event) => {
    const record = event?.record || {};
    if (`${record.conversationKey || ''}`.trim() !== key) return;
    await emit();
  });

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}

export async function ensureConversation({
  conversationId,
  userId,
  mentorId,
  mentorName,
  mentorRole,
  mentorImagePath = '',
  userName = '',
  userImagePath = '',
}) {
  const key = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  if (!key || !uid || !mid) return null;

  const now = new Date().toISOString();
  const pb = getPbInstance();
  const existing = await getConversationRecord(key);
  const payload = {
    conversationKey: key,
    userId: uid,
    mentorId: mid,
    mentorName: `${mentorName || ''}`.trim() || 'Mentor',
    mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
    mentorImagePath: `${mentorImagePath || ''}`.trim(),
    userName: `${userName || ''}`.trim(),
    userImagePath: `${userImagePath || ''}`.trim(),
    updated: now,
  };

  if (!existing) {
    return pb.collection(CHATS_COLLECTION).create({
      ...payload,
      lastMessage: '',
      lastMessageAt: now,
      lastMessageFromUser: false,
      lastSeenByMentor: true,
      activeForMentor: false,
      unreadForUser: 0,
      lastUserMessageId: '',
      created: now,
    });
  }

  return pb.collection(CHATS_COLLECTION).update(existing.id, payload);
}

export async function sendText({
  conversationId,
  userId,
  mentorId,
  mentorName,
  mentorRole,
  mentorImagePath = '',
  userName = '',
  userImagePath = '',
  senderRole = 'user',
  text,
}) {
  const key = `${conversationId || ''}`.trim();
  const uid = `${userId || ''}`.trim();
  const mid = `${mentorId || ''}`.trim();
  const trimmed = `${text || ''}`.trim();
  if (!key || !uid || !mid || !trimmed) return;

  const pb = getPbInstance();
  const chatRecord = await ensureConversation({
    conversationId: key,
    userId: uid,
    mentorId: mid,
    mentorName,
    mentorRole,
    mentorImagePath,
    userName,
    userImagePath,
  });
  if (!chatRecord || !chatRecord.id) return;

  const now = new Date().toISOString();
  const isUserSender = senderRole === 'user';
  const messageRecord = await pb.collection(MESSAGES_COLLECTION).create({
    chatId: key,
    conversationKey: key,
    senderRole: senderRole || 'mentor',
    senderId: isUserSender ? uid : mid,
    text: trimmed,
    seenByMentor: isUserSender ? false : true,
    createdAt: now,
  });

  const unreadForUser = isUserSender ? 0 : toInt(chatRecord.unreadForUser || 0) + 1;

  await pb.collection(CHATS_COLLECTION).update(chatRecord.id, {
    conversationKey: key,
    userId: uid,
    mentorId: mid,
    mentorName: `${mentorName || ''}`.trim() || 'Mentor',
    mentorRole: `${mentorRole || ''}`.trim() || 'Mentor',
    mentorImagePath: `${mentorImagePath || ''}`.trim(),
    userName: `${userName || ''}`.trim(),
    userImagePath: `${userImagePath || ''}`.trim(),
    lastMessage: previewText(trimmed),
    lastMessageAt: now,
    lastMessageFromUser: isUserSender,
    lastSeenByMentor: isUserSender ? false : true,
    activeForMentor: true,
    unreadForUser,
    lastUserMessageId: messageRecord.id,
    updated: now,
  });
}

export async function markMentorSeen(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  const pb = getPbInstance();
  const chatRecord = await getConversationRecord(key);
  if (!chatRecord || !chatRecord.id) return;

  const lastUserMessageId = `${chatRecord.lastUserMessageId || ''}`.trim();
  if (lastUserMessageId) {
    await pb.collection(MESSAGES_COLLECTION).update(lastUserMessageId, {
      seenByMentor: true,
    });
  }

  await pb.collection(CHATS_COLLECTION).update(chatRecord.id, {
    lastSeenByMentor: true,
    activeForMentor: true,
    updated: new Date().toISOString(),
  });
}

export async function setMentorActive(conversationId, active) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  const pb = getPbInstance();
  const chatRecord = await getConversationRecord(key);
  if (!chatRecord || !chatRecord.id) return;

  await pb.collection(CHATS_COLLECTION).update(chatRecord.id, {
    activeForMentor: Boolean(active),
    updated: new Date().toISOString(),
  });
}

export async function markReadForUser(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  const pb = getPbInstance();
  const chatRecord = await getConversationRecord(key);
  if (!chatRecord || !chatRecord.id) return;

  await pb.collection(CHATS_COLLECTION).update(chatRecord.id, {
    unreadForUser: 0,
    updated: new Date().toISOString(),
  });
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
