const DEFAULT_LABEL = 'Loading...';

let activeCount = 0;
let currentLabel = DEFAULT_LABEL;
const listeners = new Set();

function snapshot() {
  return {
    active: activeCount > 0,
    label: currentLabel,
    count: activeCount,
  };
}

function emit() {
  const next = snapshot();
  for (const listener of Array.from(listeners)) {
    listener(next);
  }
}

export function getGlobalLoadingSnapshot() {
  return snapshot();
}

export function subscribeGlobalLoading(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function showGlobalLoading(label = DEFAULT_LABEL) {
  activeCount += 1;
  currentLabel = `${label || DEFAULT_LABEL}`.trim() || DEFAULT_LABEL;
  emit();

  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount === 0) {
      currentLabel = DEFAULT_LABEL;
    }
    emit();
  };
}

export async function withGlobalLoading(task, label = DEFAULT_LABEL) {
  const close = showGlobalLoading(label);
  try {
    return await task();
  } finally {
    close();
  }
}
