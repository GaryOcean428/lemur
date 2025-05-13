import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileText,
  Link as LinkIcon,
  Calendar,
  AlignLeft,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import { Chart } from "react-chartjs-2"; // Import Chart component
import { Responsive, WidthProvider } from "react-grid-layout"; // Import ReactGridLayout

const ReactGridLayout = WidthProvider(Responsive); // Initialize ReactGridLayout

// Create a synchronous version of marked.parse to avoid Promise issues
const parseMarkdown = (text: string): string => {
  try {
    return marked.parse(text || "") as string;
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return text || "";
  }
};
import DOMPurify from "dompurify";

interface TopicClusters {
  [key: string]: string[];
}

interface DeepResearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  extracted_content?: string;
  source_quality?: number;
  source_type?: string;
  summary?: string;
  chartData?: any; // Add chartData property
}

export interface DeepResearch {
  results: DeepResearchResult[];
  query: string;
  topic_clusters?: TopicClusters;
  research_summary?: string;
  estimated_analysis_depth?: string;
}

interface DeepResearchResultsProps {
  research: DeepResearch;
}

export default function DeepResearchResults({
  research,
}: DeepResearchResultsProps) {
  const [expandedContent, setExpandedContent] = useState<string | null>(null);

  // Add diagnostic logging
  useEffect(() => {
    console.log('DeepResearchResults component rendered with data:', {
      hasResearch: !!research,
      resultsCount: research?.results?.length || 0,
      hasSummary: !!research?.research_summary,
      topicClusters: research?.topic_clusters ? Object.keys(research.topic_clusters).length : 0
    });
  }, [research]);

  // Handle undefined research data gracefully
  if (!research || !research.results || research.results.length === 0) {
    console.warn('DeepResearchResults received empty or invalid research data');
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <h3 className="text-lg font-medium mb-4">
          No research results available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We couldn't find any deep research results for this query. Try a
          different search or check back later.
        </p>
      </div>
    );
  }

  // Extract topic clusters for display
  const topicClusters = research.topic_clusters || {};
  const topicNames = Object.keys(topicClusters);

  return (
    <ReactGridLayout
      className="layout"
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      width={1200}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Research Summary Section */}
        {research.research_summary && (
          <Card className="mb-8 border-primary/10 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Research Summary
              </CardTitle>
              <CardDescription>
                Comprehensive analysis based on {research.results.length}{" "}
                sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    parseMarkdown(research.research_summary || ""),
                  ),
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Topic Clusters Section */}
        {topicNames.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Topic Clusters
              </CardTitle>
              <CardDescription>
                Related topics identified in research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={topicNames[0]}>
                <TabsList className="mb-4 flex flex-wrap">
                  {topicNames.map((topic) => (
                    <TabsTrigger key={topic} value={topic}>
                      {topic}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {topicNames.map((topic) => (
                  <TabsContent key={topic} value={topic} className="mt-0">
                    <ScrollArea className="h-[200px] rounded-md border p-4">
                      <div className="flex flex-wrap gap-2">
                        {topicClusters[topic].map((subtopic, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="py-1"
                          >
                            {subtopic}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Detailed Research Results */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            Detailed Research Sources ({research.results.length})
          </h3>

          <div className="grid gap-4">
            {research.results.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {result.title}
                    </a>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate max-w-[250px]"
                      >
                        {new URL(result.url).hostname}
                      </a>
                    </span>

                    {result.published_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(result.published_date), {
                          addSuffix: true,
                        })}
                      </span>
                    )}

                    {result.source_type && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {result.source_type}
                      </Badge>
                    )}

                    {/* Quality indicator */}
                    {typeof result.source_quality === "number" && (
                      <Badge
                        variant={
                          result.source_quality > 0.8
                            ? "default"
                            : result.source_quality > 0.5
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs font-normal"
                      >
                        {result.source_quality > 0.8
                          ? "High Quality"
                          : result.source_quality > 0.5
                            ? "Medium Quality"
                            : "Basic Source"}
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Source summary or extracted intro */}
                  <div className="mb-2">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          parseMarkdown(
                            expandedContent === result.url &&
                              result.extracted_content
                              ? result.extracted_content
                              : result.content,
                          ),
                        ),
                      }}
                    />
                  </div>

                  {/* Render interactive charts and graphs if available */}
                  {result.chartData && (
                    <div className="mt-4">
                      <Chart
                        type={result.chartData.type}
                        data={result.chartData.data}
                        options={result.chartData.options}
                      />
                    </div>
                  )}

                  {/* Expand/Collapse button if detailed content available */}
                  {result.extracted_content && (
                    <div className="mt-4">
                      <Separator className="my-2" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedContent(
                            expandedContent === result.url ? null : result.url,
                          )
                        }
                        className="text-xs flex items-center gap-1"
                      >
                        <AlignLeft className="h-3.5 w-3.5" />
                        {expandedContent === result.url
                          ? "Show Less"
                          : "Show Full Content"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ReactGridLayout>
  );
}
