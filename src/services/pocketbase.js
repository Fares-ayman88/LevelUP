import PocketBase from 'pocketbase';

const STORAGE_KEY = 'pb_endpoint';
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
// Temporary public fallback for the current deployment.
// Replace this with a stable hosted PocketBase URL or VITE_PB_ENDPOINT as soon as possible.
const PUBLIC_FALLBACK_ENDPOINT = 'https://ultimate-bride-methodology-bench.trycloudflare.com';

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
  !isLocalHost(runtimeHost) ? PUBLIC_FALLBACK_ENDPOINT : '',
  hostCandidate,
  ...(isLocalHost(runtimeHost) ? ['http://127.0.0.1:8090', 'http://localhost:8090'] : []),
];

let pocketBase = null;
let pocketBaseUrl = null;
let pocketBaseHealthy = null;

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

function getUrlHostname(value = '') {
  const normalized = normalize(value, '');
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname || '';
  } catch {
    return '';
  }
}

function isLocalEndpoint(value = '') {
  return isLocalHost(getUrlHostname(value));
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
  let healthy = null;
  for (const candidate of candidates) {
    if (candidate === selected) continue;
    // eslint-disable-next-line no-await-in-loop
    const ok = await isHealthy(candidate);
    if (ok) {
      selected = candidate;
      healthy = true;
      break;
    }
  }

  if (!selected) {
    selected = saved || normalize(DEFAULT_CANDIDATES[0] || '', '');
    healthy = selected ? false : null;
  }

  if (selected && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, selected);
  }

  return {
    url: selected,
    healthy,
  };
}

export async function initPocketBase() {
  const result = await pickEndpoint();
  pocketBaseUrl = result.url;
  pocketBaseHealthy = result.healthy;
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
    pocketBaseHealthy = null;
  }
  return pocketBase;
}

export function getPocketBaseUrl() {
  return pocketBaseUrl;
}

export function getPocketBaseConfigStatus() {
  const configured = normalize(DEFAULT_CANDIDATES[0] || '', '');
  const saved =
    typeof window !== 'undefined'
      ? normalize(localStorage.getItem(STORAGE_KEY) || '', '')
      : '';
  const runtimeIsLocal = isLocalHost(runtimeHost);
  const selected = pocketBaseUrl || configured || saved || '';
  const selectedIsLocal = isLocalEndpoint(selected);

  let issue = '';
  if (!runtimeIsLocal && !configured && !saved) {
    issue = 'missing-public-endpoint';
  } else if (!runtimeIsLocal && selected && selectedIsLocal) {
    issue = 'public-site-pointing-to-local-pocketbase';
  } else if (selected && pocketBaseHealthy === false) {
    issue = 'configured-endpoint-unreachable';
  }

  return {
    runtimeHost,
    runtimeIsLocal,
    configured,
    saved,
    selected,
    healthy: pocketBaseHealthy,
    issue,
  };
}
