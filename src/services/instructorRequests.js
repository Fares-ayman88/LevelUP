import levelupApi from './levelupApi.js';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapRequest(item = {}) {
  return {
    id: item._id || item.id,
    userId: `${item.userId || item.id || ''}`.trim(),
    name: `${item.name || ''}`.trim(),
    email: `${item.email || ''}`.trim(),
    phone: `${item.phone || ''}`.trim(),
    category: `${item.category || ''}`.trim(),
    coursesTaken: `${item.coursesTaken || ''}`.trim(),
    experienceYears: `${item.experienceYears || ''}`.trim(),
    notes: `${item.notes || ''}`.trim(),
    cvUrl: `${item.cvUrl || ''}`.trim(),
    idUrl: `${item.idUrl || ''}`.trim(),
    status: `${item.status || 'pending'}`.trim(),
    rejectionReason: `${item.rejectionReason || ''}`.trim(),
    requestedAt: toDate(item.createdAt || item.requestedAt),
    updatedAt: toDate(item.updatedAt),
    approvedAt: toDate(item.approvedAt),
    rejectedAt: toDate(item.rejectedAt),
  };
}

// Cache with TTL for instructor requests
const cache = {
  requests: null,
  requestsExpiry: 0,
  stats: null,
  statsExpiry: 0,
  TTL: 30000, // 30 seconds
};

const STORAGE_KEY = 'levelup_instructor_requests_cache_v1';

function readStoredRequests() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(mapRequest).filter((item) => item.id || item.userId) : [];
  } catch {
    return [];
  }
}

function writeStoredRequests(items = []) {
  if (typeof window === 'undefined') return;
  try {
    const byId = new Map();
    [...readStoredRequests(), ...items.map(mapRequest)].forEach((item) => {
      const key = item.id || item.userId;
      if (key) byId.set(key, item);
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(byId.values())));
  } catch {
    // Local cache is best-effort only.
  }
}

function mergeStoredRequests(items = []) {
  const byId = new Map();
  [...readStoredRequests(), ...items.map(mapRequest)].forEach((item) => {
    const key = item.id || item.userId;
    if (key) byId.set(key, item);
  });
  const merged = Array.from(byId.values());
  writeStoredRequests(merged);
  return merged;
}

function removeStoredRequest(id = '') {
  if (typeof window === 'undefined') return;
  const target = `${id || ''}`.trim();
  if (!target) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStoredRequests().filter((item) => item.id !== target && item.userId !== target)),
    );
  } catch {
    // Local cache is best-effort only.
  }
}

function calculateStats(items = []) {
  return items.reduce(
    (acc, item) => {
      const status = `${item.status || 'pending'}`.trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(acc, status)) acc[status] += 1;
      acc.total += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 },
  );
}

function isCacheValid(expiry) {
  return expiry > Date.now();
}

function poll(loader, onData, onError, interval = 10000) {
  let closed = false;
  const emit = async () => {
    try {
      const data = await loader();
      if (!closed) onData(data);
    } catch (error) {
      if (!closed && onError) onError(error);
    }
  };
  emit();
  const timer = setInterval(emit, interval);
  return () => {
    closed = true;
    clearInterval(timer);
  };
}

export function subscribeInstructorRequestsByStatus(status, onData, onError) {
  const normalized = `${status || 'pending'}`.trim() || 'pending';
  return poll(async () => {
    const response = await levelupApi.instructorRequests.list({ status: normalized });
    return mergeStoredRequests(response.items || []).filter((item) => item.status === normalized);
  }, onData, onError);
}

export function subscribePendingInstructorRequests(onData, onError) {
  return subscribeInstructorRequestsByStatus('pending', onData, onError);
}

export async function fetchInstructorRequestForUser(userId) {
  try {
    const response = await levelupApi.instructorRequests.list();
    return mergeStoredRequests(response.items || []).find((item) => item.userId === `${userId || ''}`.trim()) || null;
  } catch (error) {
    console.error('Error fetching instructor request:', error);
    return readStoredRequests().find((item) => item.userId === `${userId || ''}`.trim()) || null;
  }
}

