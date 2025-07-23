/**
 * Advanced Caching Service
 * Multi-layer caching with Redis, memory cache, and intelligent invalidation
 */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Whether to compress large values
  version?: string; // Version for cache versioning
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  redisConnected: boolean;
}

export class AdvancedCacheService {
  private redis: Redis;
  private memoryCache: LRUCache<string, any>;
  private stats: CacheStats;
  private compressionThreshold = 1024; // Compress values larger than 1KB
  private defaultTTL = 3600; // 1 hour default TTL
  
  // Cache key prefixes for different data types
  private readonly prefixes = {
    user: 'user:',
    project: 'project:',
    design: 'design:',
    template: 'template:',
    asset: 'asset:',
    ai: 'ai:',
    query: 'query:',
    session: 'session:'
  };

  constructor(redisUrl: string) {
    // Initialize Redis connection
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    });

    // Initialize memory cache (L1 cache)
    this.memoryCache = new LRUCache<string, any>({
      max: 1000, // Maximum 1000 items in memory
      ttl: 1000 * 60 * 5, // 5 minutes TTL for memory cache
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Initialize stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      redisConnected: false
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis connected');
      this.stats.redisConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
      this.stats.redisConnected = false;
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
      this.stats.redisConnected = false;
    });

    // Update memory usage stats periodically
    setInterval(() => {
      this.updateStats();
    }, 30000); // Every 30 seconds
  }

  /**
   * Get value from cache (checks memory first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check L1 cache (memory) first
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        this.stats.hits++;
        return memoryValue;
      }

      // Check L2 cache (Redis)
      const redisValue = await this.redis.get(key);
      if (redisValue !== null) {
        const parsed = this.deserializeValue(redisValue);
        
        // Store in memory cache for faster future access
        this.memoryCache.set(key, parsed);
        
        this.stats.hits++;
        return parsed;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache (both memory and Redis)
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const serialized = this.serializeValue(value, options.compress);

      // Set in memory cache
      this.memoryCache.set(key, value, { ttl: Math.min(ttl, 300) * 1000 }); // Max 5 min in memory

      // Set in Redis
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      // Handle tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags);
      }

      this.stats.sets++;
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // Remove from Redis
      await this.redis.del(key);

      this.stats.deletes++;
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        // Remove from memory cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }

        // Remove from Redis
        await this.redis.del(...keys);
        await this.redis.del(tagKey);

        console.log(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
      }
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        // Remove from memory cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }

        // Remove from Redis
        await this.redis.del(...keys);

        console.log(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidate by pattern error:', error);
    }
  }

  /**
   * Get or set pattern - execute function if cache miss
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFunction();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Cached database query wrapper
   */
  async cachedQuery<T>(
    queryKey: string,
    queryFunction: () => Promise<T>,
    ttl: number = 300 // 5 minutes default for queries
  ): Promise<T> {
    const cacheKey = `${this.prefixes.query}${queryKey}`;
    return this.getOrSet(cacheKey, queryFunction, { ttl, tags: ['queries'] });
  }

  /**
   * Cache user data
   */
  async cacheUser(userId: string, userData: any, ttl: number = 1800): Promise<void> {
    const key = `${this.prefixes.user}${userId}`;
    await this.set(key, userData, { ttl, tags: ['users', `user:${userId}`] });
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId: string): Promise<any | null> {
    const key = `${this.prefixes.user}${userId}`;
    return this.get(key);
  }

  /**
   * Cache project data
   */
  async cacheProject(projectId: string, projectData: any, ttl: number = 900): Promise<void> {
    const key = `${this.prefixes.project}${projectId}`;
    await this.set(key, projectData, { ttl, tags: ['projects', `project:${projectId}`] });
  }

  /**
   * Cache design data
   */
  async cacheDesign(designId: string, designData: any, ttl: number = 600): Promise<void> {
    const key = `${this.prefixes.design}${designId}`;
    await this.set(key, designData, { ttl, tags: ['designs', `design:${designId}`] });
  }

  /**
   * Cache AI generation result
   */
  async cacheAIResult(
    prompt: string,
    parameters: any,
    result: any,
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    const cacheKey = this.generateAICacheKey(prompt, parameters);
    const key = `${this.prefixes.ai}${cacheKey}`;
    await this.set(key, result, { ttl, tags: ['ai', 'ai-results'] });
  }

  /**
   * Get cached AI result
   */
  async getCachedAIResult(prompt: string, parameters: any): Promise<any | null> {
    const cacheKey = this.generateAICacheKey(prompt, parameters);
    const key = `${this.prefixes.ai}${cacheKey}`;
    return this.get(key);
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    console.log('Warming cache with frequently accessed data...');
    
    try {
      // This would typically load templates, popular designs, etc.
      // Implementation depends on your specific use case
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.redis.flushdb();
      
      // Reset stats
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.sets = 0;
      this.stats.deletes = 0;
      
      console.log('All cache cleared');
    } catch (error) {
      console.error('Clear cache error:', error);
    }
  }

  private generateAICacheKey(prompt: string, parameters: any): string {
    const crypto = require('crypto');
    const combined = JSON.stringify({ prompt, parameters });
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private serializeValue(value: any, compress: boolean = false): string {
    const serialized = JSON.stringify(value);
    
    if (compress && serialized.length > this.compressionThreshold) {
      // Implement compression here if needed (e.g., using zlib)
      return serialized;
    }
    
    return serialized;
  }

  private deserializeValue(serialized: string): any {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Deserialization error:', error);
      return null;
    }
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
    }
    
    await pipeline.exec();
  }

  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    
    // Get memory cache size (approximate)
    this.stats.memoryUsage = this.memoryCache.size;
  }

  /**
   * Cleanup and close connections
   */
  async close(): Promise<void> {
    this.memoryCache.clear();
    await this.redis.quit();
  }
}

// Singleton instance
let cacheService: AdvancedCacheService | null = null;

export function getCacheService(redisUrl?: string): AdvancedCacheService {
  if (!cacheService) {
    if (!redisUrl) {
      throw new Error('Redis URL required for first initialization');
    }
    cacheService = new AdvancedCacheService(redisUrl);
  }
  return cacheService;
}

export { cacheService };