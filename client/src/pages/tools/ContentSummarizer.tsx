import React, { useState } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Clipboard, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock API call for content summarization
const summarizeContent = async (
  content: { url?: string; text?: string },
  type: 'concise' | 'detailed' | 'key-points' = 'concise'
): Promise<{ summary: string; originalTitle?: string; originalSource?: string; model: string }> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate API response
      let summary = '';
      let originalTitle = '';
      let originalSource = '';
      
      if (content.url) {
        originalTitle = 'Sample Article Title';
        originalSource = content.url;
        
        if (type === 'concise') {
          summary = "This is a concise summary of the content at the provided URL. It covers the main points succinctly in a few sentences, focusing only on the most critical information. The summary is designed to give readers a quick overview without unnecessary details.";
        } else if (type === 'detailed') {
          summary = "This is a detailed summary of the content at the provided URL. It provides a comprehensive overview of all major points and supporting details.\n\nThe summary is broken into paragraphs to maintain readability while ensuring thorough coverage of the subject matter. Various aspects of the topic are explored with sufficient context for understanding.\n\nConclusions and implications are included to give readers a complete picture of the content's significance and relevance.";
        } else {
          summary = "• The first key point extracted from the article\n• The second important concept from the content\n• A critical finding or conclusion from the article\n• An important statistic or data point mentioned\n• The main argument or thesis of the content\n• A significant implication discussed in the article";
        }
      } else if (content.text) {
        if (type === 'concise') {
          summary = "This is a concise summary of the provided text. It extracts only the most essential information, presenting it in a brief format that can be quickly understood.";
        } else if (type === 'detailed') {
          summary = "This is a detailed summary of the provided text. It carefully analyzes the content to extract all significant information and contextual elements.\n\nThe summary maintains the structure of the original text where appropriate, ensuring that the relationship between ideas is preserved. Both explicit statements and implicit meanings are captured.\n\nThe conclusion integrates the various elements to provide a comprehensive understanding of the original content.";
        } else {
          summary = "• First key point from the provided text\n• Second important concept identified\n• Third critical element from the content\n• Fourth significant aspect mentioned\n• Fifth notable detail or conclusion";
        }
      }
      
      resolve({
        summary,
        originalTitle: originalTitle || undefined,
        originalSource: originalSource || undefined,
        model: 'compound-beta-mini' // Would be the actual model used
      });
    }, 1500); // Simulate network delay
  });
};

export default function ContentSummarizer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [inputTab, setInputTab] = useState('url');
  const [summaryType, setSummaryType] = useState<'concise' | 'detailed' | 'key-points'>('concise');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ 
    content: string; 
    title?: string; 
    source?: string;
    model: string;
  } | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputTab === 'url' && !url.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid URL to summarize",
        variant: "destructive"
      });
      return;
    }
    
    if (inputTab === 'text' && !text.trim()) {
      toast({
        title: "Missing Text",
        description: "Please enter some text to summarize",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const content = inputTab === 'url' ? { url: url.trim() } : { text: text.trim() };
      const result = await summarizeContent(content, summaryType);
      
      setSummary({
        content: result.summary,
        title: result.originalTitle,
        source: result.originalSource,
        model: result.model
      });
      
      toast({
        title: "Summary Generated",
        description: "Your content has been successfully summarized"
      });
    } catch (error) {
      console.error('Error summarizing content:', error);
      toast({
        title: "Summarization Failed",
        description: "There was an error generating your summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = () => {
    setUrl('');
    setText('');
    setSummary(null);
  };
  
  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary.content);
      toast({
        title: "Copied",
        description: "Summary copied to clipboard"
      });
    }
  };
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-2">Content Summarizer</h1>
      <p className="text-muted-foreground mb-6">
        Generate concise summaries of articles, web pages, and text using AI
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Input Content</CardTitle>
                <CardDescription>
                  Enter a URL or paste text to summarize
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={inputTab} onValueChange={setInputTab} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url-input">Web Page URL</Label>
                      <div className="flex">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="url-input"
                            placeholder="https://example.com/article"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        {url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="ml-2"
                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="text-input">Text Content</Label>
                      <Textarea
                        id="text-input"
                        placeholder="Paste or type the text you want to summarize..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6 space-y-2">
                  <Label htmlFor="summary-type">Summary Type</Label>
                  <RadioGroup
                    id="summary-type"
                    value={summaryType}
                    onValueChange={(value) => setSummaryType(value as any)}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="concise" id="concise" />
                      <Label htmlFor="concise" className="cursor-pointer">Concise</Label>
                      <span className="text-xs text-muted-foreground">(Brief overview)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="detailed" id="detailed" />
                      <Label htmlFor="detailed" className="cursor-pointer">Detailed</Label>
                      <span className="text-xs text-muted-foreground">(Comprehensive summary)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="key-points" id="key-points" />
                      <Label htmlFor="key-points" className="cursor-pointer">Key Points</Label>
                      <span className="text-xs text-muted-foreground">(Bullet point format)</span>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
          
          {/* Usage limitations based on user tier */}
          <div className="mt-4">
            <Alert variant="outline">
              <FileText className="h-4 w-4" />
              <AlertTitle>Usage Information</AlertTitle>
              <AlertDescription>
                {!user ? (
                  "Sign in to save your summaries and access more features."
                ) : user.subscriptionTier === "free" ? (
                  "Free tier includes 5 summaries per day with basic features."
                ) : user.subscriptionTier === "basic" ? (
                  "Basic tier includes 20 summaries per day with all features."
                ) : (
                  "Pro tier includes unlimited summaries with all features."
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        {/* Output Section */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                {summary?.model ? `Generated using ${summary.model}` : "AI-generated summary will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-full mt-4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              ) : summary ? (
                <div>
                  {summary.title && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg">{summary.title}</h3>
                      {summary.source && (
                        <a 
                          href={summary.source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {summary.source}
                        </a>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-line">{summary.content}</div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a URL or text and click "Generate Summary" to create a summary</p>
                  </div>
                </div>
              )}
            </CardContent>
            {summary && (
              <CardFooter className="flex justify-end">
                <Button variant="outline" onClick={handleCopy}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy Summary
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}