export function subscribeInstructorRequestForUser(userId, onData, onError) {
  const uid = `${userId || ''}`.trim();
  return poll(async () => fetchInstructorRequestForUser(uid), onData, onError);
}

function buildGuestUserId(email, phone) {
  const seed = `${email || phone || 'instructor'}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `guest_${seed || 'instructor'}`;
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
  const normalizedEmail = `${email || ''}`.trim().toLowerCase();
  const uid = `${user?.uid || buildGuestUserId(normalizedEmail, phone)}`.trim();
  
  try {
    const response = await levelupApi.instructorRequests.create({
      userId: uid,
      name,
      email: normalizedEmail,
      phone,
      category,
      coursesTaken,
      experienceYears: parseInt(experienceYears, 10) || 0,
      notes,
    });
    
    // Invalidate cache after successful submission
    cache.requests = null;
    cache.requestsExpiry = 0;
    
    const request = mapRequest(response.item || response);
    writeStoredRequests([request]);
    return request;
  } catch (error) {
    console.error('Error submitting instructor request:', error);
    throw error;
  }
}

export async function approveInstructorRequest(request) {
  const id = `${request?.id || ''}`.trim();
  if (!id) throw new Error('Request ID is required');
  
  try {
    await levelupApi.instructorRequests.updateStatus(id, 'approved');
    writeStoredRequests([{ ...request, status: 'approved', approvedAt: new Date().toISOString() }]);
    // Invalidate cache after status update
    cache.requests = null;
    cache.stats = null;
    cache.requestsExpiry = 0;
    cache.statsExpiry = 0;
  } catch (error) {
    console.error('Error approving instructor request:', error);
    throw error;
  }
}

export async function rejectInstructorRequest(request, rejectionReason = '') {
  const id = `${request?.id || ''}`.trim();
  if (!id) throw new Error('Request ID is required');
  
  try {
    await levelupApi.instructorRequests.updateStatus(id, 'rejected', { rejectionReason });
    writeStoredRequests([{ ...request, status: 'rejected', rejectionReason, rejectedAt: new Date().toISOString() }]);
    // Invalidate cache after status update
    cache.requests = null;
    cache.stats = null;
    cache.requestsExpiry = 0;
    cache.statsExpiry = 0;
  } catch (error) {
    console.error('Error rejecting instructor request:', error);
    throw error;
  }
}

export async function revokeInstructorRequest(request) {
  const id = `${request?.id || ''}`.trim();
  if (!id) throw new Error('Request ID is required');
  
  try {
    await levelupApi.instructorRequests.updateStatus(id, 'revoked');
    removeStoredRequest(id);
    // Invalidate cache after status update
    cache.requests = null;
    cache.stats = null;
    cache.requestsExpiry = 0;
    cache.statsExpiry = 0;
  } catch (error) {
    console.error('Error revoking instructor request:', error);
    throw error;
  }
}

export async function getInstructorRequestStats() {
  if (isCacheValid(cache.statsExpiry)) {
    return cache.stats;
  }
  
  try {
    const response = await levelupApi.instructorRequests.stats();
    const localStats = calculateStats(readStoredRequests());
    cache.stats = {
      pending: Math.max(response.pending || 0, localStats.pending),
      approved: Math.max(response.approved || 0, localStats.approved),
      rejected: Math.max(response.rejected || 0, localStats.rejected),
      revoked: Math.max(response.revoked || 0, localStats.revoked),
      total: Math.max(response.total || 0, localStats.total),
    };
    cache.statsExpiry = Date.now() + cache.TTL;
    return cache.stats;
  } catch (error) {
    console.error('Error fetching instructor request stats:', error);
    return calculateStats(readStoredRequests());
  }
}

