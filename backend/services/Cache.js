// A more robust in-memory cache using lru-cache library, while preserving
// tag-based invalidation and in-flight request de-duplication.
import { LRUCache } from 'lru-cache';

export class SimpleCache {
  constructor(options = {}) {
    const {
      maxEntries = 1000,
      defaultTtlMs = 30_000,
    } = options;
    
    this.lru = new LRUCache({
      max: maxEntries,
      ttl: defaultTtlMs,
      dispose: (value, key) => {
        this._cleanupTags(key, value);
      },
    });

    this.tagIndex = new Map(); // tag -> Set<key>
    this.inflight = new Map(); // key -> Promise
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0, // lru-cache does not expose this directly
    };
  }

  static createTagUser(userId) { return `u:${userId}`; }
  static createTagPath(path) { return `p:${path}`; }
  static createTagOp(op) { return `op:${op}`; }

  get(key) {
    const entry = this.lru.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    this.metrics.hits++;
    return entry.value;
  }

  set(key, value, options = {}) {
    const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : this.lru.ttl;
    const tags = new Set(options.tags || []);
    const entry = {
      value,
      tags,
      size: JSON.stringify(value)?.length || 0,
    };
    
    // Clean up tags for the old value if it exists, will be handled by dispose
    this.lru.set(key, entry, { ttl: ttlMs });

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag).add(key);
    }
    this.metrics.sets++;
    return value;
  }

  delete(key) {
    const wasPresent = this.lru.delete(key);
    if (wasPresent) {
      this.metrics.deletes++;
    }
    return wasPresent;
  }
  
  _cleanupTags(key, entry) {
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

  invalidateByTags(tags = []) {
    const seen = new Set();
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      // Iterate over a copy as the original set will be modified during deletion
      for (const key of [...keys]) {
        if (seen.has(key)) continue;
        seen.add(key);
        this.lru.delete(key); // This will trigger dispose and clean up tags
      }
    }
  }

  // Specifically invalidate directory listing caches for a given path
  invalidateDirectoryListings(userId, affectedPath) {
    const userTag = SimpleCache.createTagUser(userId);
    const keysToDelete = new Set();
    
    console.log(`📁 [CACHE] Invalidating directory listings for user ${userId}, path: ${affectedPath}`);
    
    // Find all keys associated with the user
    const userKeys = this.tagIndex.get(userTag);
    if (!userKeys) {
        console.log(`✅ [CACHE] No directory listing caches to invalidate for user: ${userId}`);
        return 0;
    }
    
    for (const key of userKeys) {
      const entry = this.lru.peek(key); // peek doesn't update LRU status
      if (!entry || !entry.tags) continue;
      
      const hasListOp = entry.tags.has('op:list');
      if (!hasListOp) continue;
      
      for (const tag of entry.tags) {
        if (!tag.startsWith('p:')) continue;
        const cachedPath = tag.substring(2);
        
        if (cachedPath === affectedPath || 
            cachedPath === '.' || 
            affectedPath.startsWith(cachedPath + '/') ||
            cachedPath.startsWith(affectedPath + '/')) {
          keysToDelete.add(key);
          console.log(`🗑️ [CACHE] Will invalidate directory listing cache: ${key}`);
          break; // Move to next key once a match is found
        }
      }
    }
    
    // Actually delete the invalidated entries
    for (const k of keysToDelete) {
      this.lru.delete(k);
    }
    
    console.log(`✅ [CACHE] Invalidated ${keysToDelete.size} directory listing caches for path: ${affectedPath}`);
    return keysToDelete.size;
  }

  // Heuristic invalidation by userId and affected path.
  invalidateUserPath(userId, affectedRelPath) {
    const userTag = SimpleCache.createTagUser(userId);
    const keysToDelete = new Set();
    
    console.log(`🔄 [CACHE] Invalidating cache for user ${userId}, path: ${affectedRelPath}`);
    
    const userKeys = this.tagIndex.get(userTag);
    if (!userKeys) {
        console.log(`✅ [CACHE] No cache entries to invalidate for user: ${userId}`);
        return 0;
    }
    
    for (const key of userKeys) {
      const entry = this.lru.peek(key);
      if (!entry || !entry.tags) continue;
      
      let shouldDelete = false;
      for (const tag of entry.tags) {
        if (!tag.startsWith('p:')) continue;
        const cachedPath = tag.substring(2);
        
        if (cachedPath === affectedRelPath || 
            cachedPath.startsWith(affectedRelPath + '/') || 
            affectedRelPath.startsWith(cachedPath + '/')) { 
          shouldDelete = true; 
          break; 
        }
        
        // Special case: invalidate parent dir listing on file change
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
    
    for (const k of keysToDelete) {
      this.lru.delete(k);
    }
    
    console.log(`✅ [CACHE] Invalidated ${keysToDelete.size} cache entries for path: ${affectedRelPath}`);
    return keysToDelete.size;
  }

  // De-duplicate concurrent work for the same key.
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
    const entries = this.lru.size;
    const inflight = this.inflight.size;
    let approxBytes = 0;
    for (const entry of this.lru.values()) {
      approxBytes += entry.size || 0;
    }
    const { hits, misses, sets, deletes } = this.metrics;
    const requests = hits + misses;
    const hitRate = requests > 0 ? hits / requests : 0;
    return {
      entries,
      inflight,
      approxBytes,
      metrics: { hits, misses, sets, deletes, evictions: this.metrics.evictions, requests, hitRate },
      config: { maxEntries: this.lru.max, defaultTtlMs: this.lru.ttl },
    };
  }
}

// Singleton cache instance for the backend (tunable via env vars)
export const Cache = new SimpleCache({
  maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10),
  defaultTtlMs: parseInt(process.env.CACHE_DEFAULT_TTL_MS || '30000', 10),
});


