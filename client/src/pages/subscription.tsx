import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle as AlertTriangleIcon, Code as CodeIcon, Check as CheckIcon, AlertCircle } from 'lucide-react';
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
  console.warn('Stripe publishable key missing or invalid. Environment variable VITE_STRIPE_PUBLIC_KEY needs to be set.');
  
  // In development, provide extra information
  if (isDevelopment) {
    console.log('During development, you can request Stripe test keys from the project lead or set up your own Stripe test account.');
    console.log('For testing, use the cards provided in Stripe documentation: https://stripe.com/docs/testing');
  }
}

/**
 * Safely load Stripe with error handling
 * We're using a more controlled approach to prevent runtime errors
 */
function createStripePromise() {
  try {
    if (!isValidStripeKey) {
      console.warn('Not initializing Stripe: Invalid API key');
      return null;
    }
    
    // Dynamically import Stripe to avoid Stripe.js errors during initial page load
    // This moves Stripe loading into a separate request after the application is ready
    return import('@stripe/stripe-js')
      .then(({ loadStripe }) => {
        try {
          return loadStripe(stripeKey);
        } catch (error) {
          console.error('Error initializing Stripe:', error);
          return null;
        }
      })
      .catch(error => {
        console.error('Failed to import Stripe:', error);
        return null;
      });
  } catch (e) {
    console.error('Error in Stripe initialization:', e);
    return null;
  }
}

// We'll create the promise when needed rather than at module load time
let stripePromise: Promise<any> | null = null;

