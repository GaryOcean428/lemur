import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, FileText, Award } from 'lucide-react';

interface DeepResearchResultsProps {
  research: {
    results: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
      published_date?: string;
      extracted_content?: string;
      source_quality?: number;
      source_type?: string;
      summary?: string;
    }>;
    query: string;
    topic_clusters?: {
      [key: string]: string[];
    };
    research_summary?: string;
    estimated_analysis_depth?: string;
  }
}

export default function DeepResearchResults({ research }: DeepResearchResultsProps) {
  return (
    <div className="deep-research-results">
      {/* Research Summary Section */}
      {research.research_summary && (
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Award className="w-5 h-5 mr-2 text-indigo-500" />
            Advanced Research Summary
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-base leading-relaxed">{research.research_summary}</p>
          </div>
          {research.estimated_analysis_depth && (
            <Badge variant="outline" className="mt-4 bg-white/50 dark:bg-gray-800/50">
              Analysis Depth: {research.estimated_analysis_depth}
            </Badge>
          )}
        </div>
      )}
      
      {/* Topic Clusters */}
      {research.topic_clusters && Object.keys(research.topic_clusters).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Topic Clusters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(research.topic_clusters).map(([topic, keywords], idx) => (
              <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <h4 className="font-medium mb-2">{topic}</h4>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, kidx) => (
                    <Badge key={kidx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Research Results */}
      <div>
        <h3 className="text-lg font-medium mb-4">Detailed Research Results</h3>
        <div className="space-y-6">
          {research.results.map((result, index) => (
            <div 
              key={index} 
              className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-medium">
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center"
                  >
                    {result.title}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </h4>
                <Badge variant="outline" className="text-xs bg-white dark:bg-gray-700">
                  Score: {Math.round(result.score * 100)}%
                </Badge>
              </div>
              
              <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span className="inline-flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {result.published_date || 'Date unknown'}
                </span>
                {result.source_type && (
                  <Badge variant="secondary" className="text-xs">
                    {result.source_type}
                  </Badge>
                )}
              </div>
              
              {/* Content excerpt */}
              <p className="text-sm line-clamp-3 mb-3">{result.content}</p>
              
              {/* If we have extracted content, show a collapsible section */}
              {result.extracted_content && (
                <details className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <summary className="text-sm font-medium cursor-pointer text-indigo-600 dark:text-indigo-400 flex items-center">
                    <FileText className="mr-1 h-4 w-4" />
                    View Extracted Content
                  </summary>
                  <ScrollArea className="h-64 mt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm">
                    <p className="whitespace-pre-line">{result.extracted_content}</p>
                  </ScrollArea>
                </details>
              )}
              
              {/* If we have a summary, show it */}
              {result.summary && (
                <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Summary
                  </div>
                  <p className="text-sm">{result.summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}