import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/SearchForm";
import SearchTabs from "@/components/SearchTabs";
import SearchFiltersPanel from "@/components/SearchFilters";
import { performSearch } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";
import { useEffect } from "react";

export default function SearchResults() {
  const [, setLocation] = useLocation();
  const { setIsLoading } = useSearchStore();

  // Get the search query from URL
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";

  // If no query, redirect to home
  if (!query) {
    setLocation("/");
    return null;
  }

  // Get filters from search store
  const { filters } = useSearchStore();
  
  // Fetch search results with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/search', query, filters],
    queryFn: () => performSearch(query, 'all', filters),
  });
  
  // Update global loading state
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

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
            <div>
              <SearchFiltersPanel />
            </div>
          </div>
        </div>
        
        {/* Search Tabs with All Results */}
        <SearchTabs data={data} query={query} isLoading={isLoading} />
      </div>
    </div>
  );
}