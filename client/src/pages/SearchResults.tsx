import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/SearchForm";
import LoadingState from "@/components/LoadingState";
import AIAnswer from "@/components/AIAnswer";
import TraditionalResults from "@/components/TraditionalResults";
import SponsoredResult from "@/components/SponsoredResult";
import { performSearch } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M30 40 Q 20 20 40 15 Q 45 15 45 25 L 45 35 Q 45 40 40 42 Q 25 48 30 40 Z" fill="#4B2A91" />
            <circle cx="23" cy="38" r="3" fill="#FF9BB3" />
            <path d="M75 40 Q 85 60 65 65 Q 60 65 60 55 L 60 45 Q 60 40 65 38 Q 80 32 75 40 Z" fill="#FFB6D9" />
            <path d="M40 42 Q 50 60 60 45" stroke="#4B2A91" strokeWidth="3" fill="none" />
            <circle cx="77" cy="62" r="3" fill="#4B2A91" />
            <path d="M55 55 Q 65 75 75 65" stroke="#8FDFD9" strokeWidth="9" fill="none" />
            <path d="M55 55 Q 65 75 75 65" stroke="#4B2A91" strokeWidth="3" fill="none" />
          </svg>
        </div>
        <div className="w-full max-w-3xl">
          <SearchForm initialQuery={query} />
        </div>
      </div>

      <div className="mt-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 bg-transparent space-x-2">
            <TabsTrigger value="all" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              All
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              AI Answer
            </TabsTrigger>
            <TabsTrigger value="web" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              Web Results
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              News
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              Images
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]" />
              <p className="mt-4 text-[hsl(var(--neutral-muted))] text-center">Searching for "{query}"...</p>
            </div>
          ) : (
            <div className="w-full">
              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    {data?.ai && (
                      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-sm text-[hsl(var(--primary))] font-semibold">AI Answer</h2>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {data.ai.model}
                          </span>
                        </div>
                        <div className="prose max-w-none text-gray-700">
                          {data.ai.answer}
                        </div>
                        {data.ai.sources && data.ai.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">Sources:</p>
                            <div className="flex flex-wrap gap-2">
                              {data.ai.sources.map((source, index) => (
                                <a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition-colors"
                                >
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 flex justify-end gap-2">
                          <Button size="sm" variant="outline">
                            Copy
                          </Button>
                          <Button size="sm" variant="outline">
                            Save
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 mb-6">
                        <p className="font-medium text-amber-800 mb-1">Renewable Energy Solutions for Your Home - Special Offer</p>
                        <p className="text-sm text-amber-700 mb-2">Upgrade to solar power with our special 2023 tax rebate offer. Save up to 30% on installation and reduce your energy bills.</p>
                        <a href="#" className="text-xs text-amber-600">www.greenpower-solutions.com/special-offer</a>
                        <span className="ml-4 text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">Sponsored</span>
                      </div>
                      
                      {/* Traditional Results */}
                      {data?.traditional && data.traditional.slice(0, 4).map((result, index) => (
                        <div key={index} className="mb-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
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
                  
                  <div className="hidden lg:block">
                    {data?.traditional && data.traditional.slice(4).map((result, index) => (
                      <div key={index} className="mb-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
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
                
                {/* Pagination */}
                {(data?.traditional?.length || 0) > 5 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled>
                        Previous
                      </Button>
                      <Button variant="default" size="sm">
                        1
                      </Button>
                      <Button variant="outline" size="sm">
                        2
                      </Button>
                      <Button variant="outline" size="sm">
                        3
                      </Button>
                      <span className="flex items-center px-2 text-sm text-gray-500">...</span>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="ai" className="mt-0">
                {data?.ai && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm text-[hsl(var(--primary))] font-semibold">AI Answer</h2>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {data.ai.model}
                      </span>
                    </div>
                    <div className="prose max-w-none text-gray-700">
                      {data.ai.answer}
                    </div>
                    {data.ai.sources && data.ai.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {data.ai.sources.map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition-colors"
                            >
                              {source.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        Copy
                      </Button>
                      <Button size="sm" variant="outline">
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="web" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {data?.traditional && data.traditional.map((result, index) => (
                    <div key={index} className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
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
              </TabsContent>
              
              <TabsContent value="news" className="mt-0">
                <div className="text-center py-8">
                  <p className="text-gray-500">News search coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="images" className="mt-0">
                <div className="text-center py-8">
                  <p className="text-gray-500">Image search coming soon</p>
                </div>
              </TabsContent>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
