import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, BookOpen, FileSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export interface DeepResearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  extracted_content?: string;
  source_quality?: number;
  source_type?: string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
  summary?: string;
}

export interface DeepResearchResponse {
  results: DeepResearchResult[];
  query: string;
  topic_clusters?: {
    [key: string]: string[];
  };
  estimated_analysis_depth?: string;
  research_summary?: string;
  user_tier?: string;
}

interface UrlContentResponse {
  url: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Advanced Deep Research component for Pro-tier users
 * Provides in-depth research capabilities using Tavily
 */
export default function DeepResearchPanel() {
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [researchResults, setResearchResults] = useState<DeepResearchResponse | null>(null);
  const [extractedContent, setExtractedContent] = useState<UrlContentResponse | null>(null);
  const [activeTab, setActiveTab] = useState('research');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isProUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer';
  
  const handleResearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Research query required",
        description: "Please enter a research topic to investigate",
        variant: "destructive"
      });
      return;
    }
    
    if (!isProUser) {
      toast({
        title: "Pro subscription required",
        description: "Advanced research is a Pro tier feature. Please upgrade your subscription to access this feature.",
        variant: "destructive"
      });
      return;
    }
    
    setIsResearching(true);
    setResearchResults(null);
    
    try {
      const response = await apiRequest<DeepResearchResponse>('POST', '/api/deep-research', {
        query: query.trim(),
        options: {
          crawl_depth: 'medium',
          extract_content: true,
          generate_summary: true
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResearchResults(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform deep research');
      }
    } catch (error: any) {
      toast({
        title: "Research failed",
        description: error.message || "An unexpected error occurred during research",
        variant: "destructive"
      });
    } finally {
      setIsResearching(false);
    }
  };
  
  const handleExtractContent = async () => {
    if (!extractUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to extract content from",
        variant: "destructive"
      });
      return;
    }
    
    if (!isProUser) {
      toast({
        title: "Pro subscription required",
        description: "Content extraction is a Pro tier feature. Please upgrade your subscription to access this feature.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExtracting(true);
    setExtractedContent(null);
    
    try {
      const response = await apiRequest<UrlContentResponse>('POST', '/api/extract-content', {
        url: extractUrl.trim()
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtractedContent(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to extract content');
      }
    } catch (error: any) {
      toast({
        title: "Extraction failed",
        description: error.message || "An unexpected error occurred during extraction",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Advanced Research</h2>
        <p className="text-muted-foreground">
          Pro-tier deep research capabilities for comprehensive information gathering
        </p>
        
        {!isProUser && (
          <Card className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-yellow-700 dark:text-yellow-300">Pro Subscription Required</h3>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Advanced research features require a Pro subscription. Upgrade to access these powerful tools.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="research">Deep Research</TabsTrigger>
          <TabsTrigger value="extract">Extract Content</TabsTrigger>
        </TabsList>
        
        <TabsContent value="research" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span>Deep Research</span>
              </CardTitle>
              <CardDescription>
                Conduct comprehensive research on a topic with in-depth analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter research topic..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                  disabled={isResearching}
                />
                <Button
                  onClick={handleResearch}
                  disabled={isResearching || !query.trim() || !isProUser}
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    'Research'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {researchResults && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle>
                  Research Results: {researchResults.query}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  {researchResults.estimated_analysis_depth && (
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                      Analysis Depth: {researchResults.estimated_analysis_depth}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    {researchResults.results.length} sources
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mt-4">
                  {researchResults.research_summary && (
                    <div className="mb-6 p-4 bg-primary/5 rounded-lg border">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Research Summary
                      </h3>
                      <p className="text-sm whitespace-pre-line">{researchResults.research_summary}</p>
                    </div>
                  )}
                  
                  {researchResults.topic_clusters && Object.keys(researchResults.topic_clusters).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-2">Topic Clusters</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(researchResults.topic_clusters).map(([topic, keywords]) => (
                          <div key={topic} className="border rounded-lg p-3">
                            <h4 className="font-medium text-sm">{topic}</h4>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {keywords.map((keyword) => (
                                <Badge key={keyword} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h3 className="text-md font-semibold mb-3">Research Sources</h3>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      <div className="space-y-6">
                        {researchResults.results.map((result, index) => (
                          <div key={index} className="border-b pb-4 last:border-b-0">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">
                                <a 
                                  href={result.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {result.title}
                                </a>
                              </h4>
                              <Badge variant="outline">
                                Score: {Math.round(result.score * 100)}%
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2 truncate">
                              {result.url}
                            </p>
                            
                            {result.published_date && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Published: {new Date(result.published_date).toLocaleDateString()}
                              </p>
                            )}
                            
                            <div className="mt-3">
                              {result.summary ? (
                                <div>
                                  <p className="text-sm font-medium mb-1">Summary:</p>
                                  <p className="text-sm">{result.summary}</p>
                                </div>
                              ) : (
                                <p className="text-sm">{result.content}</p>
                              )}
                            </div>
                            
                            {result.citations && result.citations.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-1">Citations:</p>
                                <ul className="text-xs text-muted-foreground list-disc pl-5">
                                  {result.citations.map((citation, citIndex) => (
                                    <li key={citIndex} className="mb-1">
                                      "{citation.text}" - <span className="text-blue-600 dark:text-blue-400">{citation.source}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="extract" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                <span>Extract Content</span>
              </CardTitle>
              <CardDescription>
                Extract and analyze content from any URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter URL to extract..."
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  className="flex-1"
                  disabled={isExtracting}
                />
                <Button
                  onClick={handleExtractContent}
                  disabled={isExtracting || !extractUrl.trim() || !isProUser}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    'Extract'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {extractedContent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {extractedContent.error ? 'Extraction Error' : extractedContent.title}
                </CardTitle>
                {!extractedContent.error && (
                  <p className="text-sm text-muted-foreground truncate">
                    <a 
                      href={extractedContent.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {extractedContent.url}
                    </a>
                  </p>
                )}
              </CardHeader>
              
              <CardContent>
                {extractedContent.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-400">{extractedContent.error}</p>
                  </div>
                ) : (
                  <div>
                    {extractedContent.metadata && Object.keys(extractedContent.metadata).length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-md font-semibold mb-2">Metadata</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(extractedContent.metadata).map(([key, value]) => {
                            // Skip displaying large objects or arrays
                            if (typeof value === 'object' && value !== null) return null;
                            if (typeof value === 'string' && value.length > 200) {
                              value = value.substring(0, 200) + '...';
                            }
                            
                            return (
                              <div key={key} className="border rounded-lg p-3">
                                <h4 className="font-medium text-xs text-muted-foreground">{key}</h4>
                                <p className="mt-1 text-sm">{String(value)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <Separator className="my-4" />
                    
                    <div>
                      <h3 className="text-md font-semibold mb-3">Extracted Content</h3>
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <div className="whitespace-pre-line prose dark:prose-invert prose-sm max-w-none">
                          {extractedContent.content}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}