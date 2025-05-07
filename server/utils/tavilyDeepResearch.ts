/**
 * Tavily Deep Research Integration
 * 
 * This module provides advanced research capabilities using Tavily's API
 * for Pro-tier users, enabling deeper and more comprehensive information
 * gathering beyond basic search functionality.
 */

import { searchCache } from './cache';

export interface TavilyDeepResearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  extracted_content?: string;
  source_quality?: number;
  source_type?: string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
  summary?: string;
}

export interface TavilyDeepResearchResponse {
  results: TavilyDeepResearchResult[];
  query: string;
  topic_clusters?: {
    [key: string]: string[];
  };
  estimated_analysis_depth?: string;
  research_summary?: string;
}

/**
 * Performs a deep research operation using Tavily's API
 * 
 * @param query The research query
 * @param apiKey Tavily API key
 * @param options Configuration options
 * @returns Deep research results or error information
 */
export async function tavilyDeepResearch(
  query: string, 
  apiKey: string, 
  options: {
    max_results?: number;
    topic_keywords?: string[];
    include_domains?: string[];
    exclude_domains?: string[];
    time_range?: string;
    geo_location?: string;
    include_raw_content?: boolean;
    crawl_depth?: 'shallow' | 'medium' | 'deep';
    extract_content?: boolean;
    generate_summary?: boolean;
  } = {}
): Promise<TavilyDeepResearchResponse> {
  console.log(`Tavily deep research for: "${query}" with crawl_depth: ${options.crawl_depth || 'medium'}`);
  
  // Clean and validate the query
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error('Research query cannot be empty');
  }
  
  // Validate API key
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Tavily API key is required for deep research');
  }
  
  // Generate cache key
  const cacheKey = {
    query: cleanedQuery,
    options: { ...options },
    type: 'tavily-deep-research'
  };
  
  // Check cache for time-insensitive queries
  const skipCache = options.time_range === 'day' || options.time_range === 'hour';
  if (!skipCache) {
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      console.log(`Cache hit for Tavily deep research: "${cleanedQuery}"`);
      return cachedResults as TavilyDeepResearchResponse;
    }
  }
  
  try {
    // Construct the request to Tavily's API
    // Using /crawl endpoint for the deep research functionality
    const response = await fetch("https://api.tavily.com/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        query: cleanedQuery,
        max_results: options.max_results || 10,
        topic_keywords: options.topic_keywords || [],
        include_domains: options.include_domains || [],
        exclude_domains: options.exclude_domains || [],
        time_range: options.time_range,
        geo_location: options.geo_location ? options.geo_location.toUpperCase() : undefined,
        include_raw_content: options.include_raw_content !== false,
        crawl_depth: options.crawl_depth || 'medium',
        extract_content: options.extract_content !== false,
        generate_summary: options.generate_summary !== false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }
    
    const results = await response.json() as TavilyDeepResearchResponse;
    
    // Cache the results with a longer TTL for deep research
    // Deep research is more resource-intensive so we cache longer
    if (!skipCache && results && results.results && results.results.length > 0) {
      // 1 hour cache for deep research
      const cacheTTL = 3600;
      searchCache.set(cacheKey, results, cacheTTL);
      console.log(`Cached Tavily deep research results for "${cleanedQuery}" with TTL ${cacheTTL}s`);
    }
    
    return results;
  } catch (error: any) {
    console.error('Tavily Deep Research API call failed:', error);
    // Return minimal response with error information
    return {
      results: [],
      query: cleanedQuery,
      research_summary: `Error performing deep research: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Extracts content from a specific URL using Tavily's extract API
 * 
 * @param url The URL to extract content from
 * @param apiKey Tavily API key
 * @returns The extracted content and metadata
 */
export async function tavilyExtractContent(
  url: string,
  apiKey: string
): Promise<{
  url: string;
  title: string;
  content: string;
  html?: string;
  metadata?: Record<string, any>;
  error?: string;
}> {
  if (!url || !url.trim()) {
    throw new Error('URL cannot be empty');
  }
  
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Tavily API key is required for content extraction');
  }
  
  // Generate cache key for extracted content
  const cacheKey = {
    url: url.trim(),
    type: 'tavily-extract'
  };
  
  // Check cache
  const cachedContent = searchCache.get(cacheKey);
  if (cachedContent) {
    console.log(`Cache hit for Tavily extract: "${url}"`);
    return cachedContent as any;
  }
  
  try {
    // Use Tavily's extract endpoint
    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        url: url.trim(),
        include_html: true,
        include_metadata: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        url: url,
        title: 'Error',
        content: '',
        error: `Tavily Extract API error: ${response.status} - ${errorText}`
      };
    }
    
    const result = await response.json();
    
    // Cache extracted content for 1 day (86400 seconds)
    searchCache.set(cacheKey, result, 86400);
    console.log(`Cached Tavily extract results for "${url}"`);
    
    return result;
  } catch (error: any) {
    console.error('Tavily Extract API call failed:', error);
    return {
      url: url,
      title: 'Error',
      content: '',
      error: `Failed to extract content: ${error.message || 'Unknown error'}`
    };
  }
}