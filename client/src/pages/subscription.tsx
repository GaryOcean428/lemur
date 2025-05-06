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

// Get Stripe key from environment variable
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

// Validate the key and provide user feedback
const isValidStripeKey = stripeKey && stripeKey.startsWith('pk_');

// Show appropriate console messages but never the full key
if (isValidStripeKey) {
  console.log('Using Stripe publishable key starting with:', stripeKey.substring(0, 8) + '...');
} else {
  console.log('Stripe publishable key missing or invalid. Environment variable VITE_STRIPE_PUBLIC_KEY needs to be set.');
  
  // In development, provide extra information
  if (isDevelopment) {
    console.log('During development, you can request Stripe test keys from the project lead or set up your own Stripe test account.');
    console.log('For testing, use the cards provided in Stripe documentation: https://stripe.com/docs/testing');
  }
}

// Only attempt to load Stripe with a valid key
const stripePromise = isValidStripeKey ? loadStripe(stripeKey) : null;

function CheckoutForm({ planType, user }: { planType: 'basic' | 'pro', user: any }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isElementReady, setIsElementReady] = useState(false);

  // Log element mounting for debugging
  useEffect(() => {
    console.log('Stripe available:', !!stripe);
    console.log('Elements available:', !!elements);
  }, [stripe, elements]);

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
                setTimeout(() => setLocation('/subscription/success'), 2000);
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
      console.error("Stripe or Elements not available");
      toast({
        title: "Payment Error",
        description: "Payment processor is not ready. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Attempting to confirm payment...');
      
      // First, verify all elements are complete
      const { error: elementsError } = await elements.submit();
      if (elementsError) {
        console.error("Elements validation error:", elementsError);
        setErrorMessage(elementsError.message || "Please complete all payment fields");
        toast({
          title: "Payment Information Incomplete",
          description: elementsError.message || "Please complete all payment fields",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Confirm payment with proper return URL
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success`
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error("Payment confirmation error:", error);
        setErrorMessage(error.message || "An unexpected error occurred");
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
        setIsProcessing(false);
      } else if (paymentIntent) {
        // Payment succeeded directly without redirect
        console.log('Payment succeeded with status:', paymentIntent.status);
        toast({
          title: "Payment Successful",
          description: "Your subscription has been activated!"
        });
        // Redirect to success page
        setTimeout(() => {
          setLocation('/subscription/success');
        }, 2000);
      } else {
        // Payment requires additional action handled by Stripe.js (like 3D Secure)
        console.log('Payment requires additional actions');
        toast({
          title: "Processing Payment",
          description: "Following the secure payment process. Please complete any additional steps."
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

  // Track when the payment element is ready
  const handleReady = () => {
    console.log('Payment element is ready');
    setIsElementReady(true);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6 min-h-[200px]">
        <PaymentElement 
          onReady={handleReady}
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: user?.username || '',
                email: user?.email || '',
              }
            },
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
              }
            }
          }}
        />
      </div>
      {errorMessage && (
        <div className="text-red-500 mb-4 text-sm">{errorMessage}</div>
      )}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !elements || !isElementReady || isProcessing}
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
  
  // Check for authentication status first before proceeding
  
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
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast({
          title: "Payment Setup Error",
          description: "Could not initialize payment. Please try again or contact support.",
          variant: "destructive",
        });
      }
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

  // Handle missing Stripe configuration
  if (!isValidStripeKey) {
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <Card className="border-red-200 mb-8">
          <CardHeader>
            <CardTitle className="text-red-500">Payment System Unavailable</CardTitle>
            <CardDescription>
              The payment system is temporarily unavailable. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDevelopment ? (
              <div className="space-y-3">
                <p>To enable the payment system in development mode, please set the following environment variables:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>VITE_STRIPE_PUBLIC_KEY</code> - Your Stripe publishable key (starts with 'pk_')</li>
                  <li><code>STRIPE_SECRET_KEY</code> - Your Stripe secret key (starts with 'sk_')</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  For development, you can use Stripe test keys from their dashboard. 
                  Once set, the payment system will function with test cards.
                </p>
              </div>
            ) : (
              <p>Our team has been notified about this issue and is working to resolve it as soon as possible.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation('/')}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Upgrade Your Lemur Experience</h1>
      
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="border-2 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>$0/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              <li className="flex items-center">✓ 20 Searches per month</li>
              <li className="flex items-center">✓ Access to compound-beta-mini model</li>
              <li className="flex items-center">✓ Basic search capabilities</li>
              <li className="flex items-center">✓ Standard results</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => {
                // Direct API call for free tier
                apiRequest('POST', '/api/create-subscription', { tier: 'free' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      toast({
                        title: "Free Plan Activated",
                        description: "You're now on the free plan with 20 searches per month."
                      });
                      // Redirect to home page
                      setTimeout(() => setLocation('/'), 2000);
                    }
                  })
                  .catch(error => {
                    toast({
                      title: "Error",
                      description: error.message || "Could not activate free plan",
                      variant: "destructive",
                    });
                  });
              }}
              variant="outline"
              className="w-full"
            >
              Continue with Free
            </Button>
          </CardFooter>
        </Card>
        
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
              <li className="flex items-center">✓ Upgrade from 20 free searches</li>
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
              <li className="flex items-center">✓ 300 Searches per month</li>
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
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: { theme: 'stripe' },
                // Customize options to make sure the element appears and is activated
                loader: 'always',
              }}
            >
              <CheckoutForm planType={planType} user={user} />
            </Elements>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
