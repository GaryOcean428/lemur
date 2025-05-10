import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BugIcon, FileJson, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AgenticResearchDebug() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const isProUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer';

  const handleDebugClick = async () => {
    if (!isProUser) {
      toast({
        title: "Pro Feature",
        description: "This debug feature is only available to Pro users.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug/agentic-research', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDebugData(data);
      toast({
        title: "Debug Data Retrieved",
        description: "Successfully fetched agentic research debug data.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: "Error",
        description: "Failed to fetch debug data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BugIcon className="h-5 w-5" />
          Agentic Research Debug
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={handleDebugClick}
            disabled={isLoading || !isProUser}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FileJson className="mr-2 h-4 w-4" />
                Fetch Debug Data
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-md">
              <XCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {debugData && (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-sm font-medium">Debug Data Retrieved</p>
                </div>
                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
