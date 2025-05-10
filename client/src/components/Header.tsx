import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AuthForm } from '@/components/AuthForm';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';

export function Header() {
  const { user, logout } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Lemur</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search input could go here */}
          </div>
          <nav className="flex items-center space-x-2">
            {user ? (
              <>
                <SubscriptionBadge />
                <Button variant="ghost" onClick={() => logout()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuthForm(true)}>
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </div>
      {showAuthForm && (
        <AuthForm
          onSuccess={() => setShowAuthForm(false)}
          onClose={() => setShowAuthForm(false)}
        />
      )}
    </header>
  );
}
