import React from 'react';
import { Route, Switch, useRoute, Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Beaker,
  Bookmark,
  FileText,
  Globe,
  Home,
  Image,
  Menu,
  Newspaper,
  PanelTop,
  Quote,
  Sparkles,
  Lightbulb
} from 'lucide-react';

// Lazy-loaded tool components - the files exist in lowercase
const ContentSummarizerLazy = React.lazy(() => import('./tools/ContentSummarizer')); 
const CitationGeneratorLazy = React.lazy(() => import('./tools/CitationGenerator'));
const SavedSearchesLazy = React.lazy(() => import('./tools/SavedSearches'));

// Create wrapped versions that handle Suspense internally
const ContentSummarizer = () => (
  <React.Suspense fallback={<div>Loading Content Summarizer...</div>}>
    <ContentSummarizerLazy />
  </React.Suspense>
);

const CitationGenerator = () => (
  <React.Suspense fallback={<div>Loading Citation Generator...</div>}>
    <CitationGeneratorLazy />
  </React.Suspense>
);

const SavedSearches = () => (
  <React.Suspense fallback={<div>Loading Saved Searches...</div>}>
    <SavedSearchesLazy />
  </React.Suspense>
);

// Placeholder components for tools not yet implemented
const DomainResearch = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">Domain Research</h1>
    <div className="border rounded-lg p-10 text-center">
      <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        Domain Research will provide comprehensive analysis of websites, including authority metrics, content categorization, and technology stack identification.
      </p>
    </div>
  </div>
);

const ResearchDashboard = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">Research Dashboard</h1>
    <div className="border rounded-lg p-10 text-center">
      <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        The Research Dashboard will help you organize multiple searches and insights into a cohesive project.
      </p>
    </div>
  </div>
);

const ContentExport = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">Content Export</h1>
    <div className="border rounded-lg p-10 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        Export your search results and AI-generated content in multiple formats.
      </p>
    </div>
  </div>
);

const ImageSearch = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">Visual Search</h1>
    <div className="border rounded-lg p-10 text-center">
      <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        Upload images to search for visually similar content or extract information from images.
      </p>
    </div>
  </div>
);

const NewsAggregator = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">News Aggregator</h1>
    <div className="border rounded-lg p-10 text-center">
      <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        Stay updated with customized news feeds tailored to your interests.
      </p>
    </div>
  </div>
);

const TrendAnalyzer = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold mb-6">Trend Analyzer</h1>
    <div className="border rounded-lg p-10 text-center">
      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-xl text-muted-foreground mb-4">
        This feature is coming soon
      </p>
      <p className="text-muted-foreground">
        Analyze and visualize trending topics and content over time.
      </p>
    </div>
  </div>
);

// Tool item type
type ToolItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredTier: 'free' | 'basic' | 'pro';
  description: string;
  implementationStatus: 'ready' | 'coming-soon';
};

// Tool categories and items
const toolCategories = [
  {
    category: "Content Tools",
    items: [
      {
        name: "Content Summarizer",
        href: "/tools/content-summarizer",
        icon: FileText,
        requiredTier: 'free',
        description: "Generate concise summaries of web pages and documents",
        implementationStatus: 'ready',
      },
      {
        name: "Citation Generator",
        href: "/tools/citation-generator",
        icon: Quote,
        requiredTier: 'free',
        description: "Create properly formatted citations in multiple styles",
        implementationStatus: 'ready',
      },
      {
        name: "Content Export",
        href: "/tools/content-export",
        icon: FileText,
        requiredTier: 'basic',
        description: "Export search results in multiple formats",
        implementationStatus: 'coming-soon',
      },
    ],
  },
  {
    category: "Research Tools",
    items: [
      {
        name: "Saved Searches",
        href: "/tools/saved-searches",
        icon: Bookmark,
        requiredTier: 'free',
        description: "Organize and revisit your past searches",
        implementationStatus: 'ready',
      },
      {
        name: "Domain Research",
        href: "/tools/domain-research",
        icon: Globe,
        requiredTier: 'basic',
        description: "Comprehensive analysis of websites and domains",
        implementationStatus: 'coming-soon',
      },
      {
        name: "Research Dashboard",
        href: "/tools/research-dashboard",
        icon: PanelTop,
        requiredTier: 'basic',
        description: "Centralized hub for managing research projects",
        implementationStatus: 'coming-soon',
      },
    ],
  },
  {
    category: "Advanced Search",
    items: [
      {
        name: "Image Search",
        href: "/tools/image-search",
        icon: Image,
        requiredTier: 'basic',
        description: "Search using images with AI-powered analysis",
        implementationStatus: 'coming-soon',
      },
      {
        name: "News Aggregator",
        href: "/tools/news-aggregator",
        icon: Newspaper,
        requiredTier: 'pro',
        description: "Customizable news feed with filtering",
        implementationStatus: 'coming-soon',
      },
      {
        name: "Trend Analyzer",
        href: "/tools/trend-analyzer",
        icon: Sparkles,
        requiredTier: 'pro',
        description: "Identify and visualize trending topics",
        implementationStatus: 'coming-soon',
      },
    ],
  },
];

