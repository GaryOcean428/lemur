/**
 * Cache utility for storing and retrieving API responses
 * 
 * This module provides an in-memory caching system with configurable TTL and size limits
 * to optimize performance and reduce API calls for frequent or similar queries.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiry: number; // expiry time in milliseconds
}

class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number; // in milliseconds
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Creates a new cache instance
   * @param maxSize Maximum number of entries in the cache
   * @param defaultTTL Default time-to-live for cache entries in seconds
   * @param cleanupIntervalSec Interval in seconds for cleanup of expired entries
   */
  constructor(maxSize: number = 100, defaultTTL: number = 300, cleanupIntervalSec: number = 60) {
    this.cache = new Map<string, CacheEntry<T>>();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL * 1000; // convert to milliseconds

    // Set up automatic cleanup interval
    if (cleanupIntervalSec > 0) {
      this.cleanupInterval = setInterval(() => {
        this.removeExpired();
      }, cleanupIntervalSec * 1000);
      
      // Prevent the interval from keeping the process alive
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Generates a cache key from the provided parameters
   * @param params The parameters to generate a key from
   * @returns A string key
   */
  private generateKey(params: any): string {
    // For objects, use JSON.stringify for key generation
    if (typeof params === 'object' && params !== null) {
      try {
        // Sort keys to ensure consistent hashing regardless of property order
        const ordered: any = {};
        Object.keys(params).sort().forEach(key => {
          ordered[key] = params[key];
        });
        return JSON.stringify(ordered);
      } catch (e) {
        console.error('Cache key generation error:', e);
        return String(Date.now()); // Fallback to timestamp if JSON conversion fails
      }
    }
    
    // For primitives, convert to string
    return String(params);
  }

  /**
   * Sets a value in the cache
   * @param key The cache key or parameters to generate a key
   * @param value The value to cache
   * @param ttl Optional TTL in seconds (overrides default)
   */
  set(key: string | any, value: T, ttl?: number): void {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const expiry = ttl !== undefined ? ttl * 1000 : this.defaultTTL;
    
    // If cache is at capacity, remove the oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      expiry
    });
  }

  /**
   * Gets a value from the cache
   * @param key The cache key or parameters to generate a key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: string | any): T | undefined {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    // If not in cache or expired
    if (!entry || (Date.now() - entry.timestamp) > entry.expiry) {
      if (entry) {
        // Remove expired entry
        this.cache.delete(cacheKey);
      }
      this.misses++;
      return undefined;
    }
    
    // Cache hit
    this.hits++;
    return entry.value;
  }

  /**
   * Gets a cached value or computes and caches it if not found
   * @param key The cache key or parameters
   * @param compute Function to compute the value if not in cache
   * @param ttl Optional TTL in seconds
   * @returns The value (either from cache or computed)
   */
  async getOrCompute(key: string | any, compute: () => Promise<T>, ttl?: number): Promise<T> {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const cachedValue = this.get(cacheKey);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Compute value if not in cache
    const computedValue = await compute();
    this.set(cacheKey, computedValue, ttl);
    return computedValue;
  }

  /**
   * Removes a specific entry from the cache
   * @param key The cache key or parameters
   */
  remove(key: string | any): void {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidates all cache entries matching a pattern
   * @param pattern A function that determines if an entry should be invalidated
   */
  invalidateByPattern(pattern: (key: string) => boolean): void {
    // Use Array.from to convert iterator to array to avoid TSC errors
    Array.from(this.cache.keys()).forEach(key => {
      if (pattern(key)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Removes all expired entries from the cache
   */
  removeExpired(): void {
    const now = Date.now();
    // Use Array.from to convert iterator to array to avoid TSC errors
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if ((now - entry.timestamp) > entry.expiry) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Finds the oldest entry in the cache
   * @returns The key of the oldest entry or undefined if cache is empty
   */
  private findOldestEntry(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    
    // Use Array.from to convert iterator to array to avoid TSC errors
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    });
    
    return oldestKey;
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { size: number, hits: number, misses: number, hitRatio: number } {
    const total = this.hits + this.misses;
    const hitRatio = total === 0 ? 0 : this.hits / total;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio
    };
  }

  /**
   * Disposes of the cache instance and cleans up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Create cache instances for different types of data
export const searchCache = new Cache<any>(200, 600); // Cache for search results (10 minutes TTL)
export const aiResponseCache = new Cache<any>(100, 1800); // Cache for AI responses (30 minutes TTL)
export const suggestionCache = new Cache<string[]>(50, 300); // Cache for search suggestions (5 minutes TTL)

// Export the Cache class for creating custom caches
export { Cache };
