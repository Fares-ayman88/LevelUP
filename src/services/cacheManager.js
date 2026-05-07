/**
 * Cache Manager Service
 * Provides in-memory caching with TTL (time-to-live) support
 * Reduces redundant API calls and improves performance
 * 
 * @module cacheManager
 * @example
 * // Simple cache usage
 * setCache('user-profile', userData, 5 * 60 * 1000);
 * const cached = getCache('user-profile');
 * 
 * @example
 * // Cached API call
 * const data = await cachedFetch('notifications', 
 *   () => fetchNotificationsAPI(),
 *   5 * 60 * 1000
 * );
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes default

/**
 * Store data in cache with TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} [duration=CACHE_DURATION] - TTL in milliseconds
 */
export function setCache(key, value, duration = CACHE_DURATION) {
  cache.set(key, {
    value,
    timestamp: Date.now(),
    duration,
  });
}

export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;

  const elapsed = Date.now() - item.timestamp;
  if (elapsed > item.duration) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

export function clearCache(key = null) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCacheStats() {
  return {
    size: cache.size,
    items: Array.from(cache.keys()),
  };
}

// Wrap API calls with caching
export async function cachedFetch(key, fetchFn, duration = CACHE_DURATION) {
  const cached = getCache(key);
  if (cached) {
    console.debug(`[Cache Hit] ${key}`);
    return cached;
  }

  console.debug(`[Cache Miss] ${key}`);
  const result = await fetchFn();
  setCache(key, result, duration);
  return result;
}

// Clear expired cache entries periodically
export function startCacheCleanup(interval = 60000) {
  return setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
      const elapsed = now - item.timestamp;
      if (elapsed > item.duration) {
        cache.delete(key);
        console.debug(`[Cache Cleanup] Removed ${key}`);
      }
    }
  }, interval);
}
