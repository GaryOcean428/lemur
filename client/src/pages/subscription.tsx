import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

function CheckoutForm({ planType }: { planType: 'basic' | 'pro' }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check payment intent status on mount or when URL params change
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");

    if (clientSecret) {
      stripe.retrievePaymentIntent(clientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case "succeeded":
                toast({
                  title: "Payment Successful",
                  description: "Thank you for your subscription!"
                });
                // Redirect to success page after a short delay
                setTimeout(() => setLocation('/subscription-success'), 2000);
                break;
              case "processing":
                toast({
                  title: "Payment Processing",
                  description: "Your payment is being processed."
                });
                break;
              case "requires_payment_method":
                setErrorMessage("Your payment was not successful. Please try again.");
                toast({
                  title: "Payment Failed",
                  description: "Your payment was not successful. Please try again.",
                  variant: "destructive"
                });
                break;
              default:
                setErrorMessage("Something went wrong.");
                toast({
                  title: "Payment Error",
                  description: "Something went wrong with your payment.",
                  variant: "destructive"
                });
                break;
            }
          }
        })
        .catch(err => {
          console.error("Error checking payment intent:", err);
        });
    }
  }, [stripe, toast, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet. Make sure to disable form submission until loaded.
      return;
    }

    setIsProcessing(true);

    try {
      // Use correct return URL that matches your routes
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-success`
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || "An unexpected error occurred");
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
        setIsProcessing(false);
      } else {
        // Payment succeeded or requires further actions handled by Stripe
        toast({
          title: "Processing Payment",
          description: "Your payment is being processed. Please wait."
        });
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Something went wrong");
      toast({
        title: "Payment Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement className="mb-6" />
      {errorMessage && (
        <div className="text-red-500 mb-4 text-sm">{errorMessage}</div>
      )}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe to ${planType === 'pro' ? 'Pro' : 'Basic'} Plan`
        )}
      </Button>
    </form>
  );
}

export default function SubscriptionPage() {
  const { user, isLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'basic' | 'pro'>('pro');
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Debugging to check proper environment variable loading and formatting
  useEffect(() => {
    // Check if we have a publishable key and it's formatted correctly
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!stripeKey) {
      console.error('VITE_STRIPE_PUBLIC_KEY is not defined in environment');
    } else if (!stripeKey.startsWith('pk_')) {
      console.error('VITE_STRIPE_PUBLIC_KEY should start with pk_, check your environment variables');
    } else {
      console.log('Stripe publishable key is properly configured');
    }
  }, []);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  // Already subscribed
  if (user?.subscriptionTier === 'pro') {
    const isDeveloperAccount = user.username === 'GaryOcean';
    
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>{isDeveloperAccount ? 'Developer Account' : 'You\'re already a Pro member!'}</CardTitle>
            <CardDescription>
              {isDeveloperAccount 
                ? 'As a developer, you have complete access to all Pro features without charge.' 
                : 'You\'re already enjoying all the benefits of the Pro tier.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDeveloperAccount ? (
              <p className="text-sm text-muted-foreground">
                Your developer status grants you unlimited access to all premium features, 
                including unlimited searches, the full compound-beta model, and advanced research capabilities.
              </p>
            ) : (
              <p>Your subscription is active until {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : 'forever'}.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation('/')}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSelectPlan = async (type: 'basic' | 'pro') => {
    setPlanType(type);
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingPayment(true);
    
    try {
      const response = await apiRequest('POST', '/api/create-subscription', { planType: type });
      const data = await response.json();
      
      // Handle developer account auto-subscription
      if (data.isDeveloperAccount) {
        toast({
          title: "Subscription Successful",
          description: "As a developer, your account has been automatically upgraded without payment.",
          variant: "default",
        });
        
        // Reload to get updated user data
        window.location.href = '/';
        return;
      }
      
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not initialize payment",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Upgrade Your Lemur Experience</h1>
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Card className={`border-2 ${planType === 'basic' ? 'border-primary' : 'border-transparent'}`}>
          <CardHeader>
            <CardTitle>Basic Plan</CardTitle>
            <CardDescription>$9.99/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              <li className="flex items-center">✓ 100 Searches per month</li>
              <li className="flex items-center">✓ Access to compound-beta-mini model</li>
              <li className="flex items-center">✓ Standard search capabilities</li>
              <li className="flex items-center">✓ Basic filters</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('basic')} 
              variant={planType === 'basic' ? "default" : "outline"}
              className="w-full"
              disabled={isLoadingPayment}
            >
              {planType === 'basic' ? 'Selected' : 'Select Basic'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className={`border-2 ${planType === 'pro' ? 'border-primary' : 'border-transparent'}`}>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>$29.99/month</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">✓ Unlimited searches</li>
              <li className="flex items-center">✓ Access to full compound-beta model</li>
              <li className="flex items-center">✓ Deep Research capability</li>
              <li className="flex items-center">✓ Advanced filters and personalization</li>
              <li className="flex items-center">✓ Priority support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('pro')} 
              variant={planType === 'pro' ? "default" : "outline"}
              className="w-full"
              disabled={isLoadingPayment}
            >
              {planType === 'pro' ? 'Selected' : 'Select Pro'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {isLoadingPayment ? (
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3">Preparing payment form...</p>
          </CardContent>
        </Card>
      ) : clientSecret ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>
              You're subscribing to our {planType === 'pro' ? 'Pro' : 'Basic'} plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm planType={planType} />
            </Elements>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
