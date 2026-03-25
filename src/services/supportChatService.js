import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { auth, db } from './firebase.js';
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
const MESSAGES_COLLECTION = 'messages';
const USERS_COLLECTION = 'users';
const MAX_IMAGE_BYTES = 450 * 1024;
const MAX_FILE_BYTES = 200 * 1024;

export const SUPPORT_ADMIN_NAME = 'Sa3doon';
export const SUPPORT_ADMIN_EMAIL = 'sa3doon@levelup.admin';
export const SUPPORT_ADMIN_AVATAR_ASSET = '/assets/support/admin.jpeg';

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

function mapMessage(snapshot) {
  const record = snapshot.data() || {};
  const rawAttachments = Array.isArray(record.attachments) ? record.attachments : [];
  return {
    id: snapshot.id,
    senderRole: `${record.senderRole || ''}`.trim(),
    text: `${record.text || ''}`,
    type: `${record.type || 'text'}`.trim(),
    createdAt: toDate(record.createdAt),
    attachments: rawAttachments.map((item) => mapAttachment(item)),
  };
}

function mapSummary(snapshot) {
  const record = snapshot.data() || {};
  return {
    chatId: snapshot.id,
    userId: `${record.userId || ''}`.trim(),
    userName: `${record.userName || ''}`.trim(),
    userEmail: `${record.userEmail || ''}`.trim(),
    adminId: `${record.adminId || ''}`.trim(),
    adminName: `${record.adminName || ''}`.trim(),
    adminEmail: `${record.adminEmail || ''}`.trim(),
    lastMessage: `${record.lastMessage || ''}`.trim(),
    lastMessageSender: record.lastMessageSender ? `${record.lastMessageSender}` : '',
    lastMessageAt: toNullableDate(record.lastMessageAt || record.updatedAt || record.createdAt),
    unreadForAdmin: toInt(record.unreadForAdmin),
    unreadForUser: toInt(record.unreadForUser),
    lastReadByAdminAt: toNullableDate(record.lastReadByAdminAt),
    lastReadByUserAt: toNullableDate(record.lastReadByUserAt),
    activeForAdmin: toBool(record.activeForAdmin),
    activeForUser: toBool(record.activeForUser),
  };
}

function mapAdmin(snapshot) {
  const record = snapshot.data() || {};
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
    id: snapshot.id,
    name: resolvedName,
    email,
    avatarUrl,
    status: `${record.status || ''}`.trim(),
    approved: record.approved === true,
    isActive: !record.status || `${record.status}`.trim().toLowerCase() === 'active',
  };
}

function sortChats(items = []) {
  const copy = items.slice();
  copy.sort((left, right) => {
    const a = left.lastMessageAt ? left.lastMessageAt.getTime() : 0;
    const b = right.lastMessageAt ? right.lastMessageAt.getTime() : 0;
    return b - a;
  });
  return copy;
}

function sortMessages(items = []) {
  const copy = items.slice();
  copy.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  return copy;
}

