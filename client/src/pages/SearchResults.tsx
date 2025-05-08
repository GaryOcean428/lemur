import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/SearchForm";
import SearchTabs from "@/components/SearchTabs";
import SearchFiltersPanel from "@/components/SearchFilters";
import SearchInsightsPanel from "@/components/SearchInsightsPanel";
import { performSearch, performDirectSearch } from "@/lib/api";
import { AlertTriangle, Eye } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function SearchResults() {
  const [, setLocation] = useLocation();
  const { setIsLoading } = useSearchStore();
  const [useDirectSearch, setUseDirectSearch] = useState(true); // Default to using direct search
  const [authRequired, setAuthRequired] = useState(false); // Track if authentication is required
  const [showInsightsPanel, setShowInsightsPanel] = useState(false); // Control insights panel visibility
  const { user } = useAuth(); // Get current user from auth context

  // Get the search query from URL
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  const isFollowUp = params.get("isFollowUp") === "true";
  const deepResearch = params.get("deepResearch") === "true";

  // If no query, redirect to home
  if (!query) {
    setLocation("/");
    return null;
  }

  // Get filters from search store
  const { filters } = useSearchStore();
  
  // Fetch search results with the optimal search method
  const { data, isLoading, error } = useQuery({
    queryKey: [useDirectSearch ? '/api/direct-search' : '/api/search', query, filters, isFollowUp, deepResearch],
    queryFn: () => {
      // Deep research is only for pro users and follows a different path
      if (deepResearch && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer')) {
        // If deep research is enabled, we use the regular search API with the deepResearch parameter
        return performSearch(query, 'all', filters, deepResearch, isFollowUp);
      }
      // Otherwise use normal search flow
      else if (useDirectSearch) {
        // Try direct search first for better performance
        return performDirectSearch(query, isFollowUp, filters)
          .catch(error => {
            console.error("Direct search failed, falling back to traditional search:", error);
            // If direct search fails, fall back to traditional search
            setUseDirectSearch(false);
            // Let the error propagate to trigger a re-fetch with the new queryKey
            throw error;
          });
      } else {
        // Fall back to traditional search pipeline
        return performSearch(query, 'all', filters, false, isFollowUp);
      }
    },
    retry: (failureCount, error) => {
      // Only retry if we're falling back from direct to traditional search
      return failureCount < 1 && !useDirectSearch;
    }
  });
  
  // Update global loading state and show insights panel during search
  useEffect(() => {
    setIsLoading(isLoading);
    
    // Show insights panel when loading starts
    if (isLoading) {
      setShowInsightsPanel(true);
    }
  }, [isLoading, setIsLoading]);
  
  // Handle authRequired flag from API responses
  useEffect(() => {
    if (data && 'authRequired' in data && data.authRequired) {
      setAuthRequired(true);
    }
    
    // Hide insights panel when results arrive (with a slight delay)
    if (data && !isLoading) {
      const timer = setTimeout(() => {
        setShowInsightsPanel(false);
      }, 1000); // Keep open 1 second after results arrive for a smooth transition
      
      return () => clearTimeout(timer);
    }
  }, [data, isLoading]);

  if (error) {
    let errorMessage = "An error occurred while fetching search results. Please try again."; 
    let errorDetail = "";
    let isSubscriptionLimitError = false;
    
    if (error instanceof Error) {
      // Check for subscription limit error (403 with limitReached flag)
      if (error.message.includes("403") && 
          (error.message.includes("search limit") || 
           error.message.includes("Please sign in"))) {
        isSubscriptionLimitError = true;
        
        if (error.message.includes("Please sign in")) {
          errorMessage = "Sign in to continue searching";
          errorDetail = "You've reached the limit for anonymous searches. Create a free account to continue.";
          setAuthRequired(true); // Set the authRequired flag for anonymous users
        } else {
          errorMessage = "Search limit reached";
          errorDetail = "You've reached your limit of free searches. Upgrade to continue searching with Lemur.";
        }
      } else if (error.message.includes("401 Unauthorized")) {
        errorMessage = "API authorization error"; 
        errorDetail = "The search service is currently unavailable due to API key issues. Please try again later or contact support.";
      } else if (error.message.includes("AI service is temporarily unavailable")) {
        errorMessage = "AI service unavailable";
        errorDetail = "We're currently experiencing issues with our AI service. Search results are still available.";
      } else if (error.message.includes("search service is temporarily unavailable")) {
        errorMessage = "Search service error";
        errorDetail = "Our search service is temporarily unavailable. Please try again in a few minutes.";
      } else if (error.message.includes("500") || error.message.includes("400")) {
        errorMessage = "Search service error";
        errorDetail = "Our search service is experiencing technical difficulties. Please try again later.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-8">
          <SearchForm initialQuery={query} />
        </div>
        <div className="max-w-3xl mx-auto text-center py-10 bg-white rounded-xl shadow-md p-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-50 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{errorMessage}</h2>
          {errorDetail && <p className="text-gray-600 mb-6">{errorDetail}</p>}
          {isSubscriptionLimitError ? (
            <>
              <Button onClick={() => setLocation("/auth")} className="mr-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]">
                Sign In
              </Button>
              <Button variant="outline" onClick={() => setLocation("/subscription")}>
                Upgrade Plan
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => window.location.reload()} className="mr-2">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Return Home
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Search Form and Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-grow">
              <SearchForm initialQuery={query} />
            </div>
            <div className="flex items-center gap-2">
              {/* View Insights button */}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowInsightsPanel(true)}
                className="flex items-center gap-1"
                title="View search insights"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Insights</span>
              </Button>
              <SearchFiltersPanel />
            </div>
          </div>
        </div>
        
        {/* Search Tabs with All Results */}
        <SearchTabs data={data} query={query} isLoading={isLoading} isFollowUp={isFollowUp} authRequired={authRequired} />
        
        {/* Real-time Search Insights Panel */}
        <SearchInsightsPanel 
          isOpen={showInsightsPanel}
          onOpenChange={setShowInsightsPanel}
          query={query}
          isDeepResearch={deepResearch}
        />
      </div>
    </div>
  );
}