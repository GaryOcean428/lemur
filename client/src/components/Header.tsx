import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import lemurLogo from "../assets/images/Lemur6.png";
import { ThemeToggle } from "./theme-toggle";
import SubscriptionBadge from "./SubscriptionBadge";

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
    <header className="border-b border-gray-200 bg-background dark:bg-gray-900">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">Lemur</span>
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
          {user && (
            <Link href="/preferences" className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
              Preferences
            </Link>
          )}
          
          <ThemeToggle />
          
          {isLoading ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading
            </Button>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Hi, {user.username}</span>
                <div className="flex items-center gap-2 mt-1">
                  <SubscriptionBadge />
                  {user.subscriptionTier !== 'pro' && (
                    <Link href="/subscription" className="text-xs text-primary hover:underline">
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"></span>
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
            <Link href="/auth" className="bg-[hsl(var(--primary))] text-white px-4 py-1 rounded-full hover:bg-[hsl(var(--primary-dark))] transition-colors relative overflow-hidden group">
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
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
        <div className="md:hidden bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
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
            {user && (
              <Link href="/preferences" className="py-2 text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors">
                Preferences
              </Link>
            )}
            
            <div className="py-2 flex items-center">
              <span className="mr-2">Theme:</span>
              <ThemeToggle />
            </div>
            
            {isLoading ? (
              <div className="py-2 flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading
              </div>
            ) : user ? (
              <div className="py-2 space-y-2">
                <div className="font-medium">Hi, {user.username}</div>
                <div className="flex items-center gap-2">
                  <SubscriptionBadge />
                  {user.subscriptionTier !== 'pro' && (
                    <Link href="/subscription" className="text-xs text-primary hover:underline">
                      Upgrade
                    </Link>
                  )}
                </div>
                <button 
                  className="text-[hsl(var(--primary))] font-medium relative group overflow-hidden px-2 py-1 rounded-md mt-2"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <span className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <Link href="/auth" className="py-2 px-4 text-white font-medium bg-[hsl(var(--primary))] rounded-full inline-block relative overflow-hidden group">
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
