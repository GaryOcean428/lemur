import { useState } from "react";
import { useLocation } from "wouter";
import { Mic, Camera, Search } from "lucide-react";

interface SearchFormProps {
  initialQuery?: string;
}

export default function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    setLocation(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center rounded-full border shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10"></div>
        <input 
          type="text" 
          placeholder="Search for anything..." 
          className="flex-grow px-5 py-4 outline-none text-base w-full bg-transparent relative z-10 dark:text-white dark:placeholder-gray-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center px-2 absolute right-0 z-10">
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
    </form>
  );
}
