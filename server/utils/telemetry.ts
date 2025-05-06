/**
 * Telemetry and monitoring utilities for tracking system performance
 * 
 * This module provides lightweight performance tracking, structured logging,
 * and system health monitoring for better observability and optimization.
 */

// Interface for API response timings
export interface ApiTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  apiName: string;
  parameters?: Record<string, any>;
  success: boolean;
  error?: string;
  modelInfo?: {
    name: string;
    tokens?: number;
  };
}

// Track all API calls for the current session
const apiTimings: ApiTiming[] = [];

// Maximum number of timings to keep in memory
const MAX_TIMINGS = 1000;

// Track system health metrics
const systemMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0, // in ms
  lastResetTime: Date.now(),
  modelUsage: {
    'compound-beta': 0,
    'compound-beta-mini': 0,
    'llama-3.3-70b': 0,
    'llama-4-maverick': 0,
    'other': 0
  },
  cacheStats: {
    hits: 0,
    misses: 0,
    ratio: 0
  }
};

/**
 * Start timing an API call
 * @param apiName Name of the API being called
 * @param parameters Optional parameters being passed to the API
 * @returns The API timing object with start time
 */
export function startApiTiming(apiName: string, parameters?: Record<string, any>): ApiTiming {
  const timing: ApiTiming = {
    startTime: Date.now(),
    apiName,
    parameters: parameters ? { ...parameters } : undefined,
    success: false
  };
  
  return timing;
}

/**
 * Complete the timing for an API call
 * @param timing The API timing object from startApiTiming
 * @param success Whether the API call was successful
 * @param error Optional error message if the call failed
 * @param modelInfo Optional information about the model used
 */
export function completeApiTiming(timing: ApiTiming, success: boolean, error?: string, modelInfo?: { name: string; tokens?: number }): void {
  // Update the timing object
  timing.endTime = Date.now();
  timing.duration = timing.endTime - timing.startTime;
  timing.success = success;
  timing.error = error;
  timing.modelInfo = modelInfo;
  
  // Add to the list of timings
  apiTimings.unshift(timing);
  
  // Keep the list at a manageable size
  if (apiTimings.length > MAX_TIMINGS) {
    apiTimings.pop();
  }
  
  // Update system metrics
  systemMetrics.totalRequests++;
  if (success) {
    systemMetrics.successfulRequests++;
  } else {
    systemMetrics.failedRequests++;
  }
  
  // Update average response time
  const totalDuration = apiTimings.reduce((sum, t) => sum + (t.duration || 0), 0);
  systemMetrics.averageResponseTime = totalDuration / apiTimings.length;
  
  // Update model usage
  if (modelInfo?.name) {
    const model = modelInfo.name;
    if (model in systemMetrics.modelUsage) {
      systemMetrics.modelUsage[model as keyof typeof systemMetrics.modelUsage]++;
    } else {
      systemMetrics.modelUsage.other++;
    }
  }
  
  // Log detailed information for errors or slow requests
  if (!success || (timing.duration && timing.duration > 5000)) {
    console.warn(`${success ? 'SLOW' : 'FAILED'} API CALL: ${timing.apiName} (${timing.duration}ms)`, 
      error ? `Error: ${error}` : '',
      timing.parameters ? `Parameters: ${JSON.stringify(timing.parameters)}` : '');
  }
}

/**
 * Record a cache hit or miss
 * @param hit Whether the cache lookup was a hit
 */
export function recordCacheResult(hit: boolean): void {
  if (hit) {
    systemMetrics.cacheStats.hits++;
  } else {
    systemMetrics.cacheStats.misses++;
  }
  
  const total = systemMetrics.cacheStats.hits + systemMetrics.cacheStats.misses;
  systemMetrics.cacheStats.ratio = total > 0 ? systemMetrics.cacheStats.hits / total : 0;
}

/**
 * Get the recent API timings
 * @param limit Maximum number of timings to return
 * @returns Recent API timings
 */
export function getRecentTimings(limit: number = 100): ApiTiming[] {
  return apiTimings.slice(0, Math.min(limit, apiTimings.length));
}

/**
 * Get the current system metrics
 * @returns System health metrics
 */
export function getSystemMetrics(): typeof systemMetrics {
  return { ...systemMetrics };
}

/**
 * Reset the system metrics
 */
export function resetSystemMetrics(): void {
  systemMetrics.totalRequests = 0;
  systemMetrics.successfulRequests = 0;
  systemMetrics.failedRequests = 0;
  systemMetrics.averageResponseTime = 0;
  systemMetrics.lastResetTime = Date.now();
  
  Object.keys(systemMetrics.modelUsage).forEach(key => {
    const typedKey = key as keyof typeof systemMetrics.modelUsage;
    systemMetrics.modelUsage[typedKey] = 0;
  });
  
  systemMetrics.cacheStats.hits = 0;
  systemMetrics.cacheStats.misses = 0;
  systemMetrics.cacheStats.ratio = 0;
}

/**
 * Log a structured event for monitoring purposes
 * @param eventType Type of event (e.g., 'search', 'auth', 'error')
 * @param details Event details
 */
export function logEvent(eventType: string, details: Record<string, any>): void {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  // Log the event - in production you would send this to a monitoring service
  console.log(`EVENT [${eventType}]: ${JSON.stringify(event)}`);
}
