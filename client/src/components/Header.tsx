import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoading, logoutMutation } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="w-10 h-10 mr-2">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M30 40 Q 20 20 40 15 Q 45 15 45 25 L 45 35 Q 45 40 40 42 Q 25 48 30 40 Z" fill="#4B2A91" />
                <circle cx="23" cy="38" r="3" fill="#FF9BB3" />
                <path d="M75 40 Q 85 60 65 65 Q 60 65 60 55 L 60 45 Q 60 40 65 38 Q 80 32 75 40 Z" fill="#FFB6D9" />
                <path d="M40 42 Q 50 60 60 45" stroke="#4B2A91" strokeWidth="3" fill="none" />
                <circle cx="77" cy="62" r="3" fill="#4B2A91" />
                <path d="M55 55 Q 65 75 75 65" stroke="#8FDFD9" strokeWidth="9" fill="none" />
                <path d="M55 55 Q 65 75 75 65" stroke="#4B2A91" strokeWidth="3" fill="none" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-[hsl(var(--primary))]">Lemur</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex space-x-4 items-center">
          <Link href="/about" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            About
          </Link>
          <Link href="/tools" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            Tools
          </Link>
          <Link href="/settings" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            Settings
          </Link>
          
          {isLoading ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading
            </Button>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Hi, {user.username}</span>
              <Button 
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing out
                  </>
                ) : (
                  "Sign Out"
                )}
              </Button>
            </div>
          ) : (
            <Link href="/auth" className="bg-[hsl(var(--primary))] text-white px-4 py-1 rounded-full hover:bg-[hsl(var(--primary-dark))] transition-colors">
              Sign In
            </Link>
          )}
        </nav>
        
        <button 
          className="md:hidden"
          aria-label="Menu"
          onClick={toggleMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="6" y2="6"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex flex-col px-4 py-2 space-y-3">
            <Link href="/about" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              About
            </Link>
            <Link href="/tools" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              Tools
            </Link>
            <Link href="/settings" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              Settings
            </Link>
            
            {isLoading ? (
              <div className="py-2 flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading
              </div>
            ) : user ? (
              <div className="py-2 space-y-2">
                <div className="font-medium">Hi, {user.username}</div>
                <button 
                  className="text-[hsl(var(--primary))] font-medium"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <Link href="/auth" className="py-2 text-[hsl(var(--primary))] font-medium">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
