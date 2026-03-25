import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { auth } from './firebase.js';
import { getPocketBase } from './pocketbase.js';
import {
  STATIC_ADMIN_PREFERRED_ALIASES,
  capitalizeAlias,
  extractAliasFromEmail,
  isStaticAdminAlias,
  isStaticAdminEmail,
  staticAdminAuthPasswordForAlias,
  staticAdminEmailsForAlias,
  staticAdminPrimaryEmailForAlias,
} from './staticAdmins.js';

const CHATS_COLLECTION = 'support_chats';
const MESSAGES_COLLECTION = 'support_chat_messages';
const USERS_COLLECTION = 'users';
const READ_TIMEOUT_MS = 20000;
const WRITE_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 2000;
const MAX_IMAGE_BYTES = 700 * 1024;
const MAX_FILE_BYTES = 300 * 1024;

export const SUPPORT_ADMIN_NAME = 'Sa3doon';
export const SUPPORT_ADMIN_EMAIL = 'sa3doon@levelup.admin';
export const SUPPORT_ADMIN_AVATAR_ASSET = '/assets/support/admin.jpeg';

function toInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
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

function previewText(text = '') {
  const trimmed = text.toString().trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.substring(0, 60)}...`;
}

function guessMime(name = '', isImage = false) {
  const lower = name.toLowerCase();
  if (!isImage) return 'application/octet-stream';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
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
    createdAt: toDate(record.createdAt || record.created),
    attachments: rawAttachments.map((item) => mapAttachment(item)),
  };
}

function mapSummary(record = {}) {
  return {
    chatId: `${record.id || ''}`.trim(),
    userId: `${record.userId || ''}`.trim(),
    userName: `${record.userName || ''}`.trim(),
    userEmail: `${record.userEmail || ''}`.trim(),
    adminId: `${record.adminId || ''}`.trim(),
    adminName: `${record.adminName || ''}`.trim(),
    adminEmail: `${record.adminEmail || ''}`.trim(),
    lastMessage: `${record.lastMessage || ''}`.trim(),
    lastMessageSender: record.lastMessageSender ? `${record.lastMessageSender}` : '',
    lastMessageAt: toNullableDate(record.lastMessageAt || record.updated || record.created),
    unreadForAdmin: toInt(record.unreadForAdmin),
    unreadForUser: toInt(record.unreadForUser),
    lastReadByAdminAt: toNullableDate(record.lastReadByAdminAt),
    lastReadByUserAt: toNullableDate(record.lastReadByUserAt),
    activeForAdmin: toBool(record.activeForAdmin),
    activeForUser: toBool(record.activeForUser),
  };
}

function mapAdmin(record = {}) {
  const rawName = (
    record.fullName ||
    record.name ||
    record.nickName ||
    record.displayName ||
    record.username ||
    record.userName ||
    record.user_name ||
    ''
  )
    .toString()
    .trim();
  const email = `${record.email || ''}`.trim();
  const alias = extractAliasFromEmail(email);
  const resolvedName =
    rawName && rawName.toLowerCase() !== 'admin'
      ? rawName
      : alias
        ? capitalizeAlias(alias)
        : rawName || 'Admin';
  const avatarUrl = (
    record.photoUrl ||
    record.photoURL ||
    record.avatarUrl ||
    record.imageUrl ||
    record.image ||
    record.imagePath ||
    record.photo ||
    record.avatar ||
    record.profileImage ||
    record.profileImageUrl ||
    record.profile_image ||
    record.profilePhoto ||
    ''
  )
    .toString()
    .trim();

  return {
    id: `${record.id || ''}`.trim(),
    name: resolvedName,
    email,
    avatarUrl,
    status: `${record.status || ''}`.trim(),
    approved: record.approved === true,
    isActive: !record.status || `${record.status}`.trim().toLowerCase() === 'active',
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

function isAdminRecord(data = {}) {
  const role = `${data.role || ''}`.trim().toLowerCase();
  if (role === 'admin') return true;
  if (data.isAdmin === true || data.admin === true || data.is_admin === true) return true;

  const supportRole = `${data.supportRole || data.support_role || data.support || ''}`.trim().toLowerCase();
  if (supportRole === 'admin' || supportRole === 'support') return true;
  if (data.supportAdmin === true || data.support_admin === true) return true;

  const email = `${data.email || ''}`.trim().toLowerCase();
  if (email && isStaticAdminEmail(email)) return true;
  if (email) {
    const alias = extractAliasFromEmail(email);
    if (isStaticAdminAlias(alias)) return true;
  }

  const name = `${data.fullName || data.name || data.nickName || data.username || ''}`.trim().toLowerCase();
  if (name && isStaticAdminAlias(name)) return true;
  if (name.includes('sa3doon') || name.includes('mahmoud') || name.includes('fares')) return true;

  return false;
}

function dedupeAdmins(admins) {
  const byKey = new Map();
  for (const admin of admins) {
    const key = admin.email.trim().toLowerCase() || admin.id;
    const existing = byKey.get(key);
    if (!existing || adminScore(admin) > adminScore(existing)) {
      byKey.set(key, admin);
    }
  }
  return Array.from(byKey.values());
}

function adminScore(admin) {
  let score = 0;
  if (admin.approved) score += 4;
  if (admin.isActive) score += 2;
  if (admin.avatarUrl) score += 1;
  if (admin.name && admin.name.toLowerCase() !== 'admin') score += 1;
  return score;
}

function adminMatchesAlias(admin, alias) {
  const normalized = alias.trim().toLowerCase();
  if (!normalized) return false;
  if (extractAliasFromEmail(admin.email) === normalized) return true;
  const name = `${admin.name || ''}`.trim().toLowerCase();
  if (name === normalized || name.includes(normalized)) return true;
  return false;
}

function fallbackAdmins() {
  return STATIC_ADMIN_PREFERRED_ALIASES.map((alias) => ({
    id: alias,
    name: capitalizeAlias(alias),
    email: staticAdminPrimaryEmailForAlias(alias),
    avatarUrl: '',
    status: 'active',
    approved: true,
    isActive: true,
  }));
}

function orderPreferredAdmins(admins) {
  const ordered = [];
  const used = new Set();
  for (const alias of STATIC_ADMIN_PREFERRED_ALIASES) {
    const match = admins.find((admin) => adminMatchesAlias(admin, alias));
    if (!match || used.has(match.id)) continue;
    used.add(match.id);
    ordered.push(match);
  }
  return ordered;
}

async function findChatById(chatId) {
  const pb = getPocketBase();
  const key = `${chatId || ''}`.trim();
  if (!key) return null;
  try {
    return await withTimeout(pb.collection(CHATS_COLLECTION).getOne(key), READ_TIMEOUT_MS);
  } catch {
    return null;
  }
}

async function findChatByUserId(userId) {
  const pb = getPocketBase();
  const uid = `${userId || ''}`.trim();
  if (!uid) return null;
  const filter = pb.filter('userId = {:userId}', { userId: uid });
  const result = await withTimeout(
    pb.collection(CHATS_COLLECTION).getList(1, 1, {
      filter,
      sort: '-updated',
    }),
    READ_TIMEOUT_MS
  );
  if (!result?.items?.length) return null;
  return result.items[0];
}

async function findChatRecord(chatIdOrUserId, allowUserIdFallback) {
  const value = `${chatIdOrUserId || ''}`.trim();
  if (!value) return null;
  const byId = await findChatById(value);
  if (byId) return byId;
  if (!allowUserIdFallback) return null;
  return findChatByUserId(value);
}

async function fetchAdminChats() {
  const pb = getPocketBase();
  const records = await withTimeout(
    pb.collection(CHATS_COLLECTION).getFullList({ sort: '-lastMessageAt,-updated' }),
    READ_TIMEOUT_MS
  );
  const chats = records.map((item) => mapSummary(item));
  chats.sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
  return chats;
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
  const chats = records.map((item) => mapSummary(item));
  chats.sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
  return chats;
}

async function fetchAdmins() {
  const pb = getPocketBase();
  try {
    const records = await withTimeout(
      pb.collection(USERS_COLLECTION).getFullList({
        sort: '-updated',
      }),
      READ_TIMEOUT_MS
    );
    const admins = records.filter((item) => isAdminRecord(item)).map((item) => mapAdmin(item));
    const deduped = dedupeAdmins(admins);
    const approved = deduped.filter((admin) => admin.approved);
    const active = deduped.filter((admin) => admin.isActive);
    const result = approved.length ? approved : active.length ? active : deduped;
    const preferred = orderPreferredAdmins(result);
    if (preferred.length) return preferred;
    if (result.length) {
      return result.sort((left, right) => left.name.toLowerCase().localeCompare(right.name.toLowerCase()));
    }
  } catch {}
  return fallbackAdmins();
}

async function fetchChatSummary(chatId) {
  const record = await findChatRecord(chatId, true);
  return record ? mapSummary(record) : null;
}

async function fetchMessages(chatId) {
  const pb = getPocketBase();
  const chat = await findChatRecord(chatId, true);
  const chatKey = `${chat?.userId || chatId || ''}`.trim();
  if (!chatKey) return [];
  const filter = pb.filter('chatKey = {:chatKey}', { chatKey });
  const records = await withTimeout(
    pb.collection(MESSAGES_COLLECTION).getFullList({
      filter,
      sort: 'createdAt,created',
    }),
    READ_TIMEOUT_MS
  );
  return records.map((item) => mapMessage(item));
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
  const intervalId = setInterval(() => void run(), POLL_INTERVAL_MS);

  return () => {
    disposed = true;
    clearInterval(intervalId);
  };
}

async function resolveUserName(user) {
  const displayName = `${user?.displayName || ''}`.trim();
  if (displayName) return displayName;
  const email = `${user?.email || ''}`.trim();
  if (email.includes('@')) return email.split('@')[0];
  return 'User';
}

function resolveUserEmail(user) {
  return `${user?.email || ''}`.trim();
}

function resolveAdminSenderId(user, adminEmail) {
  const provided = `${adminEmail || ''}`.trim();
  if (provided) return provided;
  const userEmail = `${user?.email || ''}`.trim();
  if (userEmail) return userEmail;
  return `${user?.uid || ''}`.trim();
}

async function ensureChatRecordForUser(user) {
  const pb = getPocketBase();
  const existing = await findChatByUserId(user?.uid);
  const now = new Date().toISOString();
  if (!existing) {
    return withTimeout(
      pb.collection(CHATS_COLLECTION).create({
        userId: `${user?.uid || ''}`.trim(),
        userName: await resolveUserName(user),
        userEmail: resolveUserEmail(user),
        unreadForAdmin: 0,
        unreadForUser: 0,
        activeForAdmin: false,
        activeForUser: false,
        updatedAt: now,
      }),
      WRITE_TIMEOUT_MS
    );
  }

  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(existing.id, {
      userName: await resolveUserName(user),
      userEmail: resolveUserEmail(user),
      updatedAt: now,
    }),
    WRITE_TIMEOUT_MS
  );
  return withTimeout(pb.collection(CHATS_COLLECTION).getOne(existing.id), READ_TIMEOUT_MS);
}

async function updateChatSummary({
  chat,
  user,
  isAdmin,
  lastMessage,
  now,
  adminId,
  adminName,
  adminEmail,
}) {
  const pb = getPocketBase();
  const unreadForAdmin = toInt(chat.unreadForAdmin);
  const unreadForUser = toInt(chat.unreadForUser);
  const resolvedUserId = `${chat.userId || ''}`.trim();
  const payload = {
    lastMessage,
    lastMessageAt: now,
    lastMessageSender: isAdmin ? 'admin' : 'user',
    unreadForAdmin: isAdmin ? unreadForAdmin : unreadForAdmin + 1,
    unreadForUser: isAdmin ? unreadForUser + 1 : unreadForUser,
    updatedAt: now,
  };

  if (!isAdmin) {
    payload.userId = resolvedUserId || `${user?.uid || ''}`.trim();
    payload.userName = await resolveUserName(user);
    payload.userEmail = resolveUserEmail(user);
    if (`${adminId || ''}`.trim()) payload.adminId = `${adminId}`.trim();
    if (`${adminName || ''}`.trim()) payload.adminName = `${adminName}`.trim();
    if (`${adminEmail || ''}`.trim()) payload.adminEmail = `${adminEmail}`.trim();
  } else {
    const resolvedAdminEmail = `${adminEmail || user?.email || ''}`.trim();
    const resolvedAdminId = `${adminId || user?.uid || ''}`.trim();
    const resolvedAdminName = `${adminName || user?.displayName || capitalizeAlias(extractAliasFromEmail(resolvedAdminEmail)) || 'Admin'}`.trim();
    if (resolvedAdminId) payload.adminId = resolvedAdminId;
    if (resolvedAdminName) payload.adminName = resolvedAdminName;
    if (resolvedAdminEmail) payload.adminEmail = resolvedAdminEmail;
  }

  await withTimeout(pb.collection(CHATS_COLLECTION).update(chat.id, payload), WRITE_TIMEOUT_MS);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = `${reader.result || ''}`;
      const comma = result.indexOf(',');
      if (comma === -1) {
        resolve('');
        return;
      }
      resolve(result.substring(comma + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

async function encodeAttachments(attachments) {
  const encoded = [];
  for (const attachment of attachments) {
    const maxBytes = attachment.isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
    if (attachment.size > maxBytes) {
      throw new Error(attachment.isImage ? 'Image too large (max 700KB)' : 'File too large (max 300KB)');
    }
    const base64 = await fileToBase64(attachment.file);
    encoded.push({
      url: '',
      name: `${attachment.name || ''}`.trim() || `file_${Date.now()}`,
      size: toInt(attachment.size),
      type: attachment.isImage ? 'image' : 'file',
      data: base64,
      mime: guessMime(attachment.name, attachment.isImage),
    });
  }
  return encoded;
}

export async function ensureSignedIn() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const credential = await signInAnonymously(auth);
    return credential.user || null;
  } catch {
    return null;
  }
}

export async function ensureAdminAliasSignedIn(alias, plainPassword) {
  if (!auth) return null;
  const key = `${alias || ''}`.trim().toLowerCase();
  if (!key || !isStaticAdminAlias(key)) return null;
  if (`${plainPassword || ''}`.trim() !== key) return null;

  const authPassword = staticAdminAuthPasswordForAlias(key);
  if (!authPassword) return null;

  const emails = staticAdminEmailsForAlias(key);
  for (const email of emails) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, authPassword);
      if (credential?.user) return credential.user;
    } catch (error) {
      const code = `${error?.code || ''}`.trim().toLowerCase();
      const shouldCreate =
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'user-not-found' ||
        code === 'invalid-credential';
      if (!shouldCreate) continue;
      try {
        const created = await createUserWithEmailAndPassword(auth, email, authPassword);
        if (created?.user) return created.user;
      } catch {}
    }
  }
  return null;
}

export function subscribeAdminChats(onData, onError) {
  return subscribeWithPolling(() => fetchAdminChats(), onData, onError);
}

export function subscribeUserChats(userId, onData, onError) {
  return subscribeWithPolling(() => fetchUserChats(userId), onData, onError);
}

export function subscribeAdmins(onData, onError) {
  return subscribeWithPolling(() => fetchAdmins(), onData, onError);
}

export function subscribeChatSummary(chatId, onData, onError) {
  return subscribeWithPolling(() => fetchChatSummary(chatId), onData, onError);
}

export function subscribeMessages(chatId, onData, onError) {
  return subscribeWithPolling(() => fetchMessages(chatId), onData, onError);
}

export async function ensureChatForUser(user) {
  return ensureChatRecordForUser(user);
}

export async function markRead({ chatId, isAdmin }) {
  const pb = getPocketBase();
  const chat = await findChatRecord(chatId, true);
  if (!chat) return;
  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(chat.id, {
      [isAdmin ? 'unreadForAdmin' : 'unreadForUser']: 0,
      [isAdmin ? 'lastReadByAdminAt' : 'lastReadByUserAt']: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    WRITE_TIMEOUT_MS
  );
}

export async function setActive({ chatId, isAdmin, active }) {
  const pb = getPocketBase();
  const chat = await findChatRecord(chatId, true);
  if (!chat) return;
  await withTimeout(
    pb.collection(CHATS_COLLECTION).update(chat.id, {
      [isAdmin ? 'activeForAdmin' : 'activeForUser']: Boolean(active),
      updatedAt: new Date().toISOString(),
    }),
    WRITE_TIMEOUT_MS
  );
}

export async function sendText({
  chatId,
  user,
  isAdmin,
  text,
  adminId,
  adminName,
  adminEmail,
}) {
  const pb = getPocketBase();
  const trimmed = `${text || ''}`.trim();
  if (!trimmed) return;

  const chat = isAdmin
    ? await findChatRecord(chatId, true)
    : await ensureChatRecordForUser(user);
  if (!chat) return;

  const chatKey = `${chat.userId || ''}`.trim();
  if (!chatKey) return;
  const now = new Date().toISOString();

  await withTimeout(
    pb.collection(MESSAGES_COLLECTION).create({
      chatId: chat.id,
      chatKey,
      senderRole: isAdmin ? 'admin' : 'user',
      senderId: isAdmin ? resolveAdminSenderId(user, adminEmail) : `${user?.uid || ''}`.trim(),
      text: trimmed,
      type: 'text',
      attachments: [],
      createdAt: now,
    }),
    WRITE_TIMEOUT_MS
  );

  await updateChatSummary({
    chat,
    user,
    isAdmin,
    lastMessage: previewText(trimmed),
    now,
    adminId,
    adminName,
    adminEmail,
  });
}

export async function sendAttachments({
  chatId,
  user,
  isAdmin,
  attachments,
  adminId,
  adminName,
  adminEmail,
}) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return;

  const allImages = list.every((item) => item.isImage);
  const allFiles = list.every((item) => !item.isImage);
  if (!allImages && !allFiles) {
    const images = list.filter((item) => item.isImage);
    const files = list.filter((item) => !item.isImage);
    if (images.length) {
      await sendAttachments({
        chatId,
        user,
        isAdmin,
        attachments: images,
        adminId,
        adminName,
        adminEmail,
      });
    }
    if (files.length) {
      await sendAttachments({
        chatId,
        user,
        isAdmin,
        attachments: files,
        adminId,
        adminName,
        adminEmail,
      });
    }
    return;
  }

  const pb = getPocketBase();
  const chat = isAdmin
    ? await findChatRecord(chatId, true)
    : await ensureChatRecordForUser(user);
  if (!chat) return;
  const chatKey = `${chat.userId || ''}`.trim();
  if (!chatKey) return;

  const type = allImages ? 'images' : 'files';
  const uploaded = await encodeAttachments(list);
  if (!uploaded.length) return;
  const now = new Date().toISOString();

  await withTimeout(
    pb.collection(MESSAGES_COLLECTION).create({
      chatId: chat.id,
      chatKey,
      senderRole: isAdmin ? 'admin' : 'user',
      senderId: isAdmin ? resolveAdminSenderId(user, adminEmail) : `${user?.uid || ''}`.trim(),
      text: '',
      type,
      attachments: uploaded,
      createdAt: now,
    }),
    WRITE_TIMEOUT_MS
  );

  await updateChatSummary({
    chat,
    user,
    isAdmin,
    lastMessage: type === 'images' ? 'Image' : previewText(uploaded[0].name),
    now,
    adminId,
    adminName,
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
  if (!auth) return null;
  for (const alias of STATIC_ADMIN_PREFERRED_ALIASES) {
    const password = alias;
    const user = await ensureAdminAliasSignedIn(alias, password);
    if (user) return user;
  }
  return null;
}

