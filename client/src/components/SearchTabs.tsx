import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AIAnswer from "./AIAnswer";
import { SearchResults } from "@/lib/types";
import { useSearchStore } from "@/store/searchStore";
import { type SearchTabType } from "@/store/searchStore";
import { performSearch } from "@/lib/api";

// Import specialized tab components
import ImageResults from "./search-tabs/ImageResults";
import VideoResults from "./search-tabs/VideoResults";
import NewsResults from "./search-tabs/NewsResults";
import ShoppingResults from "./search-tabs/ShoppingResults";
import SocialResults from "./search-tabs/SocialResults";
import MapsResults from "./search-tabs/MapsResults";
import AcademicResults from "./search-tabs/AcademicResults";
import DeepResearchResults from "./DeepResearchResults";

interface SearchTabsProps {
  data: SearchResults | undefined;
  query: string;
  isLoading: boolean;
  isFollowUp?: boolean;
  authRequired?: boolean; // Indicates if authentication is required (for limit reached scenarios)
}

export default function SearchTabs({ data, query, isLoading, isFollowUp = false, authRequired = false }: SearchTabsProps) {
  // Access the search store
  const { 
    activeTab, 
    setActiveTab, 
    searchedTabs,
    setSearchedTab,
    setCurrentQuery,
    setResults,
    results
  } = useSearchStore();
  
  // Set the current query in the store when it changes
  useEffect(() => {
    if (query) {
      setCurrentQuery(query);
    }
  }, [query, setCurrentQuery]);
  
  // Store results from the 'all' tab when they arrive
  useEffect(() => {
    if (data && !isLoading) {
      setResults('all', data);
      setSearchedTab('all', true);
    }
  }, [data, isLoading, setResults, setSearchedTab]);

  // Using SearchTabType imported from store
  
  // Function to handle tab change
  const handleTabChange = (tab: string) => {
    const newTab = tab as SearchTabType;
    setActiveTab(newTab);
    
    // If this tab hasn't been searched yet, we would make a new search request
    if (!searchedTabs[newTab]) {
      console.log(`New search needed for tab type: ${newTab}`);
      
      // We'll use the current filters for specialized searches in the future
      // Currently we're just using the same results for all tabs
      
      // Mark this tab as searched
      setSearchedTab(newTab, true);
      
      // For most tabs, use the existing data
      if (data) {
        setResults(newTab, data);
      }
      
      // In the future, we could make specialized searches here
      // For example, for specific tab types like images or news
      // performSearch(query, { ...filters, specializedFor: newTab })
      //   .then(results => setResults(newTab, results))
      //   .catch(error => console.error(`Error searching ${newTab}:`, error));
    }
  };
  
  // Use the result for the active tab
  const activeTabData = results[activeTab] || data;
  
  // Check if deep research results are available
  const hasDeepResearch = data && data.deepResearch && data.research;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
          {/* Show Deep Research tab only when results are available */}
          {hasDeepResearch && (
            <TabsTrigger value="research" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
              Research
            </TabsTrigger>
          )}
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
              {/* Web Results Section - Now takes up 2/3 of the space */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <h2 className="text-xl font-semibold dark:text-white mb-4">Web Results</h2>
                {activeTabData?.traditional?.map((result, index) => (
                  <div key={index} className="p-4 mb-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{result.domain}</div>
                      {result.date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{result.date}</div>
                      )}
                    </div>
                    {/* Flex container for content and image */}
                    <div className={`${result.image ? 'flex gap-4' : ''}`}>
                      <div className="flex-grow">
                        <h3 className="text-lg font-medium">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[hsl(var(--primary))] hover:underline"
                          >
                            {result.title}
                          </a>
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {result.snippet}
                        </p>
                      </div>
                      
                      {/* Image if available */}
                      {result.image && (
                        <div className="flex-shrink-0">
                          <img 
                            src={result.image.url} 
                            alt={result.image.alt || result.title}
                            className="w-24 h-24 object-cover rounded-lg" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* AI Answer Section - Now takes up 1/3 of the space */}
              <div className="order-1 lg:order-2">
                <h2 className="text-xl font-semibold dark:text-white mb-4">AI Answer</h2>
                {activeTabData?.ai && (
                  <AIAnswer
                    answer={activeTabData.ai.answer}
                    sources={activeTabData.ai.sources}
                    model={activeTabData.ai.model}
                    contextual={isFollowUp}
                    authRequired={authRequired}
                  />
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* AI Only Tab */}
          <TabsContent value="ai" className="mt-0">
            {activeTabData?.ai && (
              <AIAnswer
                answer={activeTabData.ai.answer}
                sources={activeTabData.ai.sources}
                model={activeTabData.ai.model}
                contextual={isFollowUp}
                authRequired={authRequired}
              />
            )}
          </TabsContent>
          
          {/* Web Only Tab */}
          <TabsContent value="web" className="mt-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold dark:text-white mb-4">Web Results</h2>
              {activeTabData?.traditional?.map((result, index) => (
                <div key={index} className="p-4 mb-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{result.domain}</div>
                    {result.date && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{result.date}</div>
                    )}
                  </div>
                  {/* Flex container for content and image */}
                  <div className={`${result.image ? 'flex gap-4' : ''}`}>
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium">
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          {result.title}
                        </a>
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {result.snippet}
                      </p>
                    </div>
                    
                    {/* Image if available */}
                    {result.image && (
                      <div className="flex-shrink-0">
                        <img 
                          src={result.image.url} 
                          alt={result.image.alt || result.title}
                          className="w-24 h-24 object-cover rounded-lg" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* Images tab */}
          <TabsContent value="images" className="mt-0">
            <ImageResults query={query} />
          </TabsContent>
          
          {/* Videos tab */}
          <TabsContent value="videos" className="mt-0">
            <VideoResults query={query} />
          </TabsContent>
          
          {/* News tab */}
          <TabsContent value="news" className="mt-0">
            <NewsResults query={query} />
          </TabsContent>
          
          {/* Shopping tab */}
          <TabsContent value="shopping" className="mt-0">
            <ShoppingResults query={query} />
          </TabsContent>
          
          {/* Social tab */}
          <TabsContent value="social" className="mt-0">
            <SocialResults query={query} />
          </TabsContent>
          
          {/* Maps tab */}
          <TabsContent value="maps" className="mt-0">
            <MapsResults query={query} />
          </TabsContent>
          
          {/* Academic tab */}
          <TabsContent value="academic" className="mt-0">
            <AcademicResults query={query} />
          </TabsContent>
          
          {/* Deep Research tab - only shown when deep research results are available */}
          {hasDeepResearch && (
            <TabsContent value="research" className="mt-0">
              <h2 className="text-xl font-semibold dark:text-white mb-4">Advanced Research Results</h2>
              <DeepResearchResults research={data.research} />
            </TabsContent>
          )}
        </div>
      )}
    </Tabs>
  );
}