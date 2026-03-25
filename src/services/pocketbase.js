import PocketBase from 'pocketbase';

const STORAGE_KEY = 'pb_endpoint';
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';

function isLocalHost(value = '') {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('192.168.') || normalized.startsWith('10.')) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized);
}

const hostCandidate = isLocalHost(runtimeHost) ? `http://${runtimeHost}:8090` : '';
const DEFAULT_CANDIDATES = [
  import.meta.env.VITE_PB_ENDPOINT,
  hostCandidate,
  ...(isLocalHost(runtimeHost) ? ['http://127.0.0.1:8090', 'http://localhost:8090'] : []),
];

let pocketBase = null;
let pocketBaseUrl = null;

function normalize(value, fallback = '') {
  if (!value) return fallback;
  let normalized = value.trim();
  if (!normalized) return fallback;
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

async function isHealthy(baseUrl) {
  if (!baseUrl) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function pickEndpoint() {
  const saved =
    typeof window !== 'undefined'
      ? normalize(localStorage.getItem(STORAGE_KEY) || '', '')
      : '';
  const candidates = [...DEFAULT_CANDIDATES, saved]
    .filter(Boolean)
    .map((value) => normalize(value, ''))
    .filter(Boolean);

  let selected = '';
  for (const candidate of candidates) {
    if (candidate === selected) continue;
    // eslint-disable-next-line no-await-in-loop
    const ok = await isHealthy(candidate);
    if (ok) {
      selected = candidate;
      break;
    }
  }

  if (!selected) {
    selected = saved || normalize(DEFAULT_CANDIDATES[0] || '', '');
  }

  if (selected && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, selected);
  }

  return selected;
}

export async function initPocketBase() {
  pocketBaseUrl = await pickEndpoint();
  if (!pocketBaseUrl) {
    pocketBase = null;
    return null;
  }
  pocketBase = new PocketBase(pocketBaseUrl);
  return pocketBase;
}

export function hasPocketBaseEndpoint() {
  const configured = normalize(DEFAULT_CANDIDATES[0] || '', '');
  const saved =
    typeof window !== 'undefined'
      ? normalize(localStorage.getItem(STORAGE_KEY) || '', '')
      : '';
  return Boolean(pocketBaseUrl || configured || saved);
}

export function getPocketBase() {
  if (!pocketBase) {
    const fallback = normalize(DEFAULT_CANDIDATES[0] || '', '');
    if (!fallback) {
      return null;
    }
    pocketBase = new PocketBase(fallback);
    pocketBaseUrl = pocketBase.baseUrl;
  }
  return pocketBase;
}

export function getPocketBaseUrl() {
  return pocketBaseUrl;
}
