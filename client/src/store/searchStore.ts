import { create } from 'zustand';
import { SearchResults, TraditionalResult } from '@/lib/types';

export type SearchTabType = 
  | "all"      // AI + Web (default, side-by-side on large screens)
  | "ai"       // AI only
  | "web"      // Web results only
  | "images"   // Image search results
  | "videos"   // Video search results
  | "news"     // News results
  | "shopping" // Shopping results
  | "social"   // Forums/Social results
  | "maps"     // Map results
  | "academic"; // Academic/peer-reviewed research

interface SearchState {
  // Current state
  currentQuery: string;
  activeTab: SearchTabType;
  isLoading: boolean;
  
  // Search results by type
  results: {
    all: SearchResults | null;
    ai: SearchResults | null;
    web: SearchResults | null;
    images: SearchResults | null;
    videos: SearchResults | null;
    news: SearchResults | null;
    shopping: SearchResults | null;
    social: SearchResults | null;
    maps: SearchResults | null;
    academic: SearchResults | null;
  };
  
  // Tracked searched tabs to avoid redundant API calls
  searchedTabs: Record<SearchTabType, boolean>;
  
  // Actions
  setCurrentQuery: (query: string) => void;
  setActiveTab: (tab: SearchTabType) => void;
  setIsLoading: (loading: boolean) => void;
  setResults: (tabType: SearchTabType, results: SearchResults) => void;
  setSearchedTab: (tabType: SearchTabType, searched: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  // Initial state
  currentQuery: "",
  activeTab: "all",
  isLoading: false,
  
  // Empty results for all tab types
  results: {
    all: null,
    ai: null,
    web: null,
    images: null,
    videos: null,
    news: null,
    shopping: null,
    social: null,
    maps: null,
    academic: null,
  },
  
  // No tabs have been searched yet
  searchedTabs: {
    all: false,
    ai: false,
    web: false,
    images: false,
    videos: false,
    news: false,
    shopping: false,
    social: false,
    maps: false,
    academic: false,
  },
  
  // Actions to update state
  setCurrentQuery: (query) => set({ currentQuery: query }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setResults: (tabType, results) => set((state) => ({
    results: {
      ...state.results,
      [tabType]: results
    }
  })),
  
  setSearchedTab: (tabType, searched) => set((state) => ({
    searchedTabs: {
      ...state.searchedTabs,
      [tabType]: searched
    }
  })),
}));