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
    
    return await response.json();
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
      url += `&followUp=true`;
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

export async function performSearch(query: string, searchType: string = 'all', filters?: SearchFilters | null): Promise<SearchResults> {
  try {
    // Build URL with query parameter and search type
    let url = `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(searchType)}`;
    
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
          if (response.status === 500) {
            // Detect Groq API errors
            if (text.includes('Groq API error') || text.includes('Bad Gateway')) {
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
