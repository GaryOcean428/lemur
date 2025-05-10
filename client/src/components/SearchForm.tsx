import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Mic, Camera, Search, X, BookOpen, Globe } from "lucide-react";
// import { fetchSearchSuggestions } from "@/lib/api"; // Assuming this might be re-enabled or replaced
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import SubscriptionPrompt from "./SubscriptionPrompt";
import DeepResearchToggle from "./DeepResearchToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SearchFormProps {
  initialQuery?: string;
  isFollowUp?: boolean;
}

export type SearchFocus = 'web' | 'academic' | 'writing';

export default function SearchForm({ initialQuery = "", isFollowUp = false }: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [subscriptionPromptMessage, setSubscriptionPromptMessage] = useState("");
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [searchFocus, setSearchFocus] = useState<SearchFocus>('web');

  const [maxIterations, setMaxIterations] = useState(3);
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [deepDive, setDeepDive] = useState(false);
  const [searchContextSize, setSearchContextSize] = useState<
    | 'low'
    | 'medium'
    | 'high'
  >('medium');
  const [, setLocation] = useLocation();
  const { user, fetchUserStatus } = useAuth(); // Get user and fetchUserStatus from useAuth
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock search suggestions for now as fetchSearchSuggestions is commented out
  useEffect(() => {
    async function fetchSuggestions() {
      if (searchQuery.length >= 2) {
        // const results = await fetchSearchSuggestions(searchQuery);
        const mockResults = [
          searchQuery + " example suggestion 1",
          searchQuery + " example suggestion 2",
        ];
        setSuggestions(mockResults);
        if (mockResults.length > 0) {
          setShowSuggestions(true);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const canPerformSearch = useCallback(() => {
    if (!user) { // Not signed in, allow 1 search (handled by backend if not signed in)
        // For UI purposes, we might assume they have 1 search left if not signed in.
        // The backend will ultimately decide. If we want to track session searches on client, that's more complex.
        // For now, let's assume if not logged in, the first search attempt goes through to backend.
        return true; 
    }

    // Check search count against limit
    if (user.searchLimit !== "Infinity" && user.searchCount >= user.searchLimit) {
      setSubscriptionPromptMessage(
        `You've reached your monthly limit of ${user.searchLimit} searches. Please upgrade your plan to continue searching.`
      );
      setShowSubscriptionPrompt(true);
      return false;
    }

    // Check for deep research and tier
    if (deepResearchEnabled && user.tier !== 'pro') {
      setSubscriptionPromptMessage(
        "Deep Research is a Pro feature. Please upgrade to Pro to use this advanced capability."
      );
      setShowSubscriptionPrompt(true);
      return false;
    }
    
    // Check for academic search and tier (currently backend allows for all authenticated)
    // If we wanted to restrict academic to basic/pro:
    // if (searchFocus === 'academic' && user.tier === 'free') {
    //   setSubscriptionPromptMessage(
    //     "Academic Search is available on Basic and Pro plans. Please upgrade to access."
    //   );
    //   setShowSubscriptionPrompt(true);
    //   return false;
    // }

    return true;
  }, [user, deepResearchEnabled, searchFocus]);

  const executeSearch = async (currentSearchQuery: string) => {
    if (!canPerformSearch()) return;

    const trimmedQuery = currentSearchQuery.trim();
    if (!trimmedQuery) return;
    setShowSuggestions(false);

    let searchUrl = `/search?q=${encodeURIComponent(trimmedQuery)}`;
    if (isFollowUp) {
      searchUrl += '&isFollowUp=true';
    }
    searchUrl += `&search_focus=${searchFocus}`;

    if (deepResearchEnabled && user?.tier === 'pro') { // Only add if pro
      searchUrl += '&deepResearch=true';
      searchUrl += `&maxIterations=${maxIterations}`;
      searchUrl += `&includeReasoning=${includeReasoning}`;
      searchUrl += `&deepDive=${deepDive}`;
      searchUrl += `&searchContextSize=${searchContextSize}`;
    }
    
    setLocation(searchUrl);
    
    // After search, try to update user status to reflect new search count
    if (user && fetchUserStatus) {
        try {
            await fetchUserStatus();
        } catch (error) {
            console.error("Failed to refresh user status after search:", error);
            // Non-critical, but good to know
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    executeSearch(suggestion);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="w-full relative">
        <div className="mb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="w-full sm:w-48">
            <Select value={searchFocus} onValueChange={(value) => setSearchFocus(value as SearchFocus)}>
              <SelectTrigger className="w-full h-9 text-xs">
                <div className="flex items-center">
                  {searchFocus === 'web' && <Globe className="h-4 w-4 mr-2 opacity-70" />}
                  {searchFocus === 'academic' && <BookOpen className="h-4 w-4 mr-2 opacity-70" />}
                  {searchFocus === 'writing' && <Search className="h-4 w-4 mr-2 opacity-70" />}
                  <SelectValue placeholder="Select focus" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2 opacity-70" /> Web Search
                  </div>
                </SelectItem>
                <SelectItem value="academic" disabled={!user}> {/* Disable if not logged in, as backend requires auth for academic */}
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 opacity-70" /> Academic
                    {!user && <span className="text-xs ml-2 text-muted-foreground">(Sign in required)</span>}
                  </div>
                </SelectItem>
                 <SelectItem value="writing">
                  <div className="flex items-center">
                    <Search className="h-4 w-4 mr-2 opacity-70" /> Writing (No Search)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto flex sm:justify-end">
            <DeepResearchToggle
              enabled={deepResearchEnabled}
              onChange={setDeepResearchEnabled}
              maxIterations={maxIterations}
              includeReasoning={includeReasoning}
              deepDive={deepDive}
              searchContextSize={searchContextSize}
              onSettingsChange={(settings) => {
                if (settings.maxIterations !== undefined) setMaxIterations(settings.maxIterations);
                if (settings.includeReasoning !== undefined) setIncludeReasoning(settings.includeReasoning);
                if (settings.deepDive !== undefined) setDeepDive(settings.deepDive);
                if (settings.searchContextSize !== undefined) setSearchContextSize(settings.searchContextSize);
              }}
              disabled={!user || user.tier !== 'pro'} // Disable toggle if not Pro user
            />
          </div>
        </div>

        <div className="relative flex items-center rounded-full border shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10"></div>
          <input
            ref={inputRef}
            type="text"
            placeholder={searchFocus === 'academic' ? "Search academic papers..." : (searchFocus === 'writing' ? "Start writing..." : "Search for anything...")}
            className="flex-grow pl-5 pr-28 sm:pr-32 md:pr-40 py-4 outline-none text-base w-full bg-transparent relative z-10 dark:text-white dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          />
          <div className="flex items-center px-1 sm:px-2 absolute right-0 z-10">
            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors"
                aria-label="Clear Search"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              className="p-1 sm:p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors hidden sm:inline-flex"
              aria-label="Voice Search"
              onClick={() => toast({ title: "Voice Search", description: "Voice search is not yet implemented."})}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-1 sm:p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors hidden sm:inline-flex"
              aria-label="Image Search"
              onClick={() => toast({ title: "Image Search", description: "Image search is not yet implemented."})}
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="ml-1 bg-[hsl(var(--primary))] text-white font-medium px-3 sm:px-6 py-2 rounded-full relative overflow-hidden group text-sm sm:text-base"
              aria-label="Search"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Search</span>
              </span>
            </button>
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-50 border dark:border-gray-700">
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">{suggestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <SubscriptionPrompt
        open={showSubscriptionPrompt}
        onOpenChange={setShowSubscriptionPrompt}
        message={subscriptionPromptMessage}
        showSignInOption={!user} // Show sign-in if not logged in and prompt is for a feature requiring login/tier
      />
    </>
  );
}

