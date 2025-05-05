import { Newspaper as NewsIcon, Calendar, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface NewsResultProps {
  query: string;
  loading?: boolean;
}

interface NewsResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export default function NewsResults({ query, loading: initialLoading = false }: NewsResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [news, setNews] = useState<NewsResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchNewsResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "news", filters);
        
        // Process traditional results as news results
        if (results && results.traditional && results.traditional.length > 0) {
          // Filter results that are likely news (have dates, etc.)
          const newsResults: NewsResult[] = results.traditional;
          setNews(newsResults);
        } else {
          setNews([]);
          setError("No news results found");
        }
      } catch (err) {
        console.error("Error fetching news results:", err);
        setError("Error fetching news results");
        setNews([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNewsResults();
  }, [query, filters]);

  // Format relative time (e.g., "2 days ago")
  function getRelativeTime(dateStr?: string): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
      return `${Math.floor(diffInDays / 365)} years ago`;
    } catch (e) {
      return dateStr; // If parsing fails, return the original string
    }
  }

  // Display loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <NewsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">News Results</h2>
          </div>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-md flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || news.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <NewsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">News Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No news results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display news results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <NewsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">News Results</h2>
        </div>
        
        <div className="space-y-5">
          {news.map((article, index) => (
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              key={index} 
              className="flex gap-4 p-3 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
            >
              {article.image ? (
                <div className="w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden rounded-md relative">
                  <img 
                    src={article.image.url} 
                    alt={article.image.alt || article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                  <NewsIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {article.date && (
                    <Badge variant="outline" className="text-xs font-normal h-5 px-1.5 py-0 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {getRelativeTime(article.date)}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {article.domain}
                  </span>
                </div>
                
                <h3 className="font-semibold line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {article.snippet}
                </p>
                
                <div className="mt-2 flex items-center">
                  <span className="text-xs text-primary dark:text-primary-light flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    Read full article
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
