import { GraduationCap, Calendar, Users, ExternalLink, Download, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AcademicResultProps {
  query: string;
  loading?: boolean;
}

interface AcademicResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  authors?: string;
}

export default function AcademicResults({ query, loading: initialLoading = false }: AcademicResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [papers, setPapers] = useState<AcademicResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchAcademicResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "academic", filters);
        
        // Process traditional results as academic results
        if (results && results.traditional && results.traditional.length > 0) {
          // Convert results to academic format
          const academicResults: AcademicResult[] = results.traditional.map(result => {
            // Extract year from date if available
            const year = result.date ? new Date(result.date).getFullYear().toString() : undefined;
            
            // Try to extract authors from the snippet
            // This is a simple heuristic that might need adjustment based on actual data
            let authors = undefined;
            if (result.snippet.includes("by ")) {
              const byParts = result.snippet.split("by ");
              if (byParts.length > 1) {
                const potentialAuthors = byParts[1].split(",")[0];
                if (potentialAuthors.length < 40) { // Arbitrary limit to avoid false positives
                  authors = potentialAuthors;
                }
              }
            }
            
            return {
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              domain: result.domain,
              date: year,
              authors
            };
          });
          
          setPapers(academicResults);
        } else {
          setPapers([]);
          setError("No academic results found");
        }
      } catch (err) {
        console.error("Error fetching academic results:", err);
        setError("Error fetching academic results");
        setPapers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAcademicResults();
  }, [query, filters]);

  // Display loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Academic Results</h2>
          </div>
          <div className="space-y-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="border dark:border-gray-700 rounded-xl p-5">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || papers.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Academic Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No academic results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display academic results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Academic Results</h2>
        </div>
        
        <div className="space-y-6">
          {papers.map((paper, index) => (
            <div key={index} className="border dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <a 
                    href={paper.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-primary transition-colors flex items-start gap-1"
                  >
                    {paper.title}
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                  </a>
                </h3>
                
                {paper.date && (
                  <Badge className="ml-2 bg-primary/10 text-primary border-0">
                    {paper.date}
                  </Badge>
                )}
              </div>
              
              {paper.authors && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {paper.authors}
                </div>
              )}
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {paper.snippet}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Read
                    </a>
                  </Button>
                  
                  <Button size="sm" variant="outline" asChild>
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </a>
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {paper.domain}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
