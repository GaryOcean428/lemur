/**
 * API utility functions for external services
 * This module centralizes API calls to Groq and Tavily to reduce code duplication
 */

import { SearchResult } from '../directCompound';

/**
 * Makes an API request to Tavily's search API
 * @param query The search query
 * @param tavilyApiKey Tavily API key
 * @param filters Search filters (time_range, geo_location, etc.)
 * @returns Promise resolving to search results or null if the request fails
 */
export async function tavilySearchRequest(
  query: string,
  tavilyApiKey: string,
  filters: Record<string, any> = {}
): Promise<{ results: SearchResult[]; query: string; search_depth: string } | null> {
  try {
    if (!tavilyApiKey || tavilyApiKey.trim() === '') {
      console.error('Missing Tavily API key');
      return null;
    }

    const searchApiUrl = 'https://api.tavily.com/search';
    const searchHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tavilyApiKey}`
    };
    
    const searchRequestBody: Record<string, any> = {
      query,
      search_depth: filters.search_depth || "basic",
      max_results: filters.max_results || 10,
    };
    
    // Add optional parameters if present
    if (filters.include_domains && filters.include_domains.length > 0) {
      searchRequestBody.include_domains = filters.include_domains;
    }
    
    if (filters.exclude_domains && filters.exclude_domains.length > 0) {
      searchRequestBody.exclude_domains = filters.exclude_domains;
    }
    
    if (filters.time_range) {
      searchRequestBody.time_range = filters.time_range;
    }
    
    if (filters.geo_location) {
      searchRequestBody.geo_location = filters.geo_location;
    }

    if (filters.include_images !== undefined) {
      searchRequestBody.include_images = filters.include_images;
    }
    
    const searchResponse = await fetch(searchApiUrl, {
      method: 'POST',
      headers: searchHeaders,
      body: JSON.stringify(searchRequestBody)
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText}`, errorText);
      return null;
    }
    
    const searchData = await searchResponse.json();
    return searchData;
  } catch (error) {
    console.error('Error in Tavily search request:', error);
    return null;
  }
}

/**
 * Makes an API request to Groq's Chat Completions API
 * @param messages Array of message objects to send to Groq
 * @param groqApiKey Groq API key
 * @param model Model to use (e.g., 'compound-beta', 'compound-beta-mini')
 * @param temperature Temperature for response generation (0-1)
 * @param tools Optional tools array for function calling
 * @returns Promise resolving to the API response or throws an error
 */
export async function groqChatRequest(
  messages: Array<{role: string; content: string}>,
  groqApiKey: string,
  model: string = "compound-beta",
  temperature: number = 0.3,
  tools?: any[],
  toolChoice: string = "auto"
): Promise<any> {
  try {
    if (!groqApiKey || groqApiKey.trim() === '') {
      throw new Error('Missing Groq API key. Please make sure the GROQ_API_KEY environment variable is set.');
    }
    
    // Check if Groq API key seems valid (basic format check)
    if (!groqApiKey.startsWith('gsk_')) {
      console.warn('Warning: Groq API key does not have the expected format (should start with "gsk_"). API calls may fail.');
    }
    
    // Prepare API request body based on whether tools are provided
    const requestBody = tools ? {
      model,
      messages,
      temperature,
      tools,
      tool_choice: toolChoice
    } : {
      model,
      messages,
      temperature
    };
    
    console.log(`Making API request with${tools ? '' : 'out'} tools to Groq API using model: ${model}`);
    
    // Make the API request to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'Groq API error: Invalid or expired API key. Please update your API key.';
      } else if (response.status === 429) {
        errorMessage = 'Groq API error: Rate limit exceeded. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = `Groq API error: Model '${model}' not found or unavailable.`;
      } else {
        const errorBody = await response.text();
        console.error('Groq API error details:', errorBody);
        errorMessage = `Groq API error: ${response.status}. Details: ${errorBody}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
}

/**
 * Extract sources from Groq response based on citations in the text
 * @param answer The answer text from Groq
 * @returns Object containing sources and search results
 */
export function extractSourcesFromText(answer: string): { sources: Array<{title: string; url: string; domain: string}>; searchResults: SearchResult[] } {
  // Check if there are citations in markdown format [1]: https://example.com
  const citationRegex = /\[([0-9]+)\]:\s*(https?:\/\/[^\s]+)\s*(?:"([^"]+)")?/g;
  const inTextCitationRegex = /\[([0-9]+)\](?![:\[])/g;
  const citationUsage = new Map<string, number>();
  const citationMap = new Map<string, {title: string; url: string; domain: string}>();
  let searchResults: SearchResult[] = [];
  
  // Find all in-text citations and count them
  let inTextMatch;
  while ((inTextMatch = inTextCitationRegex.exec(answer)) !== null) {
    const num = inTextMatch[1];
    citationUsage.set(num, (citationUsage.get(num) || 0) + 1);
  }
  
  // Extract all citation references
  let citation;
  while ((citation = citationRegex.exec(answer)) !== null) {
    const number = citation[1];
    const url = citation[2];
    let title = citation[3] || "";
    
    // If no title, extract domain as title
    if (!title) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        title = domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (e) {
        title = "Reference " + number;
      }
    }
    
    // Get usage count, default to 1 if not found
    const usageCount = citationUsage.get(number) || 1;
    
    const source = {
      title,
      url,
      domain: new URL(url).hostname.replace('www.', '')
    };
    
    citationMap.set(number, source);
    
    // Also add to search results with placeholder content and usage count
    searchResults.push({
      title,
      url,
      content: `Source ${number} cited ${usageCount} time${usageCount !== 1 ? 's' : ''} in the answer`,
      score: usageCount // Use citation frequency as relevance score
    });
  }
  
  // Convert the map to an array for sources
  const sources = Array.from(citationMap.values());
  
  return { sources, searchResults };
}
