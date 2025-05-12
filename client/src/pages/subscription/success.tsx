import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubscriptionSuccessPage() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    tier: string;
    status: string;
    expiresAt?: string;
  } | null>(null);
  const { toast } = useToast();

  // Extract session ID from URL on component mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const session_id = url.searchParams.get('session_id');
    if (session_id) {
      setSessionId(session_id);
    } else {
      setStatus('error');
      setIsLoading(false);
    }
  }, []);

  // Verify the subscription status with our backend
  useEffect(() => {
    if (sessionId) {
      verifySubscription(sessionId);
    }
  }, [sessionId]);

  const verifySubscription = async (sessionId: string) => {
    try {
      const response = await apiRequest('POST', '/api/verify-subscription', { sessionId });
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setSubscriptionDetails(data.subscription);
        
        toast({
          title: "Subscription Activated",
          description: `Your ${data.subscription.tier} plan is now active.`,
        });
      } else {
        setStatus('error');
        
        toast({
          title: "Verification Failed",
          description: data.message || "Could not verify your subscription. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying subscription:", error);
      setStatus('error');
      
      toast({
        title: "Verification Error",
        description: "An error occurred while verifying your subscription. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-16 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verifying Your Subscription</h1>
        <p className="text-muted-foreground text-center">
          We're confirming your payment and activating your subscription...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container max-w-4xl mx-auto py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Subscription Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your subscription at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>There was an issue verifying your subscription. This could be due to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Payment processing delay</li>
              <li>Session expiration</li>
              <li>Technical issues on our end</li>
            </ul>
            <p className="mt-4">
              If you believe your payment was successful, please check your email for a receipt from Stripe 
              and contact our support team with your receipt details.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation('/subscription')}>
              Back to Subscription
            </Button>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-16">
      <Card className="border-emerald-200">
        <CardHeader className="bg-emerald-50 dark:bg-emerald-950/20">
          <div className="mx-auto rounded-full w-12 h-12 flex items-center justify-center bg-emerald-100 text-emerald-700 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <CardTitle className="text-center text-emerald-700 dark:text-emerald-400">Subscription Successful!</CardTitle>
          <CardDescription className="text-center">
            Thank you for subscribing to Lemur {subscriptionDetails?.tier.charAt(0).toUpperCase() + subscriptionDetails?.tier.slice(1)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-center">
              Your subscription is now active. You can start enjoying all the benefits of your {subscriptionDetails?.tier} plan immediately.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Subscription Details</h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">Lemur - {subscriptionDetails?.tier.charAt(0).toUpperCase() + subscriptionDetails?.tier.slice(1)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{subscriptionDetails?.status || 'Active'}</span>
                </li>
                {subscriptionDetails?.expiresAt && (
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Current Period Ends:</span>
                    <span className="font-medium">{new Date(subscriptionDetails.expiresAt).toLocaleDateString()}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => setLocation('/')}>
            Start Using Lemur
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}