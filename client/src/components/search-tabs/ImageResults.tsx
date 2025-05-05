import { Image as ImageIcon, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { SearchResults } from "@/lib/types";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageResultProps {
  query: string;
  loading?: boolean;
}

interface ImageResult {
  title: string;
  url: string;
  imageUrl: string;
  domain: string;
}

export default function ImageResults({ query, loading: initialLoading = false }: ImageResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchImageResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "images", filters);
        
        // Extract images from results
        if (results && results.traditional && results.traditional.length > 0) {
          // First, check if any results have images
          const withImages = results.traditional.filter(result => result.image && result.image.url);
          
          if (withImages.length > 0) {
            const imageResults: ImageResult[] = withImages.map(result => ({
              title: result.title,
              url: result.url,
              imageUrl: result.image!.url,
              domain: result.domain
            }));
            
            setImages(imageResults);
          } else {
            // If no results have images, use the results anyway but use domain as identifier
            const fallbackResults: ImageResult[] = results.traditional.map(result => ({
              title: result.title,
              url: result.url,
              imageUrl: '', // No image URL available
              domain: result.domain
            }));
            
            setImages(fallbackResults);
          }
        } else {
          setImages([]);
          setError("No image results found");
        }
      } catch (err) {
        console.error("Error fetching image results:", err);
        setError("Error fetching image results");
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchImageResults();
  }, [query, filters]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Image Results</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(16).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || images.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Image Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No image results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Image Results</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <a 
              href={image.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              key={index} 
              className="group rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
            >
              <div className="aspect-square bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
                {image.imageUrl ? (
                  <img 
                    src={image.imageUrl} 
                    alt={image.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="p-2">
                <h3 className="text-sm font-medium line-clamp-1 text-gray-800 dark:text-gray-200">
                  {image.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {image.domain}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
