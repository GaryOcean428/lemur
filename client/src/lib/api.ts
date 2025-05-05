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

export async function performSearch(query: string, filters?: SearchFilters): Promise<SearchResults> {
  try {
    // Build URL with query parameter
    let url = `/api/search?q=${encodeURIComponent(query)}`;
    
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
      
      // AI preferences
      if (filters.aiPreferences.model !== 'auto') {
        url += `&aiModel=${encodeURIComponent(filters.aiPreferences.model)}`;
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
      const text = await response.text();
      throw new Error(`Error fetching search results: ${response.status} ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in performSearch:", error);
    throw error;
  }
}
