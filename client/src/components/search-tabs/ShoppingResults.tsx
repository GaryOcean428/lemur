import { ShoppingBag as ShoppingIcon, Star, ExternalLink, Store, Tag, ThumbsUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ShoppingResultProps {
  query: string;
  loading?: boolean;
}

interface ShoppingResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  price?: string;
  rating?: number;
  imageUrl?: string;
}

export default function ShoppingResults({ query, loading: initialLoading = false }: ShoppingResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [products, setProducts] = useState<ShoppingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchShoppingResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "shopping", filters);
        
        // Process traditional results as shopping results
        if (results && results.traditional && results.traditional.length > 0) {
          // Convert results to shopping format with price extraction
          const shoppingResults: ShoppingResult[] = results.traditional.map(result => {
            // Try to extract price from title or snippet
            // This is a simple heuristic - in real implementation would use more sophisticated methods
            let price: string | undefined;
            const priceRegex = /(\$\d+(?:\.\d{2})?)|(?:£\d+(?:\.\d{2})?)/;
            
            const titleMatch = result.title.match(priceRegex);
            const snippetMatch = result.snippet.match(priceRegex);
            
            if (titleMatch) {
              price = titleMatch[0];
            } else if (snippetMatch) {
              price = snippetMatch[0];
            }
            
            // Generate a random rating between 3.0 and 5.0 for demonstration
            // In a real implementation, this would come from the actual data
            const rating = Math.min(5, Math.max(3, Math.round((3 + Math.random() * 2) * 10) / 10));
            
            return {
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              domain: result.domain,
              price: price,
              rating: rating,
              imageUrl: result.image?.url
            };
          });
          
          setProducts(shoppingResults);
        } else {
          setProducts([]);
          setError("No shopping results found");
        }
      } catch (err) {
        console.error("Error fetching shopping results:", err);
        setError("Error fetching shopping results");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchShoppingResults();
  }, [query, filters]);

  // Generate star rating display
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        ))}
        {hasHalfStar && 
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-gradient-lr-yellow" />
        }
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
        ))}
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Display loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Shopping Results</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || products.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Shopping Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No shopping results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display shopping results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Shopping Results</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.map((product, index) => (
            <a 
              href={product.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              key={index} 
              className="group flex flex-col rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all"
            >
              <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 overflow-hidden flex items-center justify-center p-4">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.title} 
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <ShoppingIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-8 h-8 text-white" />
                </div>
                
                {product.rating && (
                  <Badge className="absolute top-2 right-2 bg-white/95 dark:bg-gray-800/95 text-yellow-600 border-0 shadow-sm flex items-center space-x-1 px-2 py-1">
                    <ThumbsUp className="w-3 h-3" /> 
                    <span>Top rated</span>
                  </Badge>
                )}
              </div>
              
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors mb-1 flex-grow dark:text-white">
                  {product.title}
                </h3>
                
                {product.price && (
                  <div className="text-lg font-bold text-primary mb-1 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {product.price}
                  </div>
                )}
                
                {product.rating && renderStars(product.rating)}
                
                <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <Store className="w-3.5 h-3.5 mr-1" />
                  {product.domain}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
