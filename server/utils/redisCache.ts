/**
 * Redis-based caching utility for storing and retrieving API responses
 * 
 * This module provides a Redis-based caching system for improved persistence
 * and distribution across multiple instances.
 */

import { Redis } from '@upstash/redis';

// Initialize Redis from environment variables
let redis: Redis | undefined;

try {
  // For debugging purposes
  console.log('Redis initialization checking environment variables:');
  // Don't log the full values for security, just check their existence and format
  console.log('- UPSTASH_REDIS_REST_URL exists:', !!process.env.UPSTASH_REDIS_REST_URL);
  if (process.env.UPSTASH_REDIS_REST_URL) {
    console.log('- UPSTASH_REDIS_REST_URL starts with https://', process.env.UPSTASH_REDIS_REST_URL.startsWith('https://'));
  }
  console.log('- UPSTASH_REDIS_REST_TOKEN exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
  
  // For Upstash Redis, we need to check if we have both URL and token
  // Upstash URLs must start with https://
  if (process.env.UPSTASH_REDIS_REST_URL && 
      process.env.UPSTASH_REDIS_REST_URL.startsWith('https://') && 
      process.env.UPSTASH_REDIS_REST_TOKEN) {
    // This is the correct format for Upstash Redis REST API
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('Upstash Redis client initialized with REST API');
  }
  // Fall back to memory-only cache with warning
  else {
    console.warn('No valid Upstash Redis configuration found. Redis caching will be disabled.');
    console.warn('Please ensure UPSTASH_REDIS_REST_URL begins with "https://" and UPSTASH_REDIS_REST_TOKEN is set.');
  }

  if (redis) {
    console.log('Redis client initialized successfully. Distributed caching enabled.');
  }
} catch (error) {
  console.error('Failed to initialize Redis client:', error);
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  return !!redis;
}

/**
 * Sets a value in the Redis cache with expiration
 * @param key The cache key
 * @param value The value to store
 * @param ttlSeconds Time-to-live in seconds
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
  if (!redis) return;
  
  try {
    // For complex objects, stringify them
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    
    // Store in Redis with expiration
    await redis.set(key, valueToStore, { ex: ttlSeconds });
  } catch (error) {
    console.error(`Redis cache set error for key ${key}:`, error);
  }
}

/**
 * Gets a value from the Redis cache
 * @param key The cache key
 * @returns The stored value or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  
  try {
    const value = await redis.get(key);
    
    // If the value doesn't exist, return null
    if (!value) return null;
    
    // For string values that are actually JSON, parse them
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value) as T;
      } catch {
        // If JSON parsing fails, return the raw value
        return value as unknown as T;
      }
    }
    
    return value as unknown as T;
  } catch (error) {
    console.error(`Redis cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Deletes a key from the Redis cache
 * @param key The cache key to remove
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Redis cache delete error for key ${key}:`, error);
  }
}

/**
 * Deletes multiple keys matching a pattern
 * @param pattern The pattern to match keys (e.g., 'search:*')
 */
export async function deleteCacheByPattern(pattern: string): Promise<void> {
  if (!redis) return;
  
  try {
    // Scan for keys matching the pattern
    let cursor = "0";
    let keys: string[] = [];
    
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0] as string;
      keys = keys.concat(result[1] as string[]);
    } while (cursor !== "0");
    
    // Delete the found keys
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
      console.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Redis cache delete pattern error for ${pattern}:`, error);
  }
}

/**
 * Gets a value from the cache or computes it if not found
 * @param key The cache key
 * @param computeFn Function to compute the value if not in cache
 * @param ttlSeconds Time-to-live in seconds
 * @returns The value (either from cache or computed)
 */
export async function getOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = 600
): Promise<T> {
  if (!redis) return computeFn();
  
  try {
    // Try to get from cache first
    const cachedValue = await getCache<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // If not in cache, compute the value
    const computedValue = await computeFn();
    
    // Store in cache for future use
    await setCache(key, computedValue, ttlSeconds);
    
    return computedValue;
  } catch (error) {
    console.error(`Redis getOrCompute error for key ${key}:`, error);
    // If any error occurs with Redis, compute the value directly
    return computeFn();
  }
}

/**
 * Generate a cache key from an object
 * @param prefix Key prefix (e.g., 'search', 'ai', etc.)
 * @param params Object to use for key generation
 * @returns A consistent cache key
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  // Clone and sort the object to ensure consistent keys regardless of property order
  const ordered: Record<string, any> = {};
  Object.keys(params)
    .sort()
    .forEach(key => {
      ordered[key] = params[key];
    });
  
  // Create a JSON hash of the parameters
  const paramsString = JSON.stringify(ordered);
  
  // Return a prefixed key
  return `${prefix}:${paramsString}`;
}
