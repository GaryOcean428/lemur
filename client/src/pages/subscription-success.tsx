import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

// This component handles displaying a success message after subscribing
export default function SubscriptionSuccessPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="container max-w-md mx-auto py-16">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Subscription Successful!</CardTitle>
          <CardDescription className="text-center">
            Thank you for upgrading your Lemur search experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            Your payment has been processed successfully and your account has been upgraded. 
            You now have access to all premium features including unlimited searches and our Deep Research capabilities.
          </p>
          <p className="text-center font-medium">
            Welcome to the Pro experience!
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => setLocation('/')}
            className="px-8"
          >
            Start Searching
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
