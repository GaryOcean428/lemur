import { useEffect } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DeepResearchPanel from '@/components/DeepResearchPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Deep Research Page for Pro-tier users
 * This page provides advanced research capabilities for comprehensive information gathering
 */
export default function DeepResearchPage() {
  const { user, isLoading } = useAuth();
  
  // Check if user is authenticated and has Pro tier access
  const isProUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer';
  
  useEffect(() => {
    // Set page title
    document.title = 'Advanced Research | Lemur';
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto py-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // If not authenticated, redirect to login page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto py-8">
          
          {!isProUser ? (
            <div className="max-w-3xl mx-auto">
              <Card className="border-yellow-300 dark:border-yellow-700">
                <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    <CardTitle>Pro Subscription Required</CardTitle>
                  </div>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    Advanced research tools are exclusive to Pro tier subscribers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Why Upgrade to Pro?</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>Comprehensive deep research capabilities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>Advanced content extraction and analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>In-depth topic clustering and summarization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>Extended search limits and full model access</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button size="lg" className="px-6">
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <DeepResearchPanel />
          )}
          
        </div>
      </main>
      <Footer />
    </div>
  );
}