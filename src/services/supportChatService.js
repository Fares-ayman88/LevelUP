import levelupApi from './levelupApi.js';
import {
  STATIC_ADMIN_PREFERRED_ALIASES,
  capitalizeAlias,
  isStaticAdminAlias,
  staticAdminAuthPasswordForAlias,
  staticAdminEmailsForAlias,
  staticAdminPrimaryEmailForAlias,
} from './staticAdmins.js';

export const SUPPORT_ADMIN_NAME = 'Sa3doon';
export const SUPPORT_ADMIN_EMAIL = 'sa3doon@levelup.admin';
export const SUPPORT_ADMIN_AVATAR_ASSET = '/assets/support/admin.jpeg';

function toInt(value) {
  const parsed = Number.parseInt(`${value || 0}`, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return `${value || ''}`.trim().toLowerCase() === 'true';
}

function toNullableDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDate(value) {
  return toNullableDate(value) || new Date();
}

function previewText(text = '') {
  const trimmed = text.toString().trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.substring(0, 60)}...`;
}

function resolveUserName(user) {
  const displayName = `${user?.displayName || user?.name || ''}`.trim();
  if (displayName) return displayName;
  const email = `${user?.email || ''}`.trim();
  if (email.includes('@')) return email.split('@')[0];
  return 'User';
}

function resolveUserEmail(user) {
  return `${user?.email || ''}`.trim();
}

function mapSummary(record = {}) {
  return {
    chatId: `${record.conversationKey || record.id || ''}`.trim(),
    userId: `${record.userId || ''}`.trim(),
    userName: `${record.userName || ''}`.trim(),
    userEmail: `${record.userEmail || ''}`.trim(),
    adminId: `${record.mentorId || SUPPORT_ADMIN_EMAIL}`.trim(),
    adminName: `${record.mentorName || SUPPORT_ADMIN_NAME}`.trim(),
    adminEmail: `${record.mentorId || SUPPORT_ADMIN_EMAIL}`.trim(),
    lastMessage: `${record.lastMessage || ''}`.trim(),
    lastMessageSender: record.lastMessageFromUser ? 'user' : 'admin',
    lastMessageAt: toNullableDate(record.lastMessageAt || record.updatedAt || record.createdAt),
    unreadForAdmin: toInt(record.lastMessageFromUser ? 1 : 0),
    unreadForUser: toInt(record.unreadForUser),
    lastReadByAdminAt: null,
    lastReadByUserAt: null,
    activeForAdmin: toBool(record.activeForMentor),
    activeForUser: false,
  };
}

function mapAttachment(data = {}) {
  return {
    url: `${data.url || ''}`.trim(),
    name: `${data.name || ''}`.trim(),
    size: toInt(data.size),
    type: `${data.type || ''}`.trim(),
    data: `${data.data || ''}`.trim(),
    mime: `${data.mime || ''}`.trim(),
  };
}

function mapMessage(record = {}) {
  const rawAttachments = Array.isArray(record.attachments) ? record.attachments : [];
  return {
    id: `${record.id || ''}`.trim(),
    senderRole: `${record.senderRole || ''}`.trim(),
    text: `${record.text || ''}`,
    type: `${record.type || 'text'}`.trim(),
    createdAt: toDate(record.createdAt),
    attachments: rawAttachments.map(mapAttachment),
  };
}

function sortChats(items = []) {
  return items.slice().sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
}

function sortMessages(items = []) {
  return items.slice().sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

function poll(loader, onData, onError, interval = 5000) {
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
  const timer = setInterval(emit, interval);
  return () => {
    closed = true;
    clearInterval(timer);
  };
}

function fallbackAdmins() {
  return STATIC_ADMIN_PREFERRED_ALIASES.map((alias) => ({
    id: alias,
    name: capitalizeAlias(alias),
    email: staticAdminPrimaryEmailForAlias(alias),
    avatarUrl: alias === 'sa3doon' ? SUPPORT_ADMIN_AVATAR_ASSET : '',
    status: 'active',
    approved: true,
    isActive: true,
  }));
}

async function ensureSupportChat(user) {
  const uid = `${user?.uid || user?.id || ''}`.trim();
  if (!uid) throw new Error('Missing user id.');
  const response = await levelupApi.chats.ensure({
    conversationKey: uid,
    userId: uid,
    mentorId: SUPPORT_ADMIN_EMAIL,
    mentorName: SUPPORT_ADMIN_NAME,
    mentorRole: 'Support',
    mentorImagePath: SUPPORT_ADMIN_AVATAR_ASSET,
    userName: resolveUserName(user),
    userImagePath: `${user?.photoURL || user?.photoUrl || ''}`.trim(),
  });
  return mapSummary(response.item);
}

export async function ensureSignedIn() {
  const response = await levelupApi.me().catch(() => null);
  if (!response?.user) return null;
  return {
    uid: response.user.uid || response.user.id,
    email: response.user.email,
    displayName: response.user.name || response.user.displayName,
    photoURL: response.user.photoUrl || '',
  };
}

export async function ensureAdminAliasSignedIn(alias, plainPassword) {
  const key = `${alias || ''}`.trim().toLowerCase();
  if (!key || !isStaticAdminAlias(key)) return null;
  const authPassword = staticAdminAuthPasswordForAlias(key);
  const normalizedPassword = `${plainPassword || ''}`.trim();
  if (normalizedPassword !== key && normalizedPassword !== authPassword) return null;
  for (const email of staticAdminEmailsForAlias(key)) {
    try {
      const response = await levelupApi.signIn({ email, password: authPassword });
      return {
        uid: response.user.uid || response.user.id,
        email: response.user.email,
        displayName: response.user.name || response.user.displayName,
      };
    } catch {}
  }
  return null;
}

export function subscribeAdminChats(onData, onError) {
  return poll(async () => {
    const response = await levelupApi.chats.list({ role: 'admin' });
    return sortChats((response.items || []).map(mapSummary));
  }, onData, onError);
}

export function subscribeUserChats(userId, onData, onError) {
  const uid = `${userId || ''}`.trim();
  if (!uid) {
    onData?.([]);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.list({ role: 'student', participantId: uid });
    return (response.items || []).map(mapSummary);
  }, onData, onError);
}

export function subscribeAdmins(onData) {
  onData?.(fallbackAdmins());
  return () => {};
}

export function subscribeChatSummary(chatId, onData, onError) {
  const key = `${chatId || ''}`.trim();
  if (!key) {
    onData?.(null);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.list({ role: 'admin' });
    return (response.items || []).map(mapSummary).find((item) => item.chatId === key) || null;
  }, onData, onError);
}

export function subscribeMessages(chatId, onData, onError) {
  const key = `${chatId || ''}`.trim();
  if (!key) {
    onData?.([]);
    return () => {};
  }
  return poll(async () => {
    const response = await levelupApi.chats.messages(key);
    return sortMessages((response.items || []).map(mapMessage));
  }, onData, onError);
}

export async function ensureChatForUser(user) {
  return ensureSupportChat(user);
}

export async function markRead({ chatId }) {
  const key = `${chatId || ''}`.trim();
  if (!key) return;
  await levelupApi.chats.markRead(key);
}

export async function setActive() {
  return undefined;
}

export async function sendText({
  chatId,
  user,
  isAdmin,
  text,
  adminEmail,
}) {
  const key = `${chatId || user?.uid || ''}`.trim();
  const trimmed = `${text || ''}`.trim();
  if (!key || !trimmed) return;
  if (!isAdmin) await ensureSupportChat(user);
  await levelupApi.chats.sendMessage(key, {
    senderRole: isAdmin ? 'admin' : 'user',
    senderId: isAdmin ? `${adminEmail || SUPPORT_ADMIN_EMAIL}`.trim() : `${user?.uid || ''}`.trim(),
    text: trimmed,
    type: 'text',
  });
}

export async function sendAttachments({
  chatId,
  user,
  isAdmin,
  attachments,
  adminEmail,
}) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return;
  const label = list.length === 1 ? list[0].name || 'Attachment' : `${list.length} attachments`;
  await sendText({
    chatId,
    user,
    isAdmin,
    text: previewText(label),
    adminEmail,
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

export async function signInFallbackPreferredAdmins() {
  for (const alias of STATIC_ADMIN_PREFERRED_ALIASES) {
    const user = await ensureAdminAliasSignedIn(alias, alias);
    if (user) return user;
  }
  return null;
}
