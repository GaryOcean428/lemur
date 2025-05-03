import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/SearchForm";
import AIAnswer from "@/components/AIAnswer";
import { performSearch } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
      <div className="max-w-5xl mx-auto">
        {/* Search Form */}
        <div className="mb-8">
          <SearchForm initialQuery={query} />
        </div>
        
        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]" />
            <p className="mt-4 text-[hsl(var(--neutral-muted))] text-center">Searching for "{query}"...</p>
          </div>
        ) : (
          <div className="w-full">
            {/* AI Answer Section */}
            {data?.ai && (
              <AIAnswer
                answer={data.ai.answer}
                sources={data.ai.sources}
                model={data.ai.model}
              />
            )}

            {/* Traditional Results */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Web Results</h2>
              {data?.traditional && data.traditional.map((result, index) => (
                <div key={index} className="mb-4 p-4 bg-white shadow-sm rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-xs text-gray-500 mb-1">{result.domain}</div>
                  <h3 className="text-[hsl(var(--primary))] hover:underline font-medium mb-1">
                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                      {result.title}
                    </a>
                  </h3>
                  <p className="text-sm text-gray-700">{result.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}