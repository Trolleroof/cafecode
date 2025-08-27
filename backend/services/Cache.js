// Lightweight in-memory cache with TTL, basic LRU eviction, tag-based invalidation,
// and in-flight request de-duplication to prevent cache stampedes.
// Intentionally minimal and dependency-free.

export class SimpleCache {
  constructor(options = {}) {
    const {
      maxEntries = 1000,
      defaultTtlMs = 30_000,
    } = options;
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map(); // key -> { value, expiresAt, lastAccessed, tags: Set<string>, size }
    this.tagIndex = new Map(); // tag -> Set<key>
    this.inflight = new Map(); // key -> Promise
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
    // Periodic cleanup to enforce TTLs
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 15_000).unref?.();
  }

  static createTagUser(userId) { return `u:${userId}`; }
  static createTagPath(path) { return `p:${path}`; }
  static createTagOp(op) { return `op:${op}`; }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this._deleteKey(key, entry);
      this.metrics.misses++;
      return null;
    }
    entry.lastAccessed = Date.now();
    this.metrics.hits++;
    return entry.value;
  }

  set(key, value, options = {}) {
    const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : this.defaultTtlMs;
    const tags = new Set(options.tags || []);
    const entry = {
      value,
      expiresAt: Date.now() + Math.max(0, ttlMs),
      lastAccessed: Date.now(),
      tags,
      size: JSON.stringify(value)?.length || 0,
    };
    // Insert
    this.store.set(key, entry);
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag).add(key);
    }
    this.metrics.sets++;
    // Evict if over capacity
    if (this.store.size > this.maxEntries) {
      this.evictLru();
    }
    return value;
  }

  delete(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    this._deleteKey(key, entry);
    this.metrics.deletes++;
    return true;
  }

  _deleteKey(key, entry) {
    this.store.delete(key);
    if (entry && entry.tags) {
      for (const tag of entry.tags) {
        const set = this.tagIndex.get(tag);
        if (set) {
          set.delete(key);
          if (set.size === 0) this.tagIndex.delete(tag);
        }
      }
    }
  }

  evictLru() {
    // Remove the least-recently accessed entry
    let lruKey = null;
    let lruTime = Infinity;
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    if (lruKey !== null) {
      const entry = this.store.get(lruKey);
      this._deleteKey(lruKey, entry);
      this.metrics.evictions++;
    }
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this._deleteKey(key, entry);
      }
    }
  }

  invalidateByTags(tags = []) {
    const seen = new Set();
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      for (const key of keys) {
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = this.store.get(key);
        if (entry) this._deleteKey(key, entry);
      }
    }
  }

  // Specifically invalidate directory listing caches for a given path
  invalidateDirectoryListings(userId, affectedPath) {
    const userTag = SimpleCache.createTagUser(userId);
    const keysToDelete = new Set();
    
    console.log(`📁 [CACHE] Invalidating directory listings for user ${userId}, path: ${affectedPath}`);
    
    for (const [key, entry] of this.store.entries()) {
      if (!entry.tags || !entry.tags.has(userTag)) continue;
      
      // Check if this is a directory listing cache that should be invalidated
      let shouldDelete = false;
      
      // Look for 'list' operation tags
      const hasListOp = Array.from(entry.tags).some(tag => tag === 'op:list');
      if (!hasListOp) continue;
      
      // Check path tags
      for (const tag of entry.tags) {
        if (!tag.startsWith('p:')) continue;
        const cachedPath = tag.substring(2);
        
        // Invalidate if the cached path is the affected path or a parent directory
        if (cachedPath === affectedPath || 
            cachedPath === '.' || 
            affectedPath.startsWith(cachedPath + '/') ||
            cachedPath.startsWith(affectedPath + '/')) {
          shouldDelete = true;
          break;
        }
      }
      
      if (shouldDelete) {
        keysToDelete.add(key);
        console.log(`🗑️ [CACHE] Will invalidate directory listing cache: ${key}`);
      }
    }
    
    // Actually delete the invalidated entries
    for (const k of keysToDelete) {
      const entry = this.store.get(k);
      if (entry) this._deleteKey(k, entry);
    }
    
    console.log(`✅ [CACHE] Invalidated ${keysToDelete.size} directory listing caches for path: ${affectedPath}`);
    return keysToDelete.size;
  }

  // Heuristic invalidation by userId and affected path.
  // Removes any entries tagged for the same user where the cached path equals,
  // is a parent of, or is a child of the affected path.
  invalidateUserPath(userId, affectedRelPath) {
    const userTag = SimpleCache.createTagUser(userId);
    const keysToDelete = new Set();
    
    console.log(`🔄 [CACHE] Invalidating cache for user ${userId}, path: ${affectedRelPath}`);
    
    for (const [key, entry] of this.store.entries()) {
      if (!entry.tags || !entry.tags.has(userTag)) continue;
      
      let shouldDelete = false;
      for (const tag of entry.tags) {
        if (!tag.startsWith('p:')) continue;
        const cachedPath = tag.substring(2);
        
        // Check if this cache entry should be invalidated
        if (cachedPath === affectedRelPath) { 
          shouldDelete = true; 
          break; 
        }
        if (cachedPath.startsWith(affectedRelPath + '/')) { 
          shouldDelete = true; 
          break; 
        }
        if (affectedRelPath.startsWith(cachedPath + '/')) { 
          shouldDelete = true; 
          break; 
        }
        
        // Special case: if we're invalidating a file, also invalidate its parent directory listings
        if (affectedRelPath.includes('/') && !affectedRelPath.endsWith('/')) {
          const parentDir = affectedRelPath.substring(0, affectedRelPath.lastIndexOf('/')) || '.';
          if (cachedPath === parentDir) {
            shouldDelete = true;
            break;
          }
        }
      }
      
      if (shouldDelete) {
        keysToDelete.add(key);
        console.log(`🗑️ [CACHE] Will invalidate cache key: ${key}`);
      }
    }
    
    // Actually delete the invalidated entries
    for (const k of keysToDelete) {
      const entry = this.store.get(k);
      if (entry) this._deleteKey(k, entry);
    }
    
    console.log(`✅ [CACHE] Invalidated ${keysToDelete.size} cache entries for path: ${affectedRelPath}`);
    return keysToDelete.size;
  }

  // De-duplicate concurrent work for the same key. Ensures only one in-flight
  // call executes and all waiters share the same Promise result.
  dedupe(key, producer) {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const promise = Promise.resolve().then(producer).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  // Snapshot basic statistics for monitoring/health reporting
  getStats() {
    const entries = this.store.size;
    const inflight = this.inflight.size;
    let approxBytes = 0;
    for (const entry of this.store.values()) {
      approxBytes += entry.size || 0;
    }
    const { hits, misses, sets, deletes, evictions } = this.metrics;
    const requests = hits + misses;
    const hitRate = requests > 0 ? hits / requests : 0;
    return {
      entries,
      inflight,
      approxBytes,
      metrics: { hits, misses, sets, deletes, evictions, requests, hitRate },
      config: { maxEntries: this.maxEntries, defaultTtlMs: this.defaultTtlMs },
    };
  }
}

// Singleton cache instance for the backend (tunable via env vars)
export const Cache = new SimpleCache({
  maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10),
  defaultTtlMs: parseInt(process.env.CACHE_DEFAULT_TTL_MS || '30000', 10),
});


