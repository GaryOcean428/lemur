import SearchForm from "@/components/SearchForm";
import lemurLogo from "../assets/images/Lemur6.png";
import WasmCheck from "@/components/WasmCheck";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showWasmCheck, setShowWasmCheck] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Large centered logo with glow effect */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-32 h-32 mb-2 relative group">
            <div className="absolute -inset-3 bg-[hsl(var(--glow-neon))] rounded-full blur-lg group-hover:blur-xl opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
            <img src={lemurLogo} alt="Lemur logo" className="w-full h-full relative z-10 object-contain" />
          </div>
          <p className="text-lg text-[hsl(var(--neutral-muted))] mb-8 text-center max-w-md dark:text-gray-300">
            Discover information with AI-powered insights and web results
          </p>
        </div>
        
        {/* Search form with subtle card effect */}
        <div className="w-full max-w-2xl mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-secondary/5 dark:bg-secondary/10 rounded-2xl blur-xl -z-10"></div>
          <SearchForm />
          <p className="text-center text-sm text-[hsl(var(--neutral-muted))] mt-4 dark:text-gray-400">
            Enter a search query to get started
          </p>
        </div>
        
        {/* Diagnostic button for Vercel deployment */}
        <div className="mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowWasmCheck(!showWasmCheck)}
            className="text-xs"
          >
            {showWasmCheck ? "Hide" : "Show"} WebAssembly Diagnostics
          </Button>
        </div>
        
        {/* WebAssembly diagnostic component */}
        {showWasmCheck && (
          <div className="w-full max-w-2xl mt-4">
            <WasmCheck />
          </div>
        )}
      </div>
    </div>
  );
}
