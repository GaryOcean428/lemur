import { useState } from "react";
import { Link } from "wouter";
import { useAuth, AppUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AuthForm } from "./AuthForm"; // Import the new AuthForm

const UserTierDisplay = ({ user }: { user: AppUser }) => {
  return (
    <div className="text-xs text-muted-foreground">
      <span>Tier: {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}</span>
      {user.searchLimit !== "Infinity" && (
        <span className="ml-2">
          Searches: {user.searchCount}/{user.searchLimit}
        </span>
      )}
    </div>
  );
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false); // State to control AuthForm modal
  const { user, isLoading, logout, signInWithGoogle, signInWithGitHub } = useAuth(); 

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleAuthSuccess = () => {
    setShowAuthForm(false); // Close modal on successful authentication
  };

  return (
    <header className="border-b border-gray-200 bg-background dark:bg-gray-900 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">Lemur</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex space-x-4 items-center">
          <Link href="/about" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
            About
          </Link>
          {user && (
            <>
              <Link href="/preferences" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
                Preferences
              </Link>
               <Link href="/history" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
                History
              </Link>
            </>
          )}
          
          <ThemeToggle />
          
          {isLoading ? (
            <Button disabled size="sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading
            </Button>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Hi, {user.displayName || user.email}</span>
                <UserTierDisplay user={user} />
                {user.tier !== 'pro' && (
                    <Link href="/subscription" className="text-xs text-primary hover:underline mt-0.5">
                      Upgrade to Pro
                    </Link>
                  )}
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"></span>
                Sign Out
              </Button>
            </div>
          ) : (
            // Updated Sign In button to open the AuthForm modal
            <Button onClick={() => setShowAuthForm(true)} size="sm" className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary-dark))] transition-colors relative overflow-hidden group">
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              Sign In
            </Button>
            // We can add separate Google/GitHub buttons here or inside the AuthForm if needed
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

      {isMenuOpen && (
        <div className="md:hidden bg-background dark:bg-gray-900 border-t border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col px-4 py-2 space-y-3">
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              About
            </Link>
            {user && (
              <>
                <Link href="/preferences" onClick={() => setIsMenuOpen(false)} className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
                  Preferences
                </Link>
                <Link href="/history" onClick={() => setIsMenuOpen(false)} className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
                  History
                </Link>
              </>
            )}
            
            <div className="py-2 flex items-center justify-between">
              <span className="text-[hsl(var(--neutral-muted))]">Theme:</span>
              <ThemeToggle />
            </div>
            
            {isLoading ? (
              <div className="py-2 flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading
              </div>
            ) : user ? (
              <div className="py-2 space-y-2 border-t pt-3 mt-2">
                <div className="font-medium">Hi, {user.displayName || user.email}</div>
                <UserTierDisplay user={user} />
                {user.tier !== 'pro' && (
                    <Link href="/subscription" onClick={() => setIsMenuOpen(false)} className="text-xs text-primary hover:underline mt-0.5 block">
                      Upgrade to Pro
                    </Link>
                  )}
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={async () => { await handleLogout(); setIsMenuOpen(false); }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              // Updated Sign In button for mobile menu to open AuthForm modal
              <Button onClick={() => { setShowAuthForm(true); setIsMenuOpen(false); }} size="sm" className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary-dark))] transition-colors relative overflow-hidden group">
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Render AuthForm modal */} 
      {showAuthForm && <AuthForm onSuccess={handleAuthSuccess} onClose={() => setShowAuthForm(false)} />}
    </header>
  );
}

