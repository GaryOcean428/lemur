
"use client";

import React, { useState, useTransition } from 'react';
import { Search, Mic, Camera, Moon, ArrowRight, ExternalLink, Bookmark, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Define interfaces for the search results
interface TraditionalResult {
  title: string;
  url: string;
  description: string;
}

interface Citation {
  id: number;
  url: string;
  title: string;
}

interface SearchResponse {
  aiAnswer: string;
  citations: Citation[];
  traditionalResults: TraditionalResult[];
}

const SearchResultItem = ({ title, url, description }: TraditionalResult) => (
  <div className="mb-4">
    <div className="text-xs text-gray-500 mb-1 truncate">{url}</div>
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-lg font-medium block mb-1">{title}</a>
    <p className="text-sm text-gray-700">{description}</p>
  </div>
);

const SponsoredResultItem = ({ title, url, description }: TraditionalResult) => (
  <div className="mb-4 border-l-4 border-yellow-400 pl-3">
    <div className="flex items-center mb-1">
      <span className="text-xs text-gray-500 truncate">{url}</span>
      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Sponsored</span>
    </div>
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-lg font-medium block mb-1">{title}</a>
    <p className="text-sm text-gray-700">{description}</p>
  </div>
);

const FindSearchEngine = () => {
  const [query, setQuery] = useState("renewable energy developments");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data: SearchResponse = await response.json();
        setResults(data);
      } catch (err: any) {
        console.error("Search failed:", err);
        setError(err.message || "Failed to fetch search results.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Initial search on load with default query
  // useEffect(() => {
  //   handleSearch();
  // }, []); // Commented out to avoid running search on initial load during development

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-grow">
              <h1 className="text-2xl font-bold text-blue-600 mr-4 hidden sm:block">Find</h1>
              <form onSubmit={handleSearch} className="relative flex-grow max-w-2xl mx-auto">
                <div className="flex items-center bg-white border rounded-full px-4 py-2 shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow">
                  <Search className="h-5 w-5 text-gray-400 mr-3" />
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 outline-none border-none focus:ring-0 bg-transparent p-0 h-auto text-base"
                    placeholder="Search..."
                    disabled={isLoading || isPending}
                  />
                  <div className="flex items-center space-x-1 ml-2">
                    <Button type="button" variant="ghost" size="icon" className="rounded-full w-8 h-8" disabled={isLoading || isPending}>
                      <Mic className="h-5 w-5 text-blue-500" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="rounded-full w-8 h-8" disabled={isLoading || isPending}>
                      <Camera className="h-5 w-5 text-blue-500" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
                <Moon className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="default" className="rounded-md h-9 px-4">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="border-b mb-6 bg-transparent p-0 h-auto space-x-4">
            <TabsTrigger value="all" className="pb-2 px-1 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none text-gray-600 font-medium">All</TabsTrigger>
            <TabsTrigger value="ai" className="pb-2 px-1 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none text-gray-600 font-medium">AI Answer</TabsTrigger>
            <TabsTrigger value="web" className="pb-2 px-1 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none text-gray-600 font-medium">Web Results</TabsTrigger>
            {/* Add other tabs like News, Images if needed */}
          </TabsList>

          {isLoading || isPending ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading...</p> {/* Replace with a proper spinner/loading indicator */}
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-100 p-4 rounded-md">Error: {error}</div>
          ) : results ? (
            <>
              <TabsContent value="all">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* AI Answer Box */}
                  <div className="w-full lg:w-1/2">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl font-bold text-gray-800">AI Answer</CardTitle>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Groq</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                          {/* Render AI answer - basic paragraph splitting */}
                          {results.aiAnswer.split('\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                        {results.citations && results.citations.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Sources:</h3>
                            <div className="space-y-1 text-xs text-gray-600">
                              {results.citations.map((cite) => (
                                <div key={cite.id}><sup>{cite.id}</sup> <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{cite.title}</a></div>
                              ))}
                            </div>
                          </>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                              <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                              <ThumbsDown className="h-4 w-4 mr-1" /> Not helpful
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                              <Bookmark className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 px-2">
                              Follow up <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Web Results */}
                  <div className="w-full lg:w-1/2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Web Results</h2>
                    {/* Placeholder for Sponsored Results */}
                    <SponsoredResultItem
                      title="Renewable Energy Solutions - Special Offer"
                      url="www.example-sponsor.com/offer"
                      description="Placeholder for sponsored result. Upgrade to solar power with our special offer."
                    />
                    {results.traditionalResults && results.traditionalResults.map((result, index) => (
                      <SearchResultItem key={index} {...result} />
                    ))}
                    {/* Placeholder for Pagination */}
                    <div className="mt-6 flex justify-center">
                      <p className="text-sm text-gray-500">Pagination placeholder</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai">
                <Card className="shadow-sm max-w-3xl mx-auto">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold text-gray-800">AI Answer</CardTitle>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Groq</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                      {results.aiAnswer.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                    {results.citations && results.citations.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Sources:</h3>
                        <div className="space-y-1 text-xs text-gray-600">
                          {results.citations.map((cite) => (
                            <div key={cite.id}><sup>{cite.id}</sup> <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{cite.title}</a></div>
                          ))}
                        </div>
                      </>
                    )}
                     <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                            <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                            <ThumbsDown className="h-4 w-4 mr-1" /> Not helpful
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 px-2">
                            <Bookmark className="h-4 w-4 mr-1" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 px-2">
                            Follow up <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="web">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Web Results</h2>
                  <SponsoredResultItem
                    title="Renewable Energy Solutions - Special Offer"
                    url="www.example-sponsor.com/offer"
                    description="Placeholder for sponsored result. Upgrade to solar power with our special offer."
                  />
                  {results.traditionalResults && results.traditionalResults.map((result, index) => (
                    <SearchResultItem key={index} {...result} />
                  ))}
                  <div className="mt-6 flex justify-center">
                    <p className="text-sm text-gray-500">Pagination placeholder</p>
                  </div>
                </div>
              </TabsContent>
            </>
          ) : (
            <div className="text-center text-gray-500 pt-10">Enter a query to start searching.</div>
          )}
        </Tabs>

        {/* Related Searches Placeholder */}
        {results && (
            <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Related Searches</h3>
                <div className="flex flex-wrap gap-2">
                    {/* Placeholder related searches */}
                    <Button variant="outline" size="sm" className="rounded-full bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700">renewable energy investment</Button>
                    <Button variant="outline" size="sm" className="rounded-full bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700">solar panel efficiency</Button>
                    <Button variant="outline" size="sm" className="rounded-full bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700">offshore wind technology</Button>
                </div>
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-2 sm:mb-0">
              © 2025 Find. Powered by Groq.
            </div>
            <div className="flex flex-wrap justify-center space-x-4">
              <a href="#" className="hover:text-blue-600">About</a>
              <a href="#" className="hover:text-blue-600">Privacy</a>
              <a href="#" className="hover:text-blue-600">Terms</a>
              <a href="#" className="hover:text-blue-600">Settings</a>
              <a href="#" className="hover:text-blue-600">Feedback</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FindSearchEngine;