// Sidebar component
const Sidebar = () => {
  const { user } = useAuth();
  const userTier = user?.subscriptionTier || 'free';
  
  // Check if user can access a tool based on tier
  const canAccess = (requiredTier: string): boolean => {
    if (requiredTier === 'free') return true;
    if (requiredTier === 'basic') return userTier === 'basic' || userTier === 'pro';
    if (requiredTier === 'pro') return userTier === 'pro';
    return false;
  };

  return (
    <div className="w-64 h-full py-4 border-r">
      <div className="px-3 py-2">
        <Link href="/">
          <a className="flex items-center py-2 text-sm font-medium">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </a>
        </Link>
        <h2 className="mb-2 mt-4 px-4 text-lg font-semibold tracking-tight">
          Tools
        </h2>
        <div className="space-y-4">
          {toolCategories.map((category) => (
            <div key={category.category}>
              <h3 className="px-4 py-2 text-sm font-medium text-muted-foreground">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((tool) => {
                  const [isActive] = useRoute(tool.href);
                  const isAccessible = canAccess(tool.requiredTier);
                  const isImplemented = tool.implementationStatus === 'ready';
                  
                  return (
                    <Link key={tool.href} href={isAccessible && isImplemented ? tool.href : '#'}>
                      <a
                        className={cn(
                          "flex items-center py-2 px-4 text-sm font-medium rounded-md",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50 hover:text-accent-foreground",
                          (!isAccessible || !isImplemented) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={(e) => {
                          if (!isAccessible || !isImplemented) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <tool.icon className="w-4 h-4 mr-2" />
                        {tool.name}
                        {!isImplemented && (
                          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                            Soon
                          </span>
                        )}
                        {!isAccessible && isImplemented && (
                          <span className="ml-auto text-xs bg-muted-foreground text-primary-foreground px-1.5 py-0.5 rounded">
                            {tool.requiredTier}
                          </span>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile sidebar (sheet)
const MobileSidebar = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};

// Tools welcome page (displayed when no specific tool is selected)
const ToolsWelcome = () => {
  const { user } = useAuth();
  const userTier = user?.subscriptionTier || 'free';
  
  // Check if user can access a tool based on tier
  const canAccess = (requiredTier: string): boolean => {
    if (requiredTier === 'free') return true;
    if (requiredTier === 'basic') return userTier === 'basic' || userTier === 'pro';
    if (requiredTier === 'pro') return userTier === 'pro';
    return false;
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-6">Lemur Research Tools</h1>
      <p className="text-xl text-muted-foreground mb-10">
        Explore our specialized tools to enhance your research and content analysis.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {toolCategories.flatMap(category => 
          category.items.map(tool => {
            const isAccessible = canAccess(tool.requiredTier);
            const isImplemented = tool.implementationStatus === 'ready';
            
            return (
              <div 
                key={tool.href}
                className={cn(
                  "border rounded-lg p-6 transition-all",
                  isAccessible && isImplemented
                    ? "hover:shadow-md hover:border-primary/50 cursor-pointer"
                    : "opacity-70"
                )}
                onClick={() => {
                  if (isAccessible && isImplemented) {
                    window.location.href = tool.href;
                  }
                }}
              >
                <div className="flex items-center mb-4">
                  <div className="mr-4 p-2 bg-primary/10 rounded-full">
                    <tool.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {tool.requiredTier.charAt(0).toUpperCase() + tool.requiredTier.slice(1)} Tier
                    </p>
                  </div>
                  {!isImplemented && (
                    <span className="ml-auto text-xs bg-muted px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
                {!isAccessible && isImplemented && (
                  <div className="mt-4 flex">
                    <Link href="/settings/subscription">
                      <a className="text-sm text-primary">
                        Upgrade to access
                      </a>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Main component
export default function ToolsPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      {isDesktop ? (
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
      ) : (
        <div className="flex items-center p-4 border-b">
          <MobileSidebar />
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">Tools</h1>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        }>
          <Switch>
            <Route path="/tools" component={ToolsWelcome} />
            <Route path="/tools/content-summarizer" component={ContentSummarizer} />
            <Route path="/tools/citation-generator" component={CitationGenerator} />
            <Route path="/tools/saved-searches" component={SavedSearches} />
            <Route path="/tools/domain-research" component={DomainResearch} />
            <Route path="/tools/research-dashboard" component={ResearchDashboard} />
            <Route path="/tools/content-export" component={ContentExport} />
            <Route path="/tools/image-search" component={ImageSearch} />
            <Route path="/tools/news-aggregator" component={NewsAggregator} />
            <Route path="/tools/trend-analyzer" component={TrendAnalyzer} />
            <Route>
              {() => <div>404 - Tool Not Found</div>}
            </Route>
          </Switch>
        </React.Suspense>
      </div>
    </div>
  );
}