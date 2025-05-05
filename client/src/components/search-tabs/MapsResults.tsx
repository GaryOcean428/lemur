import { MapPin as MapIcon, Navigation, Star, Phone, Clock, ExternalLink, Route } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MapsResultProps {
  query: string;
  loading?: boolean;
}

interface MapLocation {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  address?: string;
  rating?: number;
  phone?: string;
  hours?: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export default function MapsResults({ query, loading: initialLoading = false }: MapsResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const { filters } = useSearchStore();

  // Extract an address or location from the snippet
  const extractAddress = (snippet: string): string | undefined => {
    // Simple address extraction based on common patterns
    // In a real implementation, this would use more sophisticated methods
    
    // Check for comma separated segments that might be addresses
    const commaGroups = snippet.split(',');
    if (commaGroups.length >= 3) {
      // Look for postal/zip code patterns
      const potentialAddress = commaGroups.slice(0, 3).join(',').trim();
      if (/\d{4,5}/.test(potentialAddress)) {
        return potentialAddress;
      }
    }
    
    // Look for "located at" or "address" in the snippet
    const locatedAtMatch = snippet.match(/located at ([^.]+)/);
    if (locatedAtMatch) return locatedAtMatch[1].trim();
    
    const addressMatch = snippet.match(/address[^:]*: ([^.]+)/);
    if (addressMatch) return addressMatch[1].trim();
    
    // Default to a portion of the snippet if no address is found
    return snippet.substring(0, 50) + '...';
  };

  // Generate random business hours for demonstration
  // In a real implementation, this would come from actual data
  const generateRandomHours = (): string => {
    const openHour = Math.floor(Math.random() * 5) + 7; // 7 AM to 11 AM
    const closeHour = Math.floor(Math.random() * 6) + 17; // 5 PM to 11 PM
    
    const openTime = `${openHour}:00 ${openHour >= 12 ? 'PM' : 'AM'}`;
    const closeTime = `${closeHour > 12 ? closeHour - 12 : closeHour}:00 ${closeHour >= 12 ? 'PM' : 'AM'}`;
    
    const today = new Date().getDay();
    const isOpen = today !== 0; // Closed on Sundays for this example
    
    return isOpen ? `Open ${openTime} - ${closeTime}` : 'Closed today';
  };

  // Generate a fake phone number for demonstration
  // In a real implementation, this would come from actual data
  const generatePhoneNumber = (): string => {
    return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchMapResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "maps", filters);
        
        // Process traditional results as map locations
        if (results && results.traditional && results.traditional.length > 0) {
          // Convert results to location format
          const mapResults: MapLocation[] = results.traditional.map(result => {
            // Extract or generate location data
            const address = extractAddress(result.snippet);
            
            // Generate a random rating between 3.0 and 5.0 for demonstration
            const rating = Math.min(5, Math.max(3, Math.round((3 + Math.random() * 2) * 10) / 10));
            
            return {
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              domain: result.domain,
              address,
              rating,
              phone: generatePhoneNumber(),
              hours: generateRandomHours(),
              image: result.image
            };
          });
          
          setLocations(mapResults);
          if (mapResults.length > 0) {
            setSelectedLocation(mapResults[0]);
          }
        } else {
          setLocations([]);
          setError("No location results found");
        }
      } catch (err) {
        console.error("Error fetching map results:", err);
        setError("Error fetching map results");
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMapResults();
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
            <MapIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Map Results</h2>
          </div>
          <div className="w-full">
            <Skeleton className="aspect-[16/9] w-full rounded-lg mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || locations.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Map Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No location results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display map results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Map Results</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side - locations list */}
          <div className="space-y-4 lg:col-span-1 order-2 lg:order-1">
            {locations.map((location, index) => (
              <div 
                key={index} 
                className={`border p-4 rounded-lg cursor-pointer transition-colors ${selectedLocation === location ? 'border-primary bg-primary/5' : 'dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                onClick={() => setSelectedLocation(location)}
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{location.title}</h3>
                
                {location.address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-start">
                    <MapIcon className="w-3.5 h-3.5 mr-1 flex-shrink-0 mt-0.5" />
                    <span>{location.address}</span>
                  </p>
                )}
                
                {location.rating && (
                  <div className="mt-2">
                    {renderStars(location.rating)}
                  </div>
                )}
                
                {location.hours && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{location.hours}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Right side - map and details */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {selectedLocation && (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden relative aspect-[16/9]">
                  {/* Map placeholder - in a real implementation, this would be a real map */}
                  {selectedLocation.image ? (
                    <img 
                      src={selectedLocation.image.url} 
                      alt={selectedLocation.image.alt || selectedLocation.title} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center">
                        <MapIcon className="w-16 h-16 mb-2" />
                        <span>Map view</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    <Badge className="bg-white text-gray-700 hover:bg-gray-100 border-0 shadow-sm px-3 py-1">
                      <Navigation className="w-3.5 h-3.5 mr-1" />
                      Directions
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {selectedLocation.title}
                  </h3>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {selectedLocation.snippet}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {selectedLocation.address && (
                      <div className="flex items-start">
                        <MapIcon className="w-4 h-4 text-primary mr-2 mt-0.5" />
                        <span className="text-sm">{selectedLocation.address}</span>
                      </div>
                    )}
                    
                    {selectedLocation.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-primary mr-2" />
                        <span className="text-sm">{selectedLocation.phone}</span>
                      </div>
                    )}
                    
                    {selectedLocation.hours && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-primary mr-2" />
                        <span className="text-sm">{selectedLocation.hours}</span>
                      </div>
                    )}
                    
                    {selectedLocation.domain && (
                      <div className="flex items-center">
                        <ExternalLink className="w-4 h-4 text-primary mr-2" />
                        <span className="text-sm">{selectedLocation.domain}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button asChild>
                      <a href={selectedLocation.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                    
                    <Button variant="outline">
                      <Route className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
