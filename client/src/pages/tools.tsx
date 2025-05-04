import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Share2, Newspaper, Code, Bookmark, Download, Camera, Globe, FileText, BarChart } from "lucide-react";
import { useLocation } from "wouter";

export default function ToolsPage() {
  const [, setLocation] = useLocation();

  const handleToolClick = (toolPath: string) => {
    // In the future, this would navigate to the specific tool
    // For now, we'll just show a demo alert
    alert(`Tool feature '${toolPath}' will be implemented in a future update`);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Lemur Tools</h1>
        <p className="text-xl text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto">
          Enhance your search experience with powerful search tools and utilities
        </p>
      </div>

      <Tabs defaultValue="search" className="mb-12">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="search" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Search Tools
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Content Tools
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            Analytics Tools
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl" 
                  onClick={() => handleToolClick('/tools/advanced-search')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Advanced Search
                </CardTitle>
                <CardDescription>
                  Fine-tune your search parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Create complex searches with filters for date ranges, specific domains, file types, and more. Perfect for research and specialized queries.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/image-search')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Visual Search
                </CardTitle>
                <CardDescription>
                  Search using images instead of text
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Upload or link to images and find visually similar content, identify objects, or get information about what's shown in the picture.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/domain-research')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Domain Research
                </CardTitle>
                <CardDescription>
                  Analyze websites and domains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Get comprehensive information about domains including content overview, keywords, backlinks, and technical insights.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/saved-searches')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bookmark className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Saved Searches
                </CardTitle>
                <CardDescription>
                  Manage your search history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Save, organize, and set alerts for your searches. Get notified when new results become available for topics you care about.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/content-summarizer')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Content Summarizer
                </CardTitle>
                <CardDescription>
                  Generate concise summaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Paste any text or URL to get an AI-generated summary of the content, saving you time while retaining key information.
                </p>
                <div className="mt-4">
                  <Textarea placeholder="Paste URL or content to summarize..." className="mb-2" />
                  <Button className="w-full">Summarize</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/citation-generator')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Citation Generator
                </CardTitle>
                <CardDescription>
                  Create proper citations for any source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Generate citations in APA, MLA, Chicago, and other formats. Perfect for academic research and content creation.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/news-aggregator')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Newspaper className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  News Aggregator
                </CardTitle>
                <CardDescription>
                  Stay updated with customized news feeds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Create personalized news feeds based on topics, locations, and sources that matter to you. Filter out noise and focus on relevant stories.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/content-export')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Export & Share
                </CardTitle>
                <CardDescription>
                  Save and distribute search results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Export search results and AI-generated answers in various formats (PDF, Word, HTML) or share them directly via email and social platforms.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/trend-analyzer')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Trend Analyzer
                </CardTitle>
                <CardDescription>
                  Track topic popularity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Visualize search trends and topic popularity. Compare multiple terms to discover patterns and track interest over time.
                </p>
                <div className="mt-4">
                  <Input placeholder="Enter topic or keyword..." className="mb-2" />
                  <Button className="w-full">Analyze Trends</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => handleToolClick('/tools/research-dashboard')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                  Research Dashboard
                </CardTitle>
                <CardDescription>
                  Organize and track research projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[hsl(var(--neutral-muted))]">
                  Create organized research projects with saved searches, notes, and collaborative features. Perfect for teams and complex research tasks.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="text-[hsl(var(--primary))]">
                  Open Tool
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold mb-4 text-center dark:text-white">Lemur API Access</h2>
        <p className="text-center text-[hsl(var(--neutral-muted))] mb-6">
          Integrate Lemur's powerful search capabilities into your own applications
        </p>
        <div className="flex justify-center">
          <Button onClick={() => setLocation('/api')} className="bg-[hsl(var(--primary))] hover:bg-primary-dark text-white">
            Explore API Documentation
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Beta Access Program</h2>
        <p className="text-[hsl(var(--neutral-muted))] mb-6">
          Join our beta program to get early access to upcoming tools and features. Share your feedback to help shape the future of Lemur.
        </p>
        <div className="flex items-center space-x-2 mb-6">
          <Switch id="beta-access" />
          <Label htmlFor="beta-access">Enable beta features</Label>
        </div>
        <Button variant="outline">Join Beta Program</Button>
      </div>
    </div>
  );
}
