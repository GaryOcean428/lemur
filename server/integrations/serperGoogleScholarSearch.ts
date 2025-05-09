/**
 * Serper Google Scholar Search Integration Module
 * 
 * Provides a utility function for making API calls to Serper.dev Google Scholar API
 * with error handling and caching.
 */

import { searchCache } from "../utils/cache"; // Assuming cache utility is in server/utils/cache.ts
import fetch from "node-fetch";

export interface ScholarResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  publication_info?: {
    summary?: string;
    authors?: { name: string; link?: string }[];
  };
  resources?: { title: string; link: string; file_format?: string }[];
  inline_links?: {
    cited_by?: { total: number; link: string; serpapi_scholar_link?: string; snippet?: string };
    related_pages_link?: string;
    versions?: { total: number; link: string; serpapi_scholar_link?: string; snippet?: string };
  };
  cited_by?: number; // Simplified from inline_links for easier access
  year?: number; // Often part of publication_info.summary, might need extraction
}

export interface SerperGoogleScholarSearchResponse {
  searchParameters: {
    q: string;
    engine: string;
    [key: string]: any;
  };
  organicResults: ScholarResult[];
  // Add other fields from Serper response if needed, like pagination, relatedSearches etc.
}

/**
 * Performs a Google Scholar search using the Serper.dev API
 * 
 * @param query The search query
 * @param apiKey Serper API key
 * @param config Search configuration options (e.g., num results, page)
 * @returns Search results or an empty result set on failure
 */
export async function serperGoogleScholarSearch(
  query: string, 
  apiKey: string, 
  config: Record<string, any> = {}
): Promise<SerperGoogleScholarSearchResponse> {
  console.log(`Serper Google Scholar search for: "${query}"`);

  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error("Search query cannot be empty");
  }

  if (!apiKey || !apiKey.trim()) {
    console.warn("Serper API key is missing or empty. Academic search will fail.");
    return {
      searchParameters: { q: cleanedQuery, engine: "google_scholar" },
      organicResults: [],
    };
  }

  const cacheKey = {
    query: cleanedQuery,
    config: { ...config },
    engine: "google_scholar",
    type: "serper-scholar-search",
  };

  const cachedResults = searchCache.get(cacheKey);
  if (cachedResults) {
    console.log(`Cache hit for Serper Google Scholar search: "${cleanedQuery}"`);
    return cachedResults as SerperGoogleScholarSearchResponse;
  }

  const numResults = config.num_results || 10;
  const page = config.page || 1;

  try {
    const response = await fetch("https://google.serper.dev/scholar", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: cleanedQuery,
        num: numResults,
        page: page,
        // Add other Serper specific parameters if needed, e.g. "as_ylo" (year low), "as_yhi" (year high)
      }),
    });

    if (!response.ok) {
      let errorMessage = `Serper API error ${response.status}`;
      try {
        const errorBody = await response.text();
        console.error("Serper API error details:", errorBody);
        if (response.status === 401) {
          errorMessage = "Serper API authentication failed. Check your API key.";
        } else if (response.status === 402) {
          errorMessage = "Serper API request failed, usually due to lack of credits or plan limit exceeded.";
        } else if (response.status === 429) {
          errorMessage = "Serper API error: Rate limit exceeded. Please try again later.";
        } else {
          errorMessage = `Serper API error ${response.status}: ${errorBody}`;
        }
      } catch (parseError) {
        console.error("Failed to parse Serper error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const results = await response.json() as SerperGoogleScholarSearchResponse;

    // Post-process results if needed (e.g., extract year, simplify cited_by)
    if (results.organicResults) {
      results.organicResults = results.organicResults.map(r => {
        let year;
        if (r.publication_info?.summary) {
          const yearMatch = r.publication_info.summary.match(/\b(\d{4})\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
        }
        return {
          ...r,
          cited_by: r.inline_links?.cited_by?.total,
          year: year,
        };
      });
    }

    // Cache results
    const cacheTTL = 1800; // 30 minutes for academic searches
    searchCache.set(cacheKey, results, cacheTTL);
    console.log(`Cached Serper Google Scholar results for "${cleanedQuery}" with TTL ${cacheTTL}s`);

    return results;

  } catch (error) {
    console.error("Serper API call failed:", error);
    // Return empty results to allow the system to continue gracefully
    return {
      searchParameters: { q: cleanedQuery, engine: "google_scholar" },
      organicResults: [],
    };
  }
}

