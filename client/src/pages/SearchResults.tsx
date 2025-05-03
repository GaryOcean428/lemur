import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import LoadingState from "@/components/LoadingState";
import ResultsTabs from "@/components/ResultsTabs";
import AIAnswer from "@/components/AIAnswer";
import TraditionalResults from "@/components/TraditionalResults";
import SponsoredResult from "@/components/SponsoredResult";
import SearchResultsHeader from "@/components/SearchResultsHeader";
import { performSearch } from "@/lib/api";

type SearchTab = "ai" | "traditional" | "all";

export default function SearchResults() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<SearchTab>("ai");

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
      } else if (error.message.includes("500")) {
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
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-neutral mb-4">{errorMessage}</h2>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            {errorDetail}
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-5 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto mb-8">
        <SearchForm initialQuery={query} />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div id="search-results" className="mt-8">
          <SearchResultsHeader query={query} resultCount={data?.traditional.length || 0} />
          
          <ResultsTabs activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Column (AI Answer + Sponsored on mobile) */}
              <div className="lg:col-span-2">
                {/* Only show AI Answer in AI or All tabs */}
                {(activeTab === "ai" || activeTab === "all") && data?.ai && (
                  <AIAnswer 
                    answer={data.ai.answer} 
                    sources={data.ai.sources} 
                    model={data.ai.model} 
                  />
                )}
                
                {/* Sponsored Result */}
                <SponsoredResult />
                
                {/* Mobile Traditional Results (Only in All tab) */}
                {activeTab === "all" && (
                  <div className="lg:hidden">
                    <TraditionalResults results={data?.traditional?.slice(0, 3) || []} />
                  </div>
                )}

                {/* Traditional Results Tab (Mobile Only) */}
                {activeTab === "traditional" && (
                  <div className="lg:hidden">
                    <TraditionalResults results={data?.traditional || []} />
                  </div>
                )}
              </div>
              
              {/* Secondary Column (Traditional Results on Desktop) */}
              {(activeTab === "all" || activeTab === "traditional") && (
                <div className="hidden lg:block">
                  <TraditionalResults results={data?.traditional || []} />
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {(data?.traditional?.length || 0) > 5 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-1">
                  <button className="px-3 py-1 text-sm rounded border border-[hsl(var(--neutral-light))] bg-white text-[hsl(var(--neutral-muted))] hover:border-primary hover:text-primary transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1 text-sm rounded border border-primary bg-primary text-white">
                    1
                  </button>
                  <button className="px-3 py-1 text-sm rounded border border-[hsl(var(--neutral-light))] bg-white text-[hsl(var(--neutral-muted))] hover:border-primary hover:text-primary transition-colors">
                    2
                  </button>
                  <button className="px-3 py-1 text-sm rounded border border-[hsl(var(--neutral-light))] bg-white text-[hsl(var(--neutral-muted))] hover:border-primary hover:text-primary transition-colors">
                    3
                  </button>
                  <span className="px-2 text-[hsl(var(--neutral-muted))]">...</span>
                  <button className="px-3 py-1 text-sm rounded border border-[hsl(var(--neutral-light))] bg-white text-[hsl(var(--neutral-muted))] hover:border-primary hover:text-primary transition-colors">
                    10
                  </button>
                  <button className="px-3 py-1 text-sm rounded border border-[hsl(var(--neutral-light))] bg-white text-[hsl(var(--neutral-muted))] hover:border-primary hover:text-primary transition-colors">
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
