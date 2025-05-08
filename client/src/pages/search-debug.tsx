import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SearchDebug() {
  const { user } = useAuth();
  const [query, setQuery] = useState("What happened in the latest Australian elections?");
  const [searchMode, setSearchMode] = useState("fast");
  const [searchResponse, setSearchResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test direct search API
  const testSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/search/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          query,
          model_preference: searchMode
        }),
      });

      const data = await response.json();
      setSearchResponse(data);
      toast({
        title: response.ok ? "Search Success" : "Search Failed",
        description: response.ok ? "Search results retrieved" : `Error: ${response.status} ${response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      setSearchResponse({ error: String(error) });
      toast({
        title: "Search failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test tavily API directly
  const testTavily = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tavily-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          query,
          search_depth: searchMode === "comprehensive" ? "advanced" : "basic"
        }),
      });

      const data = await response.json();
      setSearchResponse(data);
      toast({
        title: response.ok ? "Tavily Search Success" : "Tavily Search Failed",
        description: response.ok ? "Search results retrieved" : `Error: ${response.status} ${response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      setSearchResponse({ error: String(error) });
      toast({
        title: "Tavily search failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test the agentic research API
  const testAgenticResearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          query,
          deepDive: true,
          includeReasoning: true
        }),
      });

      const data = await response.json();
      setSearchResponse(data);
      toast({
        title: response.ok ? "Research Success" : "Research Failed",
        description: response.ok ? "Research results retrieved" : `Error: ${response.status} ${response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      setSearchResponse({ error: String(error) });
      toast({
        title: "Research failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto mt-10 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Debugging</CardTitle>
          <CardDescription>
            Test search functionality and troubleshoot search issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-32">
              {user ? JSON.stringify(user, null, 2) : "Not authenticated"}
            </pre>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Search Query</label>
              <Input
                placeholder="Enter search query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4"
              />
              
              <label className="block mb-2 text-sm font-medium">Search Mode</label>
              <Select value={searchMode} onValueChange={setSearchMode}>
                <SelectTrigger className="mb-4">
                  <SelectValue placeholder="Select search mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={testSearch} disabled={isLoading}>
                {isLoading ? "Searching..." : "Test Direct Search"}
              </Button>
              <Button onClick={testTavily} disabled={isLoading} variant="secondary">
                {isLoading ? "Searching..." : "Test Tavily API"}
              </Button>
              <Button onClick={testAgenticResearch} disabled={isLoading} variant="outline">
                {isLoading ? "Researching..." : "Test Agentic Research"}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start">
          <h3 className="font-semibold mb-2">Search Response:</h3>
          {isLoading && (
            <div className="w-full flex justify-center my-4">
              <div className="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {searchResponse ? JSON.stringify(searchResponse, null, 2) : "No response yet"}
            </pre>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}