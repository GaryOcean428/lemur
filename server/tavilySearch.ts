/**
 * Tavily search integration module
 * 
 * Provides a utility function for making API calls to Tavily's web search service
 * with consistent error handling and caching.
 */

import { searchCache } from './utils/cache';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  search_depth: string;
}

/**
 * Performs a web search using the Tavily API
 * 
 * @param query The search query
 * @param apiKey Tavily API key
 * @param config Search configuration options
 * @returns Search results or an empty result set on failure
 */
export async function tavilySearch(query: string, apiKey: string, config: Record<string, any> = {}): Promise<TavilySearchResponse> {
  console.log(`Tavily search for: "${query}" with depth: ${config.search_depth || 'basic'}`);
  
  // Clean and validate the query
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error('Search query cannot be empty');
  }
  
  // Extra validation for Tavily API key format
  if (!apiKey || !apiKey.trim()) {
    console.warn('Tavily API key is missing or empty. Using Groq only without web search results.');
    // Return empty results rather than throwing an error to allow the system to continue with just Groq
    return {
      results: [],
      query: cleanedQuery,
      search_depth: config.search_depth || "basic"
    };
  }

  // Log region preferences for debugging
  if (config.geo_location) {
    console.log(`Using geo_location for search: ${config.geo_location}`);
  } else {
    console.log('No geo_location specified for search');
  }
  
  // Generate cache key based on query and config
  const cacheKey = {
    query: cleanedQuery,
    config: { ...config }, // Clone config to avoid references
    type: 'tavily-search'
  };
  
  // Check cache first before making API call
  // Skip cache for time-sensitive searches (time_range=day)
  const skipCache = config.time_range === 'day' || config.time_range === 'hour';
  
  if (!skipCache) {
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      console.log(`Cache hit for Tavily search: "${cleanedQuery}"`);
      return cachedResults as TavilySearchResponse;
    }
  }
  
  // Detailed debug info about the API key
  console.log(`DEBUG: Tavily API key details:`);
  console.log(`- Length: ${apiKey.length}`);
  console.log(`- First 8 chars: ${apiKey.substring(0, 8)}...`);
  console.log(`- Starts with 'tvly-': ${apiKey.startsWith('tvly-')}`);
  console.log(`- Contains whitespace: ${apiKey.includes(' ')}`);
  console.log(`- Has quotes: ${apiKey.includes('"') || apiKey.includes("'")}`);
  
  if (!apiKey.startsWith('tvly-')) {
    console.warn('Warning: Tavily API key does not have the expected format (should start with "tvly-"). API calls may fail.');
  }

  // Ensure geo_location is properly formatted
  const geoLocation = config.geo_location ? config.geo_location.toUpperCase() : null;
  if (geoLocation) {
    console.log(`Formatted geo_location for Tavily API: ${geoLocation}`);
  }
  
  try {
    // Use Bearer token authentication as it's the correct method
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`, // Use Bearer token auth
      },
      body: JSON.stringify({
        query: cleanedQuery,
        search_depth: config.search_depth || "basic",
        include_domains: config.include_domains || [],
        exclude_domains: config.exclude_domains || [],
        max_results: config.max_results || 15,
        include_answer: false,
        include_images: config.include_images !== false, // Default to true
        include_raw_content: false,
        geo_location: geoLocation, // Use the formatted location code
        time_range: config.time_range || null, // e.g. "day", "week", "month"
        // Additional filter options can be added here
      }),
    });

    if (!response.ok) {
      let errorMessage = `Tavily API error ${response.status}`;
      
      try {
        const errorBody = await response.text();
        console.error('Tavily API error details:', errorBody);
        
        // Provide specific error messages for common error codes
        if (response.status === 401) {
          console.warn('Tavily API authentication failed. Using Groq only without web search results.');
          // Return empty results rather than throwing, so Groq can still provide some answer
          return {
            results: [],
            query: cleanedQuery,
            search_depth: config.search_depth || "basic"
          };
        } else if (response.status === 429) {
          errorMessage = 'Tavily API error: Rate limit exceeded. Please try again later.';
        } else {
          errorMessage = `Tavily API error ${response.status}: ${errorBody}`;
        }
      } catch (parseError) {
        console.error('Failed to parse Tavily error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    const results = await response.json() as TavilySearchResponse;
    
    // Cache results if they're valid and not time-sensitive
    if (!skipCache && results && results.results && results.results.length > 0) {
      // Determine appropriate TTL based on search depth and time range
      let cacheTTL = 600; // Default 10 minutes
      
      if (config.search_depth === 'comprehensive') {
        cacheTTL = 1800; // 30 minutes for comprehensive searches
      } else if (config.time_range === 'week') {
        cacheTTL = 3600; // 1 hour for weekly searches
      } else if (config.time_range === 'month' || config.time_range === 'year') {
        cacheTTL = 14400; // 4 hours for monthly/yearly searches
      }
      
      searchCache.set(cacheKey, results, cacheTTL);
      console.log(`Cached Tavily search results for "${cleanedQuery}" with TTL ${cacheTTL}s`);
    }
    
    return results;
  } catch (error) {
    // Add more detailed error information
    console.error('Tavily API call failed:', error);
    
    // Instead of throwing, return empty results to allow Groq to still function
    console.warn('Tavily search failed. Using Groq only without web search results.');
    return {
      results: [],
      query: cleanedQuery,
      search_depth: config.search_depth || "basic"
    };
  }
}