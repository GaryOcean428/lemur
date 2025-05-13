import { SearchResults } from "./types";
import { SearchFilters } from "@/store/searchStore";

// Debounce helper function to limit API calls
function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<F>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Function to get search suggestions as user types
export async function fetchSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      console.error(`Error fetching suggestions: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error("Error in fetchSearchSuggestions:", error);
    return [];
  }
}

// Debounced version of the search suggestions function to prevent excessive API calls
export const debouncedFetchSearchSuggestions = debounce(fetchSearchSuggestions, 300);

// Function to perform search using direct Groq Compound Beta integration
export async function performDirectSearch(query: string, isFollowUp: boolean = false, filters?: SearchFilters | null): Promise<SearchResults> {
  try {
    // Build URL with query parameter
    let url = `/api/direct-search?q=${encodeURIComponent(query)}`;
    
    // Add follow-up parameter if applicable
    if (isFollowUp) {
      url += `&isFollowUp=true`;
    }
    
    // Add filter parameters if provided
    if (filters) {
      // Region filter
      if (filters.region !== 'global') {
        url += `&region=${encodeURIComponent(filters.region)}`;
      }
      
      // AI preferences - use 'model' parameter to match server-side implementation
      if (filters.aiPreferences.model !== 'auto') {
        url += `&model=${encodeURIComponent(filters.aiPreferences.model)}`;
      }
    }
    
    // Make the API request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      // Clone the response before trying to read it
      const responseClone = response.clone();
      
      // Try to parse the response as JSON first
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Unknown error';
        
        // Special handling for subscription limit errors
        if (response.status === 403 && errorData.limitReached) {
          // Return a friendly user message instead of an error
          return {
            ai: {
              answer: errorData.authRequired 
                ? "You've reached your free search limit. Please sign in or create an account to continue searching." 
                : "You've reached your subscription limit. Please upgrade your subscription to continue searching.",
              sources: [],
              model: "limit-reached",
              contextual: false
            },
            traditional: [],
            searchType: "direct",
            limitReached: true,
            authRequired: !!errorData.authRequired
          } as SearchResults;
        }
      } catch (parseError) {
        // If parsing fails, fall back to text from the cloned response
        try {
          const text = await responseClone.text();
          errorMessage = text;
        } catch (textError) {
          errorMessage = `${response.status} ${response.statusText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as SearchResults;
  } catch (error) {
    console.error("Error in performDirectSearch:", error);
    throw error;
  }
}

export interface ResearchOptions {
  maxIterations?: number;
  includeReasoning?: boolean;
  deepDive?: boolean;
  searchContextSize?: 'low' | 'medium' | 'high';
}

