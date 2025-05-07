import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Database, FlaskConical, Loader2, Search, ServerCrash, Waves } from 'lucide-react';

export interface SearchStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
  timestamp: Date;
}

export interface SearchInsightsPanelProps {
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
  // Search steps for regular search
  const standardSearchSteps: SearchStep[] = [
    {
      id: 'init',
      label: 'Search initialization',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'web',
      label: 'Web search retrieval',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'ai',
      label: 'AI answer generation',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'citations',
      label: 'Citation verification',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'final',
      label: 'Results assembly',
      status: 'pending',
      timestamp: new Date()
    }
  ];

  // More detailed steps for deep research
  const deepResearchSteps: SearchStep[] = [
    {
      id: 'init',
      label: 'Research initialization',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'research-query',
      label: 'Research query formulation',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'web-deep',
      label: 'Comprehensive web search',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'academic',
      label: 'Academic sources retrieval',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'content-analysis',
      label: 'Content extraction & analysis',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'source-evaluation',
      label: 'Source quality evaluation',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'topic-clustering',
      label: 'Topic analysis & clustering',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'synthesis',
      label: 'Information synthesis',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'summary',
      label: 'Research summary generation',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 'final',
      label: 'Results assembly',
      status: 'pending',
      timestamp: new Date()
    }
  ];

  // Choose steps based on whether it's deep research or not
  const [steps, setSteps] = useState<SearchStep[]>(isDeepResearch ? deepResearchSteps : standardSearchSteps);
  
  // Auto-advance steps when the panel is open
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset steps when query changes
    setSteps(prev => 
      prev.map(step => ({...step, status: 'pending', timestamp: new Date()}))
    );
    
    // Simulate step progress for demonstration
    let currentStep = 0;
    const totalSteps = steps.length;
    
    // Update first step immediately
    setSteps(prev => {
      const newSteps = [...prev];
      if (newSteps[0]) {
        newSteps[0] = {...newSteps[0], status: 'active', timestamp: new Date()};
      }
      return newSteps;
    });
    
    const interval = setInterval(() => {
      // Mark current step as completed and next as active
      setSteps(prev => {
        const newSteps = [...prev];
        
        // Complete current step
        if (newSteps[currentStep]) {
          newSteps[currentStep] = {...newSteps[currentStep], status: 'completed', timestamp: new Date()};
        }
        
        // Activate next step
        currentStep++;
        if (currentStep < totalSteps && newSteps[currentStep]) {
          newSteps[currentStep] = {...newSteps[currentStep], status: 'active', timestamp: new Date()};
        }
        
        return newSteps;
      });
      
      // Stop when all steps are completed
      if (currentStep >= totalSteps - 1) {
        clearInterval(interval);
      }
    }, isDeepResearch ? 1200 : 700); // Slower progression for deep research
    
    return () => clearInterval(interval);
  }, [isOpen, query, isDeepResearch, steps.length]);
  
  // Get the currently active step
  const activeStep = steps.find(step => step.status === 'active');
  
  // Helper function to get appropriate icon for step
  const getStepIcon = (step: SearchStep) => {
    switch (step.id) {
      case 'init':
        return <Waves className="h-4 w-4" />;
      case 'web':
      case 'web-deep':
        return <Search className="h-4 w-4" />;
      case 'ai':
        return <FlaskConical className="h-4 w-4" />;
      case 'academic':
        return <Database className="h-4 w-4" />;
      case 'topic-clustering':
      case 'synthesis':
      case 'summary':
        return <Waves className="h-4 w-4" />;
      default:
        return step.status === 'active' ? 
          <Loader2 className="h-4 w-4 animate-spin" /> :
          step.status === 'completed' ? 
            <CheckCircle2 className="h-4 w-4" /> : 
            step.status === 'error' ?
              <ServerCrash className="h-4 w-4" /> :
              <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Search Insights</SheetTitle>
          <SheetDescription>
            Live activity for your "{query.length > 30 ? query.substring(0, 30) + '...' : query}" search
          </SheetDescription>
        </SheetHeader>
        
        <Separator className="my-4" />
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium">Search Type:</h3>
            <Badge variant={isDeepResearch ? "default" : "secondary"}>
              {isDeepResearch ? "Deep Research" : "Standard Search"}
            </Badge>
          </div>
          
          {activeStep && (
            <Card className="bg-primary/5 border-primary/10 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium">{activeStep.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeStep.details || `Processing ${isDeepResearch ? 'research' : 'search'} data...`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <ScrollArea className="h-[60vh] rounded-md">
          <div className="relative">
            {/* Timeline connector */}
            <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
            
            {/* Steps */}
            <div className="space-y-6 relative">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className={`
                    relative z-10 flex h-6 w-6 items-center justify-center rounded-full border
                    ${step.status === 'active' ? 'bg-primary text-white border-primary animate-pulse' : 
                      step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 
                      step.status === 'error' ? 'bg-red-500 border-red-500 text-white' :
                      'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}
                  `}>
                    {getStepIcon(step)}
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <p className={`text-sm font-medium ${
                        step.status === 'active' ? 'text-primary' : 
                        step.status === 'completed' ? 'text-gray-900 dark:text-gray-100' : 
                        step.status === 'error' ? 'text-red-500' :
                        'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.timestamp.toLocaleTimeString()}
                    </p>
                    
                    {step.details && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {step.details}
                      </p>
                    )}
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