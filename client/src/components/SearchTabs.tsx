import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AIAnswer from "./AIAnswer";
import { SearchResults } from "@/lib/types";

type SearchTabType = 
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

interface SearchTabsProps {
  data: SearchResults | undefined;
  query: string;
  isLoading: boolean;
}

export default function SearchTabs({ data, query, isLoading }: SearchTabsProps) {
  const [activeTab, setActiveTab] = useState<SearchTabType>("all");
  const [searchesByType, setSearchesByType] = useState<Record<SearchTabType, boolean>>({
    all: true,
    ai: false,
    web: false,
    images: false,
    videos: false,
    news: false,
    shopping: false,
    social: false,
    maps: false,
    academic: false
  });

  // Function to handle tab change
  const handleTabChange = (tab: string) => {
    const newTab = tab as SearchTabType;
    setActiveTab(newTab);
    
    // Mark this tab type as searched
    if (!searchesByType[newTab]) {
      setSearchesByType(prev => ({
        ...prev,
        [newTab]: true
      }));
      
      // Here we would trigger a new search with the appropriate type
      // But we're keeping it simple for now - the real implementation 
      // would call a function like `performSearch(query, newTab)`
      console.log(`New search needed for tab type: ${newTab}`);
    }
  };

  return (
    <Tabs defaultValue="all" onValueChange={handleTabChange} className="w-full">
      <div className="relative">
        <TabsList className="mb-6 w-full overflow-x-auto flex whitespace-nowrap bg-gray-100 p-1 dark:bg-gray-800 justify-start">
          <TabsTrigger value="all" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            All Results
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            AI Answer
          </TabsTrigger>
          <TabsTrigger value="web" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Web
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Images
          </TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Videos
          </TabsTrigger>
          <TabsTrigger value="news" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            News
          </TabsTrigger>
          <TabsTrigger value="shopping" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Shopping
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Social
          </TabsTrigger>
          <TabsTrigger value="maps" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Maps
          </TabsTrigger>
          <TabsTrigger value="academic" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Academic
          </TabsTrigger>
        </TabsList>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-[hsl(var(--neutral-muted))] text-center">Searching for "{query}"...</p>
        </div>
      ) : (
        <div className="w-full">
          {/* All Results Tab - Side by side on larger screens */}
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* AI Answer Section */}
              <div className="lg:col-span-2">
                {data?.ai && (
                  <AIAnswer
                    answer={data.ai.answer}
                    sources={data.ai.sources}
                    model={data.ai.model}
                  />
                )}
              </div>
              
              {/* Web Results Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Web Results</h2>
                {data?.traditional?.map((result, index) => (
                  <div key={index} className="p-3 bg-white shadow-sm rounded-lg hover:bg-gray-50 transition-colors">
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
          </TabsContent>
          
          {/* AI Only Tab */}
          <TabsContent value="ai" className="mt-0">
            {data?.ai && (
              <AIAnswer
                answer={data.ai.answer}
                sources={data.ai.sources}
                model={data.ai.model}
              />
            )}
          </TabsContent>
          
          {/* Web Only Tab */}
          <TabsContent value="web" className="mt-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Web Results</h2>
              {data?.traditional?.map((result, index) => (
                <div key={index} className="p-4 bg-white shadow-sm rounded-lg hover:bg-gray-50 transition-colors">
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
          
          {/* Placeholder tabs for other search types */}
          {['images', 'videos', 'news', 'shopping', 'social', 'maps', 'academic'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="bg-white rounded-xl shadow-md p-10 text-center">
                <h2 className="text-xl font-semibold mb-4 capitalize">{tab} Search</h2>
                <p className="text-gray-500 mb-6">This search type will be implemented in a future update.</p>
              </div>
            </TabsContent>
          ))}
        </div>
      )}
    </Tabs>
  );
}