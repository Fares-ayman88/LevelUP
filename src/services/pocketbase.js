import PocketBase from 'pocketbase';

const STORAGE_KEY = 'pb_endpoint';
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
const hostCandidate = runtimeHost ? `http://${runtimeHost}:8090` : '';
const DEFAULT_CANDIDATES = [
  import.meta.env.VITE_PB_ENDPOINT,
  hostCandidate,
  'http://127.0.0.1:8090',
  'http://localhost:8090',
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
  const saved = normalize(localStorage.getItem(STORAGE_KEY) || '', '');
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

  if (selected) {
    localStorage.setItem(STORAGE_KEY, selected);
  }

  return selected;
}

export async function initPocketBase() {
  pocketBaseUrl = await pickEndpoint();
  if (!pocketBaseUrl) {
    return null;
  }
  pocketBase = new PocketBase(pocketBaseUrl);
  return pocketBase;
}

export function getPocketBase() {
  if (!pocketBase) {
    const fallback = normalize(DEFAULT_CANDIDATES[0] || '', '');
    pocketBase = new PocketBase(fallback || 'http://127.0.0.1:8090');
    pocketBaseUrl = pocketBase.baseUrl;
  }
  return pocketBase;
}

export function getPocketBaseUrl() {
  return pocketBaseUrl;
}

