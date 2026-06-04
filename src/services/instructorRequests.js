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
    requestedAt: toDate(item.requestedAt),
    updatedAt: toDate(item.updatedAt),
    resolvedAt: toDate(item.resolvedAt),
  };
}

function poll(loader, onData, onError) {
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
  const timer = setInterval(emit, 10000);
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
  const response = await levelupApi.instructorRequests.list();
  return (response.items || []).map(mapRequest).find((item) => item.userId === `${userId || ''}`.trim()) || null;
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
  const response = await levelupApi.instructorRequests.create({
    userId: uid,
    name,
    email: normalizedEmail,
    phone,
    category,
    coursesTaken,
    experienceYears,
    notes,
  });
  return mapRequest(response.item || response);
}

export async function approveInstructorRequest(request) {
  const id = `${request?.id || ''}`.trim();
  if (!id) return;
  await levelupApi.instructorRequests.updateStatus(id, 'approved');
}

export async function rejectInstructorRequest(request) {
  const id = `${request?.id || ''}`.trim();
  if (!id) return;
  await levelupApi.instructorRequests.updateStatus(id, 'rejected');
}

export async function revokeInstructorRequest(request) {
  const id = `${request?.id || ''}`.trim();
  if (!id) return;
  await levelupApi.instructorRequests.updateStatus(id, 'revoked');
}
