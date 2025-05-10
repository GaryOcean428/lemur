import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
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
        // setIsSignUp(false); // Optionally switch to sign-in form or close
        if (onSuccess) onSuccess();
        if (onClose) onClose(); // Close form on success
      } else {
        await signInWithEmailPassword({ email, password });
        toast({ title: 'Signed In!', description: 'Welcome back!' });
        if (onSuccess) onSuccess();
        if (onClose) onClose(); // Close form on success
      }
    } catch (caughtError: any) {
      // The useAuth hook might already toast, but we can ensure it here or customize.
      // The error from useAuth hook is `authHookError`.
      // We can also catch specific errors here if needed.
      console.error('AuthForm submit error:', caughtError);
      setFormError(caughtError.message || 'An unexpected error occurred.');
      // No need to toast again if useAuth already does it for authHookError
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
          <Button variant="outline" onClick={async () => {
            try {
              await signInWithGoogle();
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            } catch (err) { /* error already handled by useAuth toast */ }
          }} disabled={isLoading}>
            {/* TODO: Add Google Icon e.g. using lucide-react or react-icons */}
            Google
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              await signInWithGitHub();
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            } catch (err) { /* error already handled by useAuth toast */ }
          }} disabled={isLoading}>
            {/* TODO: Add GitHub Icon */}
            GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
