import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Search, Database, Globe, BookOpen, Brain, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SearchStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
  timestamp: Date;
}

interface SearchInsightsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  isDeepResearch: boolean;
}

export default function SearchInsightsPanel({ 
  isOpen, 
  onOpenChange, 
  query,
  isDeepResearch
}: SearchInsightsPanelProps) {
  const [steps, setSteps] = useState<SearchStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [sources, setSourceCount] = useState(0);
  
  // Generate search steps based on the search type
  useEffect(() => {
    if (isOpen) {
      const basicSteps: SearchStep[] = [
        {
          id: 'initialize',
          label: 'Initializing search',
          status: 'completed',
          details: `Processing query: "${query}"`,
          timestamp: new Date()
        },
        {
          id: 'web-search',
          label: 'Searching web sources',
          status: 'active',
          details: 'Finding relevant information across the web',
          timestamp: new Date()
        },
        {
          id: 'process-results',
          label: 'Processing results',
          status: 'pending',
          details: 'Analyzing and ranking search findings',
          timestamp: new Date()
        },
        {
          id: 'generate-answer',
          label: 'Generating AI answer',
          status: 'pending',
          details: 'Synthesizing answer from search results',
          timestamp: new Date()
        }
      ];
      
      // Add extra steps for deep research
      const deepResearchSteps: SearchStep[] = [
        {
          id: 'extract-content',
          label: 'Extracting detailed content',
          status: 'pending',
          details: 'Performing in-depth content extraction from sources',
          timestamp: new Date()
        },
        {
          id: 'analyze-topics',
          label: 'Analyzing topic clusters',
          status: 'pending',
          details: 'Identifying related topics and concepts',
          timestamp: new Date()
        },
        {
          id: 'generate-summary',
          label: 'Generating research summary',
          status: 'pending',
          details: 'Creating comprehensive research overview',
          timestamp: new Date()
        }
      ];
      
      // Combine steps based on search type
      setSteps(isDeepResearch ? [...basicSteps, ...deepResearchSteps] : basicSteps);
      
      // Simulate progress for demo purposes
      // In a real implementation, this would be updated based on server events/websockets
      let currentStep = 0;
      const totalSteps = isDeepResearch ? basicSteps.length + deepResearchSteps.length : basicSteps.length;
      
      const interval = setInterval(() => {
        if (currentStep < totalSteps) {
          setSteps(prevSteps => {
            const newSteps = [...prevSteps];
            
            // Mark current step as completed
            if (currentStep > 0) {
              newSteps[currentStep - 1] = {
                ...newSteps[currentStep - 1],
                status: 'completed'
              };
            }
            
            // Set next step as active
            if (currentStep < totalSteps) {
              newSteps[currentStep] = {
                ...newSteps[currentStep],
                status: 'active'
              };
            }
            
            return newSteps;
          });
          
          // Increment source count randomly to simulate finding sources
          if (currentStep === 1) {
            const sourceInterval = setInterval(() => {
              setSourceCount(prev => {
                const increment = Math.floor(Math.random() * 3) + 1;
                return prev + increment;
              });
            }, 800);
            
            // Clear source interval after 5 seconds
            setTimeout(() => clearInterval(sourceInterval), 5000);
          }
          
          // Update progress percentage
          setProgress(Math.min(100, Math.round((currentStep / totalSteps) * 100)));
          currentStep++;
        } else {
          // All steps completed
          setProgress(100);
          clearInterval(interval);
        }
      }, isDeepResearch ? 2000 : 1200); // Slower for deep research
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // Reset when closed
      setSteps([]);
      setProgress(0);
      setSourceCount(0);
    }
  }, [isOpen, query, isDeepResearch]);
  
  // Icon mapping for steps
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'initialize':
        return <Database className="h-4 w-4" />;
      case 'web-search':
        return <Globe className="h-4 w-4" />;
      case 'process-results':
        return <Search className="h-4 w-4" />;
      case 'generate-answer':
        return <Brain className="h-4 w-4" />;
      case 'extract-content':
        return <BookOpen className="h-4 w-4" />;
      case 'analyze-topics':
        return <Search className="h-4 w-4" />;
      case 'generate-summary':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Insights
          </SheetTitle>
          <SheetDescription>
            Watching Lemur work on your {isDeepResearch ? 'deep research' : 'search'} query
          </SheetDescription>
        </SheetHeader>
        
        <div className="p-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20 transition-colors">
                {progress}% Complete
              </Badge>
              
              {sources > 0 && (
                <Badge variant="outline" className="bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  {sources} Sources
                </Badge>
              )}
            </div>
            
            <Badge variant={isDeepResearch ? "secondary" : "default"}>
              {isDeepResearch ? "Deep Research" : "Standard Search"}
            </Badge>
          </div>
          
          <Progress value={progress} className="mt-3 h-2" />
        </div>
        
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Search query: "{query}"</h3>
            
            <div className="relative">
              {steps.map((step, index) => (
                <div key={step.id} className="mb-6 relative">
                  {/* Vertical connector line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[10px] top-[24px] w-[2px] h-[calc(100%-20px)] bg-gray-200 dark:bg-gray-700"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="rounded-full p-1 bg-white dark:bg-gray-800 relative z-10">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : step.status === 'active' ? (
                        <div className="h-5 w-5 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 flex items-center justify-center">
                          {getStepIcon(step.id)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium ${
                          step.status === 'active' ? 'text-primary' : 
                          step.status === 'completed' ? 'text-gray-700 dark:text-gray-300' : 
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.label}
                        </h4>
                        
                        {step.status === 'active' && (
                          <Badge variant="outline" className="bg-primary/10 animate-pulse">
                            In progress
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {step.details}
                      </p>
                      
                      {/* Extra details for active steps */}
                      {step.status === 'active' && step.id === 'web-search' && (
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Found {sources} sources so far...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}