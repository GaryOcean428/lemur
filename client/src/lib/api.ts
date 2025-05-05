import { SearchResults } from "./types";
import { SearchFilters } from "@/store/searchStore";

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
