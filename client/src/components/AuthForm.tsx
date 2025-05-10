import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  onSuccess?: () => void; // Callback for successful auth
  onClose?: () => void; // Callback to close the form/modal
}

export function AuthForm({ onSuccess, onClose }: AuthFormProps) {
  const { signUpWithEmailPassword, signInWithEmailPassword, signInWithGoogle, signInWithGitHub, isLoading, error: authHookError } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // To toggle between Sign In and Sign Up
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Email and password are required.');
      toast({ title: 'Error', description: 'Email and password are required.', variant: 'destructive' });
      return;
    }
    try {
      if (isSignUp) {
        await signUpWithEmailPassword({ email, password });
        toast({ title: 'Signed Up!', description: 'Welcome! You are now signed in.' });
        if (onSuccess) onSuccess();
        if (onClose) onClose(); // Close form on success
      } else {
        await signInWithEmailPassword({ email, password });
        toast({ title: 'Signed In!', description: 'Welcome back!' });
        if (onSuccess) onSuccess();
        if (onClose) onClose(); // Close form on success
      }
    } catch (caughtError: any) {
      console.error('AuthForm submit error:', caughtError);
      setFormError(caughtError.message || 'An unexpected error occurred.');
    }
  };

  const handleSocialSignIn = async (provider: () => Promise<void>) => {
    try {
      await provider();
      // Don't close immediately for redirect authentication
      // The page will be redirected and then back after successful auth
      // onSuccess and onClose will be handled by the redirect result handler
    } catch (err: any) {
      // Check if this is a popup-related error that's being handled by redirect
      if (err.code !== 'auth/popup-blocked' && err.code !== 'auth/popup-closed-by-user') {
        // For other errors, execute onSuccess/onClose as they won't trigger redirect
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{isSignUp ? 'Create an Account' : 'Sign In'}</h3>
          {onClose && <Button variant="ghost" size="icon" onClick={onClose}>X</Button>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>
          {(formError || authHookError) && <p className="text-sm text-destructive">{formError || authHookError?.message}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>
        <Button variant="link" onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }} className="w-full mt-4">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleSocialSignIn(signInWithGoogle)} 
            disabled={isLoading}
            className="flex items-center justify-center"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSocialSignIn(signInWithGitHub)} 
            disabled={isLoading}
            className="flex items-center justify-center"
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
