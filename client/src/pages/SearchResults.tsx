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
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-8">
          <SearchForm initialQuery={query} />
        </div>
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-[hsl(var(--neutral-muted))]">
            {error instanceof Error ? error.message : "An error occurred while fetching search results. Please try again."}
          </p>
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
