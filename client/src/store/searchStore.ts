import { create } from 'zustand';
import { SearchResults, TraditionalResult } from '@/lib/types';

export interface SearchFilters {
  // Time filters
  timeRange: 'any' | 'past24h' | 'pastWeek' | 'pastMonth' | 'pastYear';
  
  // Source filters
  sources: {
    news: boolean;
    blogs: boolean;
    academic: boolean;
    social: boolean;
    commercial: boolean;
  };
  
  // Region/location filters
  region: 'global' | 'local' | string; // string for specific country codes
  
  // Content filters
  contentType: {
    text: boolean;
    images: boolean;
    videos: boolean;
  };
  
  // AI answer preferences
  aiPreferences: {
    model: 'auto' | 'comprehensive' | 'fast';
    detailLevel: 'concise' | 'detailed' | 'comprehensive';
    citationStyle: 'inline' | 'endnotes' | 'academic';
  };
}

export type SearchTabType = 
  | "all"      // AI + Web (default, side-by-side on large screens)
  | "ai"       // AI only
  | "web"      // Web results only
  | "research" // Deep research results (Pro users only)
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
  
  // Filters for search
  filters: SearchFilters;
  
  // Whether filter panel is visible
  isFilterPanelVisible: boolean;
  
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
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  toggleFilterPanel: () => void;
}

// Default filters
const defaultFilters: SearchFilters = {
  timeRange: 'any',
  sources: {
    news: true,
    blogs: true,
    academic: true,
    social: true,
    commercial: true,
  },
  region: 'global',
  contentType: {
    text: true,
    images: true,
    videos: true,
  },
  aiPreferences: {
    model: 'auto',
    detailLevel: 'detailed',
    citationStyle: 'inline',
  },
};

export const useSearchStore = create<SearchState>((set) => ({
  // Initial state
  currentQuery: "",
  activeTab: "all",
  isLoading: false,
  filters: defaultFilters,
  isFilterPanelVisible: false,
  
  // Empty results for all tab types
  results: {
    all: null,
    ai: null,
    web: null,
    research: null,
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
    research: false,
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
  
  setFilters: (partialFilters) => set((state) => ({
    filters: {
      ...state.filters,
      ...partialFilters,
      // Handle nested objects
      ...(partialFilters.sources && { sources: { ...state.filters.sources, ...partialFilters.sources } }),
      ...(partialFilters.contentType && { contentType: { ...state.filters.contentType, ...partialFilters.contentType } }),
      ...(partialFilters.aiPreferences && { aiPreferences: { ...state.filters.aiPreferences, ...partialFilters.aiPreferences } }),
    },
    // Reset searched tabs when filters change to force new searches
    searchedTabs: {
      all: false,
      ai: false,
      web: false,
      research: false,
      images: false,
      videos: false,
      news: false,
      shopping: false,
      social: false,
      maps: false,
      academic: false,
    }
  })),
  
  resetFilters: () => set({ 
    filters: defaultFilters,
    // Reset searched tabs when filters change
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
    }
  }),
  
  toggleFilterPanel: () => set((state) => ({
    isFilterPanelVisible: !state.isFilterPanelVisible
  })),
}));