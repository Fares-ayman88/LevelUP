import levelupApi from './levelupApi.js';

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

function sortByLatest(items = []) {
  return items.slice().sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
}

function sortByCreated(items = []) {
  return items.slice().sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
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
    lastMessageAt: toNullableDate(record.lastMessageAt || record.updatedAt || record.createdAt),
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

function poll(loader, onData, onError) {
  let closed = false;
  const emit = async () => {
    try {
      const data = await loader();
      if (!closed) onData?.(data);
    } catch (error) {
      if (!closed) onError?.(error);
    }
  };
  emit();
  const timer = setInterval(emit, 5000);
  return () => {
    closed = true;
    clearInterval(timer);
  };
}

export function buildConversationId({ userId, mentorId }) {
  return `${normalizeKey(userId)}__${normalizeKey(mentorId)}`;
}

export function subscribeParticipantChats(participantId, role, onData, onError) {
  const id = `${participantId || ''}`.trim();
  if (!id) {
    onData?.([]);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.list({ participantId: id, role });
    return sortByLatest((response.items || []).map(mapSummary));
  }, onData, onError);
}

export function subscribeMessages(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key) {
    onData?.([]);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.messages(key);
    return sortByCreated((response.items || []).map(mapMessage));
  }, onData, onError);
}

export function subscribeConversationSummary(conversationId, onData, onError) {
  const key = `${conversationId || ''}`.trim();
  if (!key) {
    onData?.(null);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.list();
    return (response.items || []).map(mapSummary).find((item) => item.conversationId === key) || null;
  }, onData, onError);
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
  const response = await levelupApi.chats.ensure({
    conversationKey: key,
    userId: uid,
    mentorId: mid,
    mentorName,
    mentorRole,
    mentorImagePath,
    userName,
    userImagePath,
  });
  return response.item;
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
  await ensureConversation({
    conversationId: key,
    userId: uid,
    mentorId: mid,
    mentorName,
    mentorRole,
    mentorImagePath,
    userName,
    userImagePath,
  });
  await levelupApi.chats.sendMessage(key, {
    senderRole,
    senderId: senderRole === 'user' ? uid : mid,
    text: trimmed,
  });
}

export async function markMentorSeen(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  await levelupApi.chats.markRead(key);
}

export async function setMentorActive() {
  return undefined;
}

export async function markReadForUser(conversationId) {
  const key = `${conversationId || ''}`.trim();
  if (!key) return;
  await levelupApi.chats.markRead(key);
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