function CheckoutForm({ planType, user, clientSecret }: { planType: 'free' | 'basic' | 'pro', user: any, clientSecret?: string | null }) {
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

    // Check if we're in development mode (using client secret "dev_secret")
    const isDevMode = clientSecret === "dev_secret";
    
    if (!isDevMode && (!stripe || !elements)) {
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
      console.log('Attempting to confirm subscription...');
      
      // Development mode - bypass Stripe payment processing
      if (isDevMode) {
        console.log('[DEV MODE] Processing subscription without actual payment');
        
        try {
          const activateResponse = await apiRequest('POST', '/api/activate-subscription', {
            planType,
            setupIntentId: `dev_setup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          });
          
          const activateData = await activateResponse.json();
          
          if (activateData.success) {
            toast({
              title: "Development Mode",
              description: "Your subscription has been activated without payment in development mode."
            });
            setTimeout(() => setLocation('/'), 2000);
          } else {
            throw new Error(activateData.message || 'Could not activate subscription in development mode');
          }
          return;
        } catch (error: any) {
          console.error("Dev mode subscription error:", error);
          setErrorMessage(error.message);
          toast({
            title: "Subscription Error",
            description: error.message,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }
      
      // Real Stripe payment processing for production mode
      if (!elements || !stripe) {
        console.error("Stripe or Elements not available");
        setErrorMessage("Payment processor is not ready. Please try again in a moment.");
        toast({
          title: "Payment Error",
          description: "Payment processor is not ready. Please try again in a moment.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
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

      // For subscriptions, we use confirmSetup instead of confirmPayment
      // This will set up the payment method for future subscription charges
      const setupResult = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success`
        },
        redirect: 'if_required',
      } as any);
      
      const error = setupResult.error;
      const setupIntent = setupResult.setupIntent as any; // Type assertion to bypass TS errors

      if (error) {
        console.error("Payment confirmation error:", error);
        setErrorMessage(error.message || "An unexpected error occurred");
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
        setIsProcessing(false);
      } else if (setupIntent) {
        // Setup succeeded directly without redirect
        const setupStatus = setupIntent.status || 'unknown';
        const setupId = setupIntent.id || 'unknown';
        console.log('Setup intent succeeded with status:', setupStatus);
        
        // Now activate the subscription with the setup intent
        try {
          const activateResponse = await apiRequest('POST', '/api/activate-subscription', {
            planType,
            setupIntentId: setupId
          });
          
          const activateData = await activateResponse.json();
          
          if (activateData.success) {
            const message = activateData.devMode 
              ? "Development mode: Your subscription has been activated without charging your card." 
              : "Your subscription has been activated!";
            
            toast({
              title: "Subscription Active",
              description: message
            });
            // Redirect to home page
            setTimeout(() => {
              setLocation('/');
            }, 2000);
          } else {
            throw new Error(activateData.message || 'Could not activate subscription');
          }
        } catch (error: any) {
          console.error("Subscription activation error:", error);
          setErrorMessage(error.message || "Could not activate subscription");
          toast({
            title: "Subscription Error",
            description: error.message || "Could not activate your subscription",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
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
  const [planType, setPlanType] = useState<'free' | 'basic' | 'pro'>('pro');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
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

  // Handle plan selection with Stripe Checkout integration
  const handleSelectPlan = async (type: 'free' | 'basic' | 'pro', billingInterval: 'month' | 'year' = 'month') => {
    setPlanType(type);
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe",
        variant: "destructive",
      });
      return;
    }
    
    if (type === 'free') {
      // Free plan doesn't need payment processing
      try {
        const response = await apiRequest('POST', '/api/create-checkout-session', { 
          planType: type,
          billingInterval
        });
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "Free Plan Activated",
            description: "You're now on the free plan with 20 searches per month."
          });
          
          // Redirect to the specified URL or home page
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            setTimeout(() => setLocation('/'), 2000);
          }
        } else {
          toast({
            title: "Subscription Error",
            description: data.message || "Could not change subscription. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Could not activate free plan",
          variant: "destructive",
        });
      }
      return;
    }
    
    // For paid plans, redirect to Stripe Checkout
    setIsLoadingPayment(true);
    
    try {
      // This will create a Checkout Session and return the URL
      const response = await apiRequest('POST', '/api/create-checkout-session', { 
        planType: type,
        billingInterval
      });
      const data = await response.json();
      
      // Handle developer account auto-subscription
      if (data.isDeveloperAccount) {
        toast({
          title: "Subscription Successful",
          description: "As a developer, your account has been automatically upgraded without payment.",
          variant: "default",
        });
        
        // Redirect to the specified URL or home page
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          window.location.href = '/';
        }
        return;
      }
      
      // Handle development mode
      if (data.devMode) {
        toast({
          title: "Development Mode",
          description: data.message || `Your ${type} subscription has been activated in development mode!`
        });
        
        // Redirect to the specified URL or home page
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          setTimeout(() => setLocation('/'), 2000);
        }
        return;
      }
      
      // For normal checkout flow - redirect to the Stripe Checkout page
      if (data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } else if (data.success) {
        // Some accounts might not need payment processing
        toast({
          title: "Subscription Activated",
          description: `Your ${type} subscription has been activated!`
        });
        
        // Redirect to the specified URL or home page
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          setTimeout(() => setLocation('/'), 2000);
        }
      } else {
        // Error case
        toast({
          title: "Checkout Error",
          description: data.message || "Could not create checkout session. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Could not setup checkout for ${type} plan`,
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
      
      {/* Billing interval toggle */}
      <div className="flex justify-center items-center mb-10">
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingInterval === 'month' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted-foreground/10'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingInterval === 'year' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted-foreground/10'
            }`}
          >
            Yearly <span className="text-xs text-emerald-500 font-medium">Save 5%</span>
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="border-2 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Lemur - Free</CardTitle>
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
              onClick={() => handleSelectPlan('free', billingInterval)}
              variant="outline"
              className="w-full"
              disabled={isLoadingPayment}
            >
              {isLoadingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Continue with Free</>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className={`border-2 ${planType === 'basic' ? 'border-primary' : 'border-transparent'}`}>
          <CardHeader>
            <CardTitle>Lemur - Basic</CardTitle>
            <CardDescription>
              {billingInterval === 'month' ? (
                <>$19.99/month</>
              ) : (
                <>$227.89/year <span className="text-xs text-emerald-500">(Save 5%)</span></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              <li className="flex items-center">✓ 100 Searches per month</li>
              <li className="flex items-center">✓ Access to compound-beta-mini model</li>
              <li className="flex items-center">✓ Standard search capabilities</li>
              <li className="flex items-center">✓ Basic filters</li>
              <li className="flex items-center">✓ Save and organize searches</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('basic', billingInterval)} 
              variant={planType === 'basic' ? "default" : "outline"}
              className="w-full"
              disabled={isLoadingPayment}
            >
              {planType === 'basic' && isLoadingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Select Basic'
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className={`border-2 ${planType === 'pro' ? 'border-primary' : 'border-transparent'}`}>
          <CardHeader>
            <CardTitle>Lemur - Pro</CardTitle>
            <CardDescription>
              {billingInterval === 'month' ? (
                <>$49.99/month</>
              ) : (
                <>$569.89/year <span className="text-xs text-emerald-500">(Save 5%)</span></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              <li className="flex items-center">✓ Unlimited searches</li>
              <li className="flex items-center">✓ Access to compound-beta model</li>
              <li className="flex items-center">✓ Advanced search capabilities</li>
              <li className="flex items-center">✓ Deep Research mode</li>
              <li className="flex items-center">✓ Advanced filters & organization</li>
              <li className="flex items-center">✓ Priority support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('pro', billingInterval)} 
              variant={planType === 'pro' ? "default" : "outline"}
              className="w-full"
              disabled={isLoadingPayment}
            >
              {planType === 'pro' && isLoadingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Select Pro'
              )}
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
            {/* Check if we're in development mode (client secret is "dev_secret") */}
            {clientSecret === "dev_secret" ? (
              <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 mb-4">
                <h3 className="text-yellow-800 dark:text-yellow-200 font-semibold flex items-center">
                  <AlertTriangleIcon className="h-5 w-5 mr-2" />
                  Development Mode
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mt-2 text-sm">
                  No actual payment will be processed. This is a development environment simulation.
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fakeDomEvent = { preventDefault: () => {} } as React.FormEvent;
                  // Create a fake instance of the checkout form handler
                  const handleDevCheckout = async () => {
                    try {
                      const activateResponse = await apiRequest('POST', '/api/activate-subscription', {
                        planType,
                        setupIntentId: `dev_setup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                      });
                      
                      const activateData = await activateResponse.json();
                      
                      if (activateData.success) {
                        toast({
                          title: "Development Mode",
                          description: "Your subscription has been activated without payment in development mode."
                        });
                        setTimeout(() => setLocation('/'), 2000);
                      } else {
                        throw new Error(activateData.message || 'Could not activate subscription in development mode');
                      }
                    } catch (error: any) {
                      toast({
                        title: "Subscription Error",
                        description: error.message || "An error occurred during development mode subscription",
                        variant: "destructive",
                      });
                    }
                  };
                  
                  handleDevCheckout();
                }} className="mt-4">
                  <Button type="submit" className="w-full">
                    Simulate Payment & Subscribe (Dev Mode)
                  </Button>
                </form>
              </div>
            ) : (
              <>
                {/* Add error handling in case Stripe fails to load */}
                <div id="stripe-error-wrapper" className="hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800 mb-6">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Payment Processing Unavailable</h3>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          We're experiencing technical difficulties with our payment processor. 
                          Please try again later or contact support if the problem persists.
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-3 text-xs" 
                          onClick={() => window.location.reload()}
                        >
                          <Loader2 className="mr-2 h-3 w-3" /> Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Add script to detect Stripe load failures and show the error */}
                <script dangerouslySetInnerHTML={{ __html: `
                  // Simple detection for Stripe.js loading failures
                  setTimeout(() => {
                    if (!window.Stripe) {
                      document.getElementById('stripe-error-wrapper').classList.remove('hidden');
                    }
                  }, 5000);
                `}} />
                
                <Elements 
                  stripe={stripePromise || createStripePromise()} 
                  options={{ 
                    clientSecret,
                    appearance: { theme: 'stripe' },
                    // Customize options to make sure the element appears and is activated
                    loader: 'always',
                  }}
                >
                  <CheckoutForm planType={planType} user={user} clientSecret={clientSecret} />
                </Elements>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
