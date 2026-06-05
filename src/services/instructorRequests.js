import levelupApi from './levelupApi.js';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapRequest(item = {}) {
  return {
    id: item.id,
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
    return (response.items || []).map(mapRequest);
  }, onData, onError);
}

export function subscribePendingInstructorRequests(onData, onError) {
  return subscribeInstructorRequestsByStatus('pending', onData, onError);
}

export async function fetchInstructorRequestForUser(userId) {
  try {
    const response = await levelupApi.instructorRequests.list();
    return (response.items || []).map(mapRequest).find((item) => item.userId === `${userId || ''}`.trim()) || null;
  } catch (error) {
    console.error('Error fetching instructor request:', error);
    return null;
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
    
    return mapRequest(response.item || response);
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
    cache.stats = response;
    cache.statsExpiry = Date.now() + cache.TTL;
    return response;
  } catch (error) {
    console.error('Error fetching instructor request stats:', error);
    return { pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 };
  }
}

