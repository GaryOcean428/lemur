import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ManageSubscriptionPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isLoadingSubscriptionData, setIsLoadingSubscriptionData] = useState(false);
  const [isLoading_cancelSubscription, setIsLoading_cancelSubscription] = useState(false);
  const [isLoading_changeSubscription, setIsLoading_changeSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showDowngradeToFreeDialog, setShowDowngradeToFreeDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Load subscription data
  useEffect(() => {
    async function loadSubscriptionData() {
      if (!user) return;
      
      setIsLoadingSubscriptionData(true);
      
      try {
        const response = await apiRequest('GET', '/api/subscription');
        const data = await response.json();
        setSubscriptionData(data);
      } catch (error: any) {
        console.error('Error loading subscription data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription details. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSubscriptionData(false);
      }
    }
    
    loadSubscriptionData();
  }, [user, toast]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);
  
  // Free users don't have a subscription to manage
  if (user?.subscriptionTier === 'free') {
    return (
      <div className="container max-w-3xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>No active subscription</CardTitle>
            <CardDescription>
              You're currently on the free plan. Upgrade to access more features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Upgrade to a paid plan to access additional features like increased search limits,
              advanced models, and enhanced research capabilities.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/subscription')} className="mr-4">
              View subscription options
            </Button>
            <Button variant="outline" onClick={() => setLocation('/')}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Special handling for developer accounts
  const isDeveloperAccount = user?.username === 'GaryOcean';
  if (isDeveloperAccount) {
    return (
      <div className="container max-w-3xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Developer Account</CardTitle>
            <CardDescription>
              As a developer, you have complete access to all Pro features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your developer status grants you unlimited access to all premium features
              without requiring payment or subscription management.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation('/')}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Handle subscription operations
  const handleCancelSubscription = async () => {
    setIsLoading_cancelSubscription(true);
    try {
      const response = await apiRequest('POST', '/api/cancel-subscription');
      
      if (response.ok) {
        toast({
          title: 'Subscription Cancelled',
          description: 'Your subscription has been cancelled successfully. You will have access to paid features until the end of your current billing period.',
        });
        // Redirect to home or refresh page
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while cancelling your subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading_cancelSubscription(false);
      setShowCancelDialog(false);
    }
  };
  
  const handleChangeSubscription = async (newPlan: 'free' | 'basic' | 'pro') => {
    const isUpgrade = user?.subscriptionTier === 'basic' && newPlan === 'pro';
    const isDowngrade = user?.subscriptionTier === 'pro' && newPlan === 'basic';
    
    setIsLoading_changeSubscription(true);
    try {
      const response = await apiRequest('POST', '/api/change-subscription', { planType: newPlan });
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle special case for immediate downgrades
        if (isDowngrade && !data.requiresPayment) {
          toast({
            title: 'Plan Changed',
            description: 'Your plan has been changed to Basic. The change will take effect at the end of your current billing period.',
          });
          // Redirect to home or refresh page
          window.location.href = '/';
          return;
        }
        
        // For upgrades or downgrades requiring payment confirmation
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          // Redirect to subscription page to continue payment
          setLocation('/subscription?plan=' + newPlan);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change subscription');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while changing your subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading_changeSubscription(false);
      setShowUpgradeDialog(false);
      setShowDowngradeDialog(false);
      setShowDowngradeToFreeDialog(false);
    }
  };
  
  if (isLoading || isLoadingSubscriptionData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Manage Your Subscription</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan: {user?.subscriptionTier === 'pro' ? 'Pro' : 'Basic'}</CardTitle>
          <CardDescription>
            {user?.subscriptionExpiresAt ? 
              `Active until ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}` : 
              'Active subscription'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.subscriptionTier === 'basic' ? (
            <div className="space-y-2">
              <p className="font-medium">Basic Plan Features:</p>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>100 Searches per month</li>
                <li>Access to compound-beta-mini model</li>
                <li>Standard search capabilities</li>
                <li>Basic filters</li>
              </ul>
              <div className="flex items-center mt-4 p-4 rounded-md bg-muted">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                <p className="text-sm">Upgrade to Pro to access advanced features and unlimited searches.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">Pro Plan Features:</p>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>Unlimited searches</li>
                <li>Access to full compound-beta model</li>
                <li>Deep Research capability</li>
                <li>Advanced filters and personalization</li>
                <li>Priority support</li>
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-4">
          {user?.subscriptionTier === 'basic' ? (
            <>
              <Button 
                onClick={() => setShowUpgradeDialog(true)}
                disabled={isLoading_changeSubscription}
              >
                {isLoading_changeSubscription ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : 'Upgrade to Pro'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowCancelDialog(true)}
                disabled={isLoading_cancelSubscription}
              >
                {isLoading_cancelSubscription ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : 'Cancel Subscription'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowDowngradeDialog(true)}
                disabled={isLoading_changeSubscription}
                className="mr-2"
              >
                {isLoading_changeSubscription ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : 'Downgrade to Basic'}
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowDowngradeToFreeDialog(true)}
                disabled={isLoading_changeSubscription}
                className="mr-2"
              >
                {isLoading_changeSubscription ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : 'Downgrade to Free'}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => setShowCancelDialog(true)}
                disabled={isLoading_cancelSubscription}
              >
                {isLoading_cancelSubscription ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : 'Cancel Subscription'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
      
      {/* Back to settings button */}
      <div className="flex">
        <Button variant="ghost" onClick={() => setLocation('/settings')}>
          &larr; Back to Settings
        </Button>
      </div>
      
      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Your Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCancelDialog(false)}
              disabled={isLoading_cancelSubscription}
            >
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isLoading_cancelSubscription}
            >
              {isLoading_cancelSubscription ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelling...</>
              ) : 'Yes, Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro?</DialogTitle>
            <DialogDescription>
              You're about to upgrade to the Pro plan at $29.99/month. This gives you access to unlimited searches, the advanced compound-beta model, and deep research capabilities.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUpgradeDialog(false)}
              disabled={isLoading_changeSubscription}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleChangeSubscription('pro')}
              disabled={isLoading_changeSubscription}
            >
              {isLoading_changeSubscription ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Downgrade Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade to Basic?</DialogTitle>
            <DialogDescription>
              You're about to downgrade to the Basic plan at $9.99/month. Your Pro plan benefits will remain active until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDowngradeDialog(false)}
              disabled={isLoading_changeSubscription}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => handleChangeSubscription('basic')}
              disabled={isLoading_changeSubscription}
            >
              {isLoading_changeSubscription ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : 'Confirm Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade to Free Dialog */}
      <Dialog open={showDowngradeToFreeDialog} onOpenChange={setShowDowngradeToFreeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade to Free?</DialogTitle>
            <DialogDescription>
              You're about to downgrade to the Free plan. You'll have limited search capability (20 searches/month), and access to only the basic model. Your current plan benefits will remain active until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDowngradeToFreeDialog(false)}
              disabled={isLoading_changeSubscription}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => handleChangeSubscription('free')}
              disabled={isLoading_changeSubscription}
            >
              {isLoading_changeSubscription ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : 'Confirm Downgrade to Free'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
