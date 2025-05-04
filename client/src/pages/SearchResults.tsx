import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/SearchForm";
import SearchTabs from "@/components/SearchTabs";
import { performSearch } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function SearchResults() {
  const [, setLocation] = useLocation();

  // Get the search query from URL
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";

  // If no query, redirect to home
  if (!query) {
    setLocation("/");
    return null;
  }

  // Fetch search results
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/search', query],
    queryFn: () => performSearch(query),
  });

  if (error) {
    let errorMessage = "An error occurred while fetching search results. Please try again."; 
    let errorDetail = "";
    
    if (error instanceof Error) {
      if (error.message.includes("401 Unauthorized")) {
        errorMessage = "API authorization error"; 
        errorDetail = "The search service is currently unavailable due to API key issues. Please try again later or contact support.";
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
          <Button onClick={() => window.location.reload()} className="mr-2">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Search Form */}
        <div className="mb-8">
          <SearchForm initialQuery={query} />
        </div>
        
        {/* Search Tabs with All Results */}
        <SearchTabs data={data} query={query} isLoading={isLoading} />
      </div>
    </div>
  );
}