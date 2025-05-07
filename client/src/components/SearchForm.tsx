import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Mic, Camera, Search, X } from "lucide-react";
import { fetchSearchSuggestions } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import SubscriptionPrompt from "./SubscriptionPrompt";
import DeepResearchToggle from "./DeepResearchToggle";

interface SearchFormProps {
  initialQuery?: string;
  isFollowUp?: boolean;
}

export default function SearchForm({ initialQuery = "", isFollowUp = false }: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [subscriptionPromptMessage, setSubscriptionPromptMessage] = useState("");
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch suggestions when the search query changes
  useEffect(() => {
    async function fetchSuggestions() {
      if (searchQuery.length >= 2) {
        try {
          const results = await fetchSearchSuggestions(searchQuery);
          setSuggestions(results);
          if (results.length > 0) {
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    
    // Use our custom debounce by wrapping the function call
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  // Handle clicks outside the form to close suggestions
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    setShowSuggestions(false);
    
    // Check search limits only for free tier users
    // For anonymous users, the server will enforce the 1 search limit via sessions
    if (user && user.subscriptionTier === 'free' && user.searchCount >= 5) {
      // For free tier users, we'll check their search count
      setSubscriptionPromptMessage("You've reached your limit of free searches. Upgrade to continue searching with Lemur.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Check if user tries to use deep research but is not a pro user
    if (deepResearchEnabled && user && user.subscriptionTier !== 'pro' && user.subscriptionTier !== 'developer') {
      setSubscriptionPromptMessage("Advanced Research is a Pro feature. Upgrade to access comprehensive research capabilities.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Proceed with search, include follow-up parameter if applicable
    let searchUrl = `/search?q=${encodeURIComponent(trimmedQuery)}`;
    if (isFollowUp) {
      searchUrl += '&isFollowUp=true';
    }
    
    // Add deep research parameter if enabled (only for Pro users)
    if (deepResearchEnabled && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer')) {
      searchUrl += '&deepResearch=true';
    }
    
    setLocation(searchUrl);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    
    // For anonymous users, let them search once - limit will be enforced by the server
    // Logged-in free users have a 5 search limit
    if (user && user.subscriptionTier === 'free' && user.searchCount >= 5) {
      setSubscriptionPromptMessage("You've reached your limit of free searches. Upgrade to continue searching with Lemur.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Check if user tries to use deep research but is not a pro user
    if (deepResearchEnabled && user && user.subscriptionTier !== 'pro' && user.subscriptionTier !== 'developer') {
      setSubscriptionPromptMessage("Advanced Research is a Pro feature. Upgrade to access comprehensive research capabilities.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Proceed with search, include follow-up parameter if applicable
    let searchUrl = `/search?q=${encodeURIComponent(suggestion)}`;
    if (isFollowUp) {
      searchUrl += '&isFollowUp=true';
    }
    
    // Add deep research parameter if enabled (only for Pro users)
    if (deepResearchEnabled && (user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer')) {
      searchUrl += '&deepResearch=true';
    }
    
    setLocation(searchUrl);
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
        {/* Deep Research Toggle UI */}
        <div className="mb-3 flex justify-end">
          <DeepResearchToggle 
            enabled={deepResearchEnabled} 
            onChange={setDeepResearchEnabled} 
          />
        </div>
        
        <div className="relative flex items-center rounded-full border shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10"></div>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search for anything..." 
            className="flex-grow px-5 py-4 outline-none text-base w-full bg-transparent relative z-10 dark:text-white dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          />
          <div className="flex items-center px-2 absolute right-0 z-10">
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
              className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors" 
              aria-label="Voice Search" 
            >
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="button" 
              className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors" 
              aria-label="Image Search" 
            >
              <Camera className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              className="ml-1 bg-[hsl(var(--primary))] text-white font-medium px-6 py-2 rounded-full relative overflow-hidden group"
              aria-label="Search"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-1" />
                Search
              </span>
            </button>
          </div>
        </div>
        
        {/* Search suggestions dropdown */}
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
      
      {/* Subscription prompt dialog */}
      <SubscriptionPrompt 
        open={showSubscriptionPrompt} 
        onOpenChange={setShowSubscriptionPrompt} 
        message={subscriptionPromptMessage}
        showSignInOption={!user}
      />
    </>
  );
}
