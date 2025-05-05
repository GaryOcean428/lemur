import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface SubscriptionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
  showSignInOption?: boolean;
}

export default function SubscriptionPrompt({ 
  open, 
  onOpenChange,
  message = 'You\'ve reached your search limit on the free plan.',
  showSignInOption = true
}: SubscriptionPromptProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Determine if user is logged in
  const isLoggedIn = !!user;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold mb-2">
            Upgrade to Search More
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <div className="rounded-lg border p-4 dark:bg-gray-950">
              <h3 className="font-medium mb-2">Free Plan</h3>
              <ul className="space-y-2 mb-4 text-sm">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                  <span>5 searches per account</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                  <span>Fast AI model (mini)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                  <span>Limited AI answer length</span>
                </li>
              </ul>
              <div className="font-semibold mb-2">Free</div>
              {!isLoggedIn && showSignInOption && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              )}
            </div>
            
            {/* Pro Plan */}
            <div className="rounded-lg border p-4 border-primary/50 relative overflow-hidden dark:bg-gray-950">
              <div className="absolute inset-0 bg-primary/5"></div>
              <div className="relative z-10">
                <h3 className="font-medium mb-2">Pro Plan</h3>
                <ul className="space-y-2 mb-4 text-sm">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                    <span>Unlimited searches</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                    <span>Advanced AI model (full)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                    <span>Complete AI answers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                    <span>Deep research capability</span>
                  </li>
                </ul>
                <div className="font-semibold mb-2">$29.99/month</div>
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/subscription')}
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Maybe Later</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
