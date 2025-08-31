// A robust Redis-based cache with tag-based invalidation and in-flight request de-duplication.
import { createClient } from 'redis';

export class SimpleCache {
  constructor(options = {}) {
    const {
      maxEntries = 1000,
      defaultTtlMs = 30_000,
    } = options;
    
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    
    // Initialize Redis client
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Connect to Redis
    this.redis.connect().catch(err => {
      console.error('Failed to connect to Redis:', err);
    });

    // Handle Redis events
    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    // In-memory tracking for tags and inflight requests
    this.tagIndex = new Map(); // tag -> Set<key>
    this.inflight = new Map(); // key -> Promise
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  static createTagUser(userId) { return `u:${userId}`; }
  static createTagPath(path) { return `p:${path}`; }
  static createTagOp(op) { return `op:${op}`; }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        this.metrics.misses++;
        return null;
      }
      this.metrics.hits++;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  async set(key, value, options = {}) {
    try {
      const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : this.defaultTtlMs;
      const tags = new Set(options.tags || []);
      
      // Store the value with tags metadata
      const entry = {
        value,
        tags: Array.from(tags),
        size: JSON.stringify(value)?.length || 0,
        timestamp: Date.now()
      };
      
      // Store in Redis with TTL
      await this.redis.setEx(key, ttlMs / 1000, JSON.stringify(entry));

      // Update tag index
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
        this.tagIndex.get(tag).add(key);
      }
      
      this.metrics.sets++;
      return value;
    } catch (error) {
      console.error('Redis set error:', error);
      return value;
    }
  }

  async delete(key) {
    try {
      const wasPresent = await this.redis.del(key);
      if (wasPresent) {
        this.metrics.deletes++;
        // Clean up tag index
        this._cleanupTags(key);
      }
      return wasPresent > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }
  
  _cleanupTags(key) {
    // Remove key from all tag indexes
    for (const [tag, keys] of this.tagIndex.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tagIndex.delete(tag);
      }
    }
  }

  async invalidateByTags(tags = []) {
    const seen = new Set();
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      
      // Iterate over a copy as the original set will be modified during deletion
      for (const key of [...keys]) {
        if (seen.has(key)) continue;
        seen.add(key);
        await this.delete(key);
      }
    }
  }

  // Specifically invalidate directory listing caches for a given path
  async invalidateDirectoryListings(userId, affectedPath) {
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
      try {
        const entryStr = await this.redis.get(key);
        if (!entryStr) continue;
        
        const entry = JSON.parse(entryStr);
        if (!entry.tags) continue;
        
        const hasListOp = entry.tags.includes('op:list');
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
            break;
          }
        }
      } catch (error) {
        console.error('Error checking cache entry:', error);
      }
    }
    
    // Actually delete the invalidated entries
    let deletedCount = 0;
    for (const k of keysToDelete) {
      if (await this.delete(k)) {
        deletedCount++;
      }
    }
    
    console.log(`✅ [CACHE] Invalidated ${deletedCount} directory listing caches for path: ${affectedPath}`);
    return deletedCount;
  }

  // Heuristic invalidation by userId and affected path.
  async invalidateUserPath(userId, affectedRelPath) {
    const userTag = SimpleCache.createTagUser(userId);
    const keysToDelete = new Set();
    
    console.log(`🔄 [CACHE] Invalidating cache for user ${userId}, path: ${affectedRelPath}`);
    
    const userKeys = this.tagIndex.get(userTag);
    if (!userKeys) {
        console.log(`✅ [CACHE] No cache entries to invalidate for user: ${userId}`);
        return 0;
    }
    
    for (const key of userKeys) {
      try {
        const entryStr = await this.redis.get(key);
        if (!entryStr) continue;
        
        const entry = JSON.parse(entryStr);
        if (!entry.tags) continue;
        
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
      } catch (error) {
        console.error('Error checking cache entry:', error);
      }
    }
    
    let deletedCount = 0;
    for (const k of keysToDelete) {
      if (await this.delete(k)) {
        deletedCount++;
      }
    }
    
    console.log(`✅ [CACHE] Invalidated ${deletedCount} cache entries for path: ${affectedRelPath}`);
    return deletedCount;
  }

  // De-duplicate concurrent work for the same key.
  async dedupe(key, producer) {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    
    const promise = Promise.resolve().then(producer).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  // Snapshot basic statistics for monitoring/health reporting
  async getStats() {
    try {
      const entries = await this.redis.dbSize();
      const inflight = this.inflight.size;
      
      const { hits, misses, sets, deletes } = this.metrics;
      const requests = hits + misses;
      const hitRate = requests > 0 ? hits / requests : 0;
      
      return {
        entries,
        inflight,
        approxBytes: 0, // Redis doesn't expose this easily
        metrics: { hits, misses, sets, deletes, evictions: this.metrics.evictions, requests, hitRate },
        config: { maxEntries: this.maxEntries, defaultTtlMs: this.defaultTtlMs },
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        entries: 0,
        inflight: this.inflight.size,
        approxBytes: 0,
        metrics: this.metrics,
        config: { maxEntries: this.maxEntries, defaultTtlMs: this.defaultTtlMs },
      };
    }
  }
}

// Singleton cache instance for the backend (tunable via env vars)
export const Cache = new SimpleCache({
  maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '1000', 10),
  defaultTtlMs: parseInt(process.env.CACHE_DEFAULT_TTL_MS || '30000', 10),
});