export async function performSearch(
  query: string, 
  searchType: string = 'all', 
  filters?: SearchFilters | null, 
  deepResearch: boolean = false,
  isFollowUp: boolean = false,
  researchOptions?: ResearchOptions
): Promise<SearchResults> {
  try {
    // Build URL with query parameter and search type
    let url = `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}`;
    
    // Add follow-up parameter if applicable
    if (isFollowUp) {
      url += `&isFollowUp=true`;
    }
    
    // Add deep research parameter if specified
    if (deepResearch) {
      url += `&deepResearch=true`;
      
      // Add advanced research options if provided
      if (researchOptions) {
        if (researchOptions.maxIterations !== undefined) {
          url += `&maxIterations=${researchOptions.maxIterations}`;
        }
        if (researchOptions.includeReasoning !== undefined) {
          url += `&includeReasoning=${researchOptions.includeReasoning}`;
        }
        if (researchOptions.deepDive !== undefined) {
          url += `&deepDive=${researchOptions.deepDive}`;
        }
        if (researchOptions.searchContextSize !== undefined) {
          url += `&searchContextSize=${researchOptions.searchContextSize}`;
        }
      }
    }
    
    // Add filter parameters if provided
    if (filters) {
      // Time range filter
      if (filters.timeRange !== 'any') {
        url += `&timeRange=${encodeURIComponent(filters.timeRange)}`;
      }
      
      // Region filter
      if (filters.region !== 'global') {
        url += `&region=${encodeURIComponent(filters.region)}`;
      }
      
      // Source filters - only add if not all sources are enabled
      const allSourcesEnabled = Object.values(filters.sources).every(value => value === true);
      if (!allSourcesEnabled) {
        // Add each enabled source
        const enabledSources = Object.entries(filters.sources)
          .filter(([_, enabled]) => enabled)
          .map(([source]) => source);
        
        if (enabledSources.length > 0) {
          url += `&sources=${encodeURIComponent(enabledSources.join(','))}`;
        }
      }
      
      // Content type filters - only add if not all content types are enabled
      const allContentTypesEnabled = Object.values(filters.contentType).every(value => value === true);
      if (!allContentTypesEnabled) {
        // Add each enabled content type
        const enabledContentTypes = Object.entries(filters.contentType)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type);
        
        if (enabledContentTypes.length > 0) {
          url += `&contentTypes=${encodeURIComponent(enabledContentTypes.join(','))}`;
        }
      }
      
      // AI preferences - use 'model' parameter to match server-side implementation
      if (filters.aiPreferences.model !== 'auto') {
        url += `&model=${encodeURIComponent(filters.aiPreferences.model)}`;
      }
      
      if (filters.aiPreferences.detailLevel !== 'detailed') {
        url += `&aiDetailLevel=${encodeURIComponent(filters.aiPreferences.detailLevel)}`;
      }
      
      if (filters.aiPreferences.citationStyle !== 'inline') {
        url += `&aiCitationStyle=${encodeURIComponent(filters.aiPreferences.citationStyle)}`;
      }
    }
    
    // Make the API request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      // Clone the response before trying to read it
      const responseClone = response.clone();
      
      // Try to parse the response as JSON first
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Unknown error';
        
        // Special handling for subscription limit errors
        if (response.status === 403 && errorData.limitReached) {
          // Return a friendly user message instead of an error
          return {
            ai: {
              answer: errorData.authRequired 
                ? "You've reached your free search limit. Please sign in or create an account to continue searching." 
                : "You've reached your subscription limit. Please upgrade your subscription to continue searching.",
              sources: [],
              model: "limit-reached",
              contextual: false
            },
            traditional: [],
            searchType: "all",
            limitReached: true,
            authRequired: !!errorData.authRequired
          } as SearchResults;
        }
      } catch (parseError) {
        // If parsing fails, fall back to text from the cloned response
        try {
          const text = await responseClone.text();
          errorMessage = text;
          
          // Handle specific API errors for better user experience
          if (response.status === 500 || response.status === 503) {
            // Detect Tool usage errors
            if (text.includes('isToolError') || text.includes('tool') && text.includes('error')) {
              console.error("Tool usage error detected:", text);
              
              // Use the traditional search result fallback option if available
              try {
                // For tool errors, try to resubmit the search without tools
                const data = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}&disableTools=true`).then(r => r.json());
                if (data) {
                  console.log("Successfully retrieved results without tools");
                  return data as SearchResults;
                }
              } catch (fallbackError) {
                console.error("Failed to perform search without tools:", fallbackError);
                
                // If the no-tools search fails, try traditional search as last resort
                try {
                  const traditionalData = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=traditional`).then(r => r.json());
                  if (traditionalData && traditionalData.traditional && traditionalData.traditional.results) {
                    return {
                      query: query,
                      traditional: traditionalData.traditional.results,
                      ai: {
                        answer: "I couldn't use the AI search tools for this query. Here are the traditional search results instead.",
                        model: "error-fallback",
                        sources: [],
                        contextual: false
                      },
                      serviceStatus: {
                        groq: "limited",
                        tavily: "available"
                      }
                    } as SearchResults;
                  }
                } catch (traditionalFallbackError) {
                  console.error("Failed to get traditional search fallback:", traditionalFallbackError);
                }
              }
              
              throw new Error('There was an issue with the AI tools for this search. Please try a different query or try again later.');
            }
            
            // Detect other Groq API errors
            if (text.includes('Groq API error') || text.includes('Bad Gateway') || text.includes('Service Unavailable') || text.includes('Groq API service unavailable')) {
              console.error("Groq service error detected:", text);
              
              // Use the traditional search result fallback option if available
              try {
                const data = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=traditional`).then(r => r.json());
                if (data && data.traditional && data.traditional.results) {
                  return {
                    query: query,
                    traditional: data.traditional.results,
                    ai: { // Changed 'enhanced' to 'ai' to match SearchResults interface
                      answer: "I encountered an error while processing your search. Please try again later.",
                      model: "error-fallback",
                      sources: [],
                      contextual: false
                    },
                    serviceStatus: {
                      groq: "unavailable",
                      tavily: "available"
                    }
                  } as SearchResults;
                }
              } catch (fallbackError) {
                console.error("Failed to get traditional search fallback:", fallbackError);
              }
              
              throw new Error('Our AI service is temporarily unavailable. Traditional search results may still be available.');
            }
            // Detect Tavily API errors
            if (text.includes('Tavily API error')) {
              throw new Error('Our search service is temporarily unavailable. Please try again later.');
            }
          }
        } catch (textError) {
          errorMessage = 'Could not read error response';
        }
      }
      
      throw new Error(`Error fetching search results: ${response.status} ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in performSearch:", error);
    throw error;
  }
}