function adminScore(admin) {
  let score = 0;
  if (admin.approved) score += 4;
  if (admin.isActive) score += 2;
  if (admin.avatarUrl) score += 1;
  if (admin.name && admin.name.toLowerCase() !== 'admin') score += 1;
  return score;
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

function adminMatchesAlias(admin, alias) {
  const normalized = alias.trim().toLowerCase();
  if (!normalized) return false;
  if (extractAliasFromEmail(admin.email) === normalized) return true;
  const name = `${admin.name || ''}`.trim().toLowerCase();
  return name === normalized || name.includes(normalized);
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

function resolveUserName(user) {
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
      throw new Error(
        attachment.isImage
          ? 'Image too large (max 450KB)'
          : 'File too large (max 200KB)'
      );
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

function chatRef(chatId) {
  return doc(requireDb(), CHATS_COLLECTION, `${chatId || ''}`.trim());
}

function chatMessagesRef(chatId) {
  return collection(requireDb(), CHATS_COLLECTION, `${chatId || ''}`.trim(), MESSAGES_COLLECTION);
}

async function findChatSnapshot(chatId) {
  const key = `${chatId || ''}`.trim();
  if (!key) return null;
  const snapshot = await getDoc(chatRef(key));
  return snapshot.exists() ? snapshot : null;
}

async function ensureChatRecordForUser(user) {
  const uid = `${user?.uid || ''}`.trim();
  if (!uid) throw new Error('Missing user id.');
  const now = new Date().toISOString();
  await setDoc(
    chatRef(uid),
    {
      userId: uid,
      userName: resolveUserName(user),
      userEmail: resolveUserEmail(user),
      unreadForAdmin: 0,
      unreadForUser: 0,
      activeForAdmin: false,
      activeForUser: false,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
  const snapshot = await findChatSnapshot(uid);
  return snapshot ? mapSummary(snapshot) : null;
}

async function updateChatSummary({
  chatId,
  user,
  isAdmin,
  lastMessage,
  now,
  adminId,
  adminName,
  adminEmail,
}) {
  const snapshot = await findChatSnapshot(chatId);
  if (!snapshot) return;
  const chat = mapSummary(snapshot);
  const unreadForAdmin = toInt(chat.unreadForAdmin);
  const unreadForUser = toInt(chat.unreadForUser);

  const payload = {
    lastMessage,
    lastMessageAt: now,
    lastMessageSender: isAdmin ? 'admin' : 'user',
    unreadForAdmin: isAdmin ? unreadForAdmin : unreadForAdmin + 1,
    unreadForUser: isAdmin ? unreadForUser + 1 : unreadForUser,
    updatedAt: now,
  };

  if (!isAdmin) {
    payload.userId = `${chat.userId || user?.uid || ''}`.trim();
    payload.userName = resolveUserName(user);
    payload.userEmail = resolveUserEmail(user);
    if (`${adminId || ''}`.trim()) payload.adminId = `${adminId}`.trim();
    if (`${adminName || ''}`.trim()) payload.adminName = `${adminName}`.trim();
    if (`${adminEmail || ''}`.trim()) payload.adminEmail = `${adminEmail}`.trim();
  } else {
    const resolvedAdminEmail = `${adminEmail || user?.email || ''}`.trim();
    const resolvedAdminId = `${adminId || user?.uid || ''}`.trim();
    const resolvedAdminName = `${
      adminName ||
      user?.displayName ||
      capitalizeAlias(extractAliasFromEmail(resolvedAdminEmail)) ||
      'Admin'
    }`.trim();
    if (resolvedAdminId) payload.adminId = resolvedAdminId;
    if (resolvedAdminName) payload.adminName = resolvedAdminName;
    if (resolvedAdminEmail) payload.adminEmail = resolvedAdminEmail;
  }

  await setDoc(chatRef(chatId), payload, { merge: true });
}

async function currentUserIsAdmin() {
  const email = `${auth?.currentUser?.email || ''}`.trim().toLowerCase();
  if (email && isStaticAdminEmail(email)) return true;
  if (!db || !auth?.currentUser?.uid) return false;
  try {
    const userSnapshot = await getDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid));
    return userSnapshot.exists() && `${userSnapshot.data()?.role || ''}`.trim().toLowerCase() === 'admin';
  } catch {
    return false;
  }
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
  if (!db) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, CHATS_COLLECTION),
    (snapshot) => {
      const items = snapshot.docs.map((docItem) => mapSummary(docItem));
      onData?.(sortChats(items));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeUserChats(userId, onData, onError) {
  const uid = `${userId || ''}`.trim();
  if (!uid || !db) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    chatRef(uid),
    (snapshot) => {
      onData?.(snapshot.exists() ? [mapSummary(snapshot)] : []);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeAdmins(onData, onError) {
  const fallback = fallbackAdmins();
  onData?.(fallback);

  if (!db || !auth?.currentUser) {
    return () => {};
  }

  let unsubscribeUsers = () => {};
  let closed = false;

  void currentUserIsAdmin().then((isAdmin) => {
    if (!isAdmin || closed) return;
    unsubscribeUsers = onSnapshot(
      query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')),
      (snapshot) => {
        const admins = snapshot.docs.map((docItem) => mapAdmin(docItem));
        const deduped = dedupeAdmins(admins);
        const preferred = orderPreferredAdmins(deduped);
        onData?.(preferred.length ? preferred : deduped.length ? deduped : fallback);
      },
      (error) => {
        onError?.(error);
        onData?.(fallback);
      }
    );
  });

  return () => {
    closed = true;
    unsubscribeUsers();
  };
}

export function subscribeChatSummary(chatId, onData, onError) {
  const key = `${chatId || ''}`.trim();
  if (!key || !db) {
    onData?.(null);
    return () => {};
  }

  return onSnapshot(
    chatRef(key),
    (snapshot) => {
      onData?.(snapshot.exists() ? mapSummary(snapshot) : null);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeMessages(chatId, onData, onError) {
  const key = `${chatId || ''}`.trim();
  if (!key || !db) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    chatMessagesRef(key),
    (snapshot) => {
      const items = snapshot.docs.map((docItem) => mapMessage(docItem));
      onData?.(sortMessages(items));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function ensureChatForUser(user) {
  return ensureChatRecordForUser(user);
}

export async function markRead({ chatId, isAdmin }) {
  const key = `${chatId || ''}`.trim();
  if (!key) return;
  await setDoc(
    chatRef(key),
    {
      [isAdmin ? 'unreadForAdmin' : 'unreadForUser']: 0,
      [isAdmin ? 'lastReadByAdminAt' : 'lastReadByUserAt']: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function setActive({ chatId, isAdmin, active }) {
  const key = `${chatId || ''}`.trim();
  if (!key) return;
  await setDoc(
    chatRef(key),
    {
      [isAdmin ? 'activeForAdmin' : 'activeForUser']: Boolean(active),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
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
  const key = `${chatId || ''}`.trim();
  const trimmed = `${text || ''}`.trim();
  if (!key || !trimmed) return;

  const snapshot = isAdmin ? await findChatSnapshot(key) : null;
  if (isAdmin && !snapshot) return;

  const resolvedChatId = isAdmin ? key : `${user?.uid || ''}`.trim();
  if (!isAdmin) {
    await ensureChatRecordForUser(user);
  }
  const now = new Date().toISOString();

  await addDoc(chatMessagesRef(resolvedChatId), {
    chatId: resolvedChatId,
    senderRole: isAdmin ? 'admin' : 'user',
    senderId: isAdmin ? resolveAdminSenderId(user, adminEmail) : `${user?.uid || ''}`.trim(),
    text: trimmed,
    type: 'text',
    attachments: [],
    createdAt: now,
  });

  await updateChatSummary({
    chatId: resolvedChatId,
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

  const key = `${chatId || ''}`.trim();
  if (!key) return;

  const snapshot = isAdmin ? await findChatSnapshot(key) : null;
  if (isAdmin && !snapshot) return;

  const resolvedChatId = isAdmin ? key : `${user?.uid || ''}`.trim();
  if (!isAdmin) {
    await ensureChatRecordForUser(user);
  }
  const type = allImages ? 'images' : 'files';
  const uploaded = await encodeAttachments(list);
  if (!uploaded.length) return;
  const now = new Date().toISOString();

  await addDoc(chatMessagesRef(resolvedChatId), {
    chatId: resolvedChatId,
    senderRole: isAdmin ? 'admin' : 'user',
    senderId: isAdmin ? resolveAdminSenderId(user, adminEmail) : `${user?.uid || ''}`.trim(),
    text: '',
    type,
    attachments: uploaded,
    createdAt: now,
  });

  await updateChatSummary({
    chatId: resolvedChatId,
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
