import { Video as VideoIcon, ExternalLink, Clock, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoResultProps {
  query: string;
  loading?: boolean;
}

interface VideoResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  thumbnailUrl?: string;
}

export default function VideoResults({ query, loading: initialLoading = false }: VideoResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchVideoResults() {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching video results for query: "${query}"`);
        const results = await performSearch(query, "videos", filters);
        
        // Log the results for debugging
        console.log("Video search results received:", 
                   results?.traditional?.length || 0, "traditional results", 
                   results?.traditional?.filter(r => r.image && r.image.url).length || 0, "with images");
        
        // Process traditional results as video results
        if (results && results.traditional && results.traditional.length > 0) {
          // We still show video results even if they don't have thumbnails
          const videoResults: VideoResult[] = results.traditional.map(result => {
            // Extract video information and make sure thumbnail URL is valid
            const thumbnailUrl = result.image?.url || '';
            console.log(`Processing video result: ${result.title.substring(0, 30)}... with thumbnail URL: ${thumbnailUrl ? thumbnailUrl.substring(0, 30) + '...' : 'none'}`);
            
            return {
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              domain: result.domain,
              date: result.date,
              thumbnailUrl: thumbnailUrl
            };
          });
          
          setVideos(videoResults);
          
          // Log for debugging
          console.log("Processed video results:", videoResults.length, 
                     "with thumbnails:", videoResults.filter(v => v.thumbnailUrl).length);
        } else {
          console.log("No video results found at all");
          setVideos([]);
          setError("No video results found");
        }
      } catch (err) {
        console.error("Error fetching video results:", err);
        setError("Error fetching video results");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchVideoResults();
  }, [query, filters]);

  // Display loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <VideoIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Video Results</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || videos.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <VideoIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Video Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No video results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display video results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <VideoIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Video Results</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video, index) => (
            <a 
              href={video.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              key={index} 
              className="group flex flex-col rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                {video.thumbnailUrl ? (
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <VideoIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="w-16 h-16 rounded-full bg-white bg-opacity-75 flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors dark:text-white">
                  {video.title}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2 mb-auto">
                  {video.snippet}
                </p>
                
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    {video.date && (
                      <span className="flex items-center mr-3">
                        <Calendar className="w-3 h-3 mr-1" />
                        {video.date}
                      </span>
                    )}
                  </div>
                  
                  <span className="flex items-center">
                    {video.domain}
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
