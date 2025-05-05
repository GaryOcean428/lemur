import { Users as UsersIcon, Calendar, MessageCircle, Heart, Repeat, ExternalLink, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { performSearch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";

interface SocialResultProps {
  query: string;
  loading?: boolean;
}

interface SocialResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  username?: string;
  imageUrl?: string;
  platform?: string;
}

export default function SocialResults({ query, loading: initialLoading = false }: SocialResultProps) {
  const [loading, setLoading] = useState(initialLoading || !query);
  const [posts, setPosts] = useState<SocialResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSearchStore();

  // Helper function to generate likely platform from domain
  const detectPlatform = (domain: string): string => {
    domain = domain.toLowerCase();
    
    if (domain.includes('twitter') || domain.includes('x.com')) return 'Twitter';
    if (domain.includes('facebook')) return 'Facebook';
    if (domain.includes('instagram')) return 'Instagram';
    if (domain.includes('reddit')) return 'Reddit';
    if (domain.includes('linkedin')) return 'LinkedIn';
    if (domain.includes('tiktok')) return 'TikTok';
    if (domain.includes('youtube')) return 'YouTube';
    if (domain.includes('pinterest')) return 'Pinterest';
    if (domain.includes('tumblr')) return 'Tumblr';
    
    return 'Social Media';
  };

  // Helper function to extract username from title or snippet
  const extractUsername = (text: string, platform: string): string | undefined => {
    // Simple heuristic to try to extract usernames based on common patterns
    // In a real implementation, this would be much more sophisticated
    
    // Look for @ mentions
    const atMatch = text.match(/@([\w.]+)/);
    if (atMatch) return atMatch[1];
    
    // Look for "by [username]" pattern
    const byMatch = text.match(/by ([\w.]+)/);
    if (byMatch) return byMatch[1];
    
    // Platform-specific extraction could be added here
    
    // Default to platform name if we can't extract
    return `${platform} User`;
  };

  // Generate relative time string from date
  const getRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr; // If parsing fails, return the original string
    }
  };

  useEffect(() => {
    // If no query, don't search
    if (!query) return;

    async function fetchSocialResults() {
      setLoading(true);
      setError(null);
      
      try {
        const results = await performSearch(query, "social", filters);
        
        // Process traditional results as social results
        if (results && results.traditional && results.traditional.length > 0) {
          // Convert results to social format
          const socialResults: SocialResult[] = results.traditional.map(result => {
            const platform = detectPlatform(result.domain);
            const username = extractUsername(result.title, platform);
            
            // Generate engagement metrics for demonstration
            // In a real implementation, this would come from actual data
            const likes = Math.floor(Math.random() * 500);
            const comments = Math.floor(Math.random() * 100);
            const shares = Math.floor(Math.random() * 50);
            
            return {
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              domain: result.domain,
              date: result.date,
              username,
              platform,
              likes,
              comments,
              shares,
              imageUrl: result.image?.url
            };
          });
          
          setPosts(socialResults);
        } else {
          setPosts([]);
          setError("No social media results found");
        }
      } catch (err) {
        console.error("Error fetching social results:", err);
        setError("Error fetching social results");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSocialResults();
  }, [query, filters]);

  // Get appropriate icon color based on platform
  const getPlatformColor = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'twitter': return 'text-blue-400';
      case 'facebook': return 'text-blue-600';
      case 'instagram': return 'text-pink-500';
      case 'reddit': return 'text-orange-500';
      case 'linkedin': return 'text-blue-700';
      case 'tiktok': return 'text-black dark:text-white';
      case 'youtube': return 'text-red-600';
      case 'pinterest': return 'text-red-500';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  // Display loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <UsersIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Social Media Results</h2>
          </div>
          <div className="space-y-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="border dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error or empty results message
  if (error || posts.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <UsersIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold dark:text-white">Social Media Results</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 my-8 text-center">
            {error || `No social media results found for "${query}". Try a different search term.`}
          </p>
        </div>
      </div>
    );
  }

  // Display social results
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <UsersIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold dark:text-white">Social Media Results</h2>
        </div>
        
        <div className="space-y-6">
          {posts.map((post, index) => (
            <div key={index} className="border dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center mb-3">
                <Avatar className="mr-3 w-10 h-10">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.username || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-primary/10 text-primary">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </Avatar>
                <div>
                  <div className="font-medium dark:text-white flex items-center">
                    {post.username || 'User'}
                    <span className={`ml-2 text-xs ${getPlatformColor(post.platform || '')}`}>
                      {post.platform}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {post.date ? getRelativeTime(post.date) : 'Recent'}
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {post.snippet}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center">
                    <Heart className="w-3.5 h-3.5 mr-1" />
                    {post.likes?.toLocaleString() || '0'}
                  </span>
                  <span className="flex items-center">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    {post.comments?.toLocaleString() || '0'}
                  </span>
                  <span className="flex items-center">
                    <Repeat className="w-3.5 h-3.5 mr-1" />
                    {post.shares?.toLocaleString() || '0'}
                  </span>
                </div>
                
                <a 
                  href={post.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center text-primary hover:underline"
                >
                  View
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
