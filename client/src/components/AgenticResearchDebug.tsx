import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, BugIcon, FileJson, Search, CheckCircle2, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

/**
 * This debug component is used to test and debug the agentic research process.
 * It helps identify issues with the OpenAI integration and Tavily search.
 */
export default function AgenticResearchDebug() {
  const [query, setQuery] = useState('how does quantum computing work');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const isProUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer';

  // Test the agentic research endpoint directly
  const testAgenticResearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Query required',
        description: 'Please enter a search query to test',
        variant: 'destructive'
      });
      return;
    }

    if (!isProUser) {
      toast({
        title: 'Pro subscription required',
        description: 'Advanced research is a Pro tier feature. This is just a test component.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProcessLog(['Starting agentic research test...']);

    try {
      const response = await apiRequest('POST', '/api/debug/agentic-research', {
        query: query.trim(),
        options: {
          search_depth: 'medium',
          max_results: 10,
          max_iterations: 2,
          debug_mode: true, // Request verbose logging
          user_intent: true, // Enable user intent recognition
          alternate_search: true // Enable alternate search approaches
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        
        // Extract and format process steps
        if (data.process_log && Array.isArray(data.process_log)) {
          setProcessLog([
            'Agentic research completed successfully',
            ...data.process_log
          ]);
        } else {
          // Fall back to general data inspection
          const processSteps = [];
          
          if (data.iterations) {
            processSteps.push(`Completed ${data.iterations} research iterations`);
          }
          
          if (data.debug_info) {
            processSteps.push(`Debug info: ${JSON.stringify(data.debug_info, null, 2)}`);
          }
          
          setProcessLog([
            'Agentic research completed successfully',
            ...(processSteps.length > 0 ? processSteps : ['No detailed process steps available']),
            `Response preview: ${JSON.stringify(data, null, 2).substring(0, 500)}...`
          ]);
        }

        // Show success notification
        toast({
          title: 'Research completed',
          description: 'Agentic research process completed successfully.',
          variant: 'default'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform deep research');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setProcessLog(prev => [...prev, `ERROR: ${err.message || 'Unknown error'}`]);
      toast({
        title: 'Research test failed',
        description: err.message || 'An unexpected error occurred during research',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BugIcon className="h-5 w-5" />
            <span>Agentic Research Debug Tool</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This tool helps debug the agentic research process with reasoning loops, critiques, and refinements.
            It requires Pro tier access.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="Enter research query..."
                disabled={isLoading}
              />
              <Button
                onClick={testAgenticResearch}
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Research'
                )}
              </Button>
            </div>

            {isLoading && (
              <div className="p-4 bg-primary/5 rounded-md flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Testing agentic research process...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-700 dark:text-red-300">Error Encountered</h3>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            {processLog.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Process Log
                </h3>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="space-y-2">
                    {processLog.map((log, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-muted-foreground mr-2">[{index}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {result && (
              <div className="mt-4">
                <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Research Results
                </h3>
                <div className="rounded-md border p-4">
                  <div className="mb-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Research Summary</h4>
                      {result.iterations && (
                        <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                          {result.iterations} research iteration{result.iterations !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-line">
                      {result.research_summary || result.answer || 'No summary available'}
                    </p>
                  </div>
                  
                  {result.debug_info && (
                    <div className="mb-3 text-xs text-muted-foreground">
                      <div className="flex gap-2">
                        <span>Process time:</span>
                        <span>{(result.debug_info.duration_ms / 1000).toFixed(2)}s</span>
                      </div>
                      <div className="flex gap-2">
                        <span>Model:</span>
                        <span>OpenAI GPT-4o</span>
                      </div>
                    </div>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sources ({result.results?.length || 0})</h4>
                    {result.results && result.results.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {result.results.map((source: any, idx: number) => (
                            <div key={idx} className="text-sm border-b pb-2 last:border-b-0">
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                {source.title || 'Untitled Source'}
                              </a>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {source.url}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No sources returned</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
