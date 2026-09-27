/**
 * Stale-While-Revalidate In-Memory API Cache System
 * 
 * Provides:
 * 1. Instant (0ms) route navigation rendering from memory cache.
 * 2. Background revalidation (silent background fetch to pick up mobile/other user changes).
 * 3. Automatic cache invalidation when mutations (POST, PUT, PATCH, DELETE) happen.
 * 4. Deep hash comparison to prevent unnecessary DOM re-renders when data hasn't changed.
 */

class ApiCache {
  constructor() {
    this.cache = new Map();
  }

  generateKey(url, params) {
    if (!params || Object.keys(params).length === 0) return url;
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, k) => {
        if (params[k] !== undefined && params[k] !== null) {
          acc[k] = params[k];
        }
        return acc;
      }, {});
    return `${url}?${JSON.stringify(sorted)}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data;
  }

  set(key, data, tags = []) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      tags,
      hash: this.getHash(data)
    });
  }

  getHash(data) {
    try {
      return JSON.stringify(data);
    } catch {
      return '';
    }
  }

  isEqual(key, newData) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return entry.hash === this.getHash(newData);
  }

  has(key) {
    return this.cache.has(key);
  }

  invalidate(patternOrTag) {
    if (!patternOrTag) {
      this.cache.clear();
      return;
    }
    for (const [k, v] of this.cache.entries()) {
      if (
        k.includes(patternOrTag) ||
        (v.tags && v.tags.some((t) => t.includes(patternOrTag)))
      ) {
        this.cache.delete(k);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();

/**
 * Helper to fetch data with Stale-While-Revalidate caching pattern
 * @param {string} cacheKey - Unique key for the cache entry
 * @param {Function} fetcher - Async function returning Axios response (e.g. () => deviceApi.getAll())
 * @param {Object} options - { onData: (data, fromCache) => void, tags: string[] }
 */
export async function fetchWithCache(cacheKey, fetcher, { onData, tags = [] } = {}) {
  const cached = apiCache.get(cacheKey);
  const hasCache = cached !== null && cached !== undefined;

  // 1. If cached data exists, immediately serve it to the component (0ms wait)
  if (hasCache && onData) {
    onData(cached, true);
  }

  // 2. Fetch fresh data from network in background (or foreground if no cache)
  try {
    const res = await fetcher();
    const freshData = res.data?.results !== undefined ? res.data : (res.data ?? res);

    // 3. Compare with cache: only update state if data actually changed
    if (!hasCache || !apiCache.isEqual(cacheKey, freshData)) {
      apiCache.set(cacheKey, freshData, tags);
      if (onData) {
        onData(freshData, false);
      }
    }
    return freshData;
  } catch (err) {
    if (!hasCache) {
      throw err;
    }
    console.warn(`[ApiCache] Background sync failed for ${cacheKey}:`, err);
    return cached;
  }
}
