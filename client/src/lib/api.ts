import { SearchResults } from "./types";

export async function performSearch(query: string): Promise<SearchResults> {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
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
