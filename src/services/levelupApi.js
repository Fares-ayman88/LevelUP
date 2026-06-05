const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? '/api/levelup'
  : 'http://127.0.0.1:8080';
const API_BASE_URL = (import.meta.env.VITE_LEVELUP_API_URL || DEFAULT_API_BASE_URL)
  .trim()
  .replace(/\/+$/, '');
export const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID || '713417674505-2653e24s70ode9kc97661ojp0gjl168s.apps.googleusercontent.com')
    .trim();

const TOKEN_KEY = 'levelup_api_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function setToken(token = '') {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const token = auth ? getToken() : '';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      setToken('');
    }
    const error = new Error(data?.message || data?.error || `API request failed: ${response.status}`);
    error.status = response.status;
    error.code = data?.code || '';
    error.data = data;
    throw error;
  }
  return data;
}

function normalizeApiResponse(response = {}) {
  const data = response?.data && typeof response.data === 'object' ? response.data : response;
  return {
    ...response,
    ...data,
    token: data.accessToken || response.accessToken || response.token || '',
    user: data.user || response.user || null,
  };
}

export const levelupApi = {
  baseUrl: API_BASE_URL,
  get token() {
    return getToken();
  },
  setToken,
  clearToken() {
    setToken('');
  },
  health() {
    return request('/health', { auth: false });
  },
  async signUp(payload) {
    const data = normalizeApiResponse(await request('/auth/register', { method: 'POST', body: payload, auth: false }));
    setToken(data.token);
    return data;
  },
  async signIn(payload) {
    const data = normalizeApiResponse(await request('/auth/login', { method: 'POST', body: payload, auth: false }));
    setToken(data.token);
    return data;
  },
  async signInWithGoogle(payload) {
    const data = normalizeApiResponse(await request('/auth/google', { method: 'POST', body: payload, auth: false }));
    setToken(data.token);
    return data;
  },
  me() {
    return request('/auth/me').then(normalizeApiResponse);
  },
  updateProfile(payload) {
    return request('/users/me', { method: 'PATCH', body: payload }).then(normalizeApiResponse);
  },
  uploadBase64(payload) {
    return request('/uploads/base64', { method: 'POST', body: payload });
  },
  courses: {
    list() {
      return request('/courses', { auth: false });
    },
    create(payload) {
      return request('/courses', { method: 'POST', body: payload });
    },
    update(id, payload) {
      return request(`/courses/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
    },
    remove(id) {
      return request(`/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  mentors: {
    list() {
      return request('/mentors', { auth: false });
    },
    create(payload) {
      return request('/mentors', { method: 'POST', body: payload });
    },
    update(id, payload) {
      return request(`/mentors/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
    },
    remove(id) {
      return request(`/mentors/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  transactions: {
    list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/transactions${qs ? `?${qs}` : ''}`);
    },
    create(payload) {
      return request('/transactions', { method: 'POST', body: payload });
    },
    updateStatus(id, status) {
      return request(`/transactions/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: { status },
      });
    },
  },
  instructorRequests: {
    list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/instructor-requests${qs ? `?${qs}` : ''}`).then(normalizeApiResponse);
    },
    create(payload) {
      return request('/instructor-requests', { method: 'POST', body: payload, auth: false });
    },
    updateStatus(id, status, additionalData = {}) {
      return request(`/instructor-requests/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: { status, ...additionalData },
      });
    },
    stats() {
      return request('/instructor-requests/stats').then(normalizeApiResponse);
    },
  },
  notifications: {
    list() {
      return request('/notifications');
    },
    markRead(id) {
      return request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    },
    remove(id) {
      return request(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  chats: {
    list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/chats${qs ? `?${qs}` : ''}`);
    },
    ensure(payload) {
      return request('/chats/ensure', { method: 'POST', body: payload });
    },
    messages(conversationKey) {
      return request(`/chats/${encodeURIComponent(conversationKey)}/messages`);
    },
    sendMessage(conversationKey, payload) {
      return request(`/chats/${encodeURIComponent(conversationKey)}/messages`, {
        method: 'POST',
        body: payload,
      });
    },
    markRead(conversationKey) {
      return request(`/chats/${encodeURIComponent(conversationKey)}/read`, { method: 'PATCH' });
    },
  },
};

export default levelupApi;
