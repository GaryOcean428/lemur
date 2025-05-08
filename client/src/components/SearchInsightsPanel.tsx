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

  // More detailed steps for deep research with agentic loops
  // These match the actual steps in server/utils/agenticResearch.ts
  const deepResearchSteps: SearchStep[] = [
    {
      id: 'init',
      label: 'Research initialization',
      status: 'pending',
      timestamp: new Date(),
      details: 'Setting up the research environment and initializing API clients'
    },
    {
      id: 'planning',
      label: 'Planning research approach',
      status: 'pending',
      timestamp: new Date(),
      details: 'Breaking down the query into sub-questions for better coverage'
    },
    {
      id: 'searching',
      label: 'Searching for information',
      status: 'pending',
      timestamp: new Date(),
      details: 'Retrieving information from diverse sources for each sub-question'
    },
    {
      id: 'analysis1',
      label: 'Initial analysis',
      status: 'pending',
      timestamp: new Date(),
      details: 'First-pass analysis using chain-of-thought reasoning'
    },
    {
      id: 'critique1',
      label: 'Critical evaluation',
      status: 'pending',
      timestamp: new Date(),
      details: 'Self-critique to identify gaps and weaknesses in analysis'
    },
    {
      id: 'refine1',
      label: 'First refinement',
      status: 'pending',
      timestamp: new Date(),
      details: 'Improving analysis based on self-critique'
    },
    {
      id: 'analysis2',
      label: 'Follow-up analysis',
      status: 'pending',
      timestamp: new Date(),
      details: 'Second-pass analysis with deeper understanding'
    },
    {
      id: 'critique2',
      label: 'Advanced critique',
      status: 'pending',
      timestamp: new Date(),
      details: 'Thorough evaluation of refined analysis quality'
    },
    {
      id: 'refine2',
      label: 'Final refinement',
      status: 'pending',
      timestamp: new Date(),
      details: 'Final improvements based on critique'
    },
    {
      id: 'finalize',
      label: 'Report finalization',
      status: 'pending',
      timestamp: new Date(),
      details: 'Polishing and finalizing the comprehensive research report'
    },
    {
      id: 'citation',
      label: 'Source extraction',
      status: 'pending',
      timestamp: new Date(),
      details: 'Extracting and validating all cited sources'
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
    // When using specific icons for agentic research process steps
    switch (step.id) {
      case 'init':
        return <Waves className="h-4 w-4" />;
      case 'planning':
        return <FlaskConical className="h-4 w-4" />;
      case 'searching':
        return <Search className="h-4 w-4" />;
      case 'analysis1':
      case 'analysis2':
        return <Database className="h-4 w-4" />;
      case 'critique1':
      case 'critique2':  
        return <Waves className="h-4 w-4" />;
      case 'refine1':
      case 'refine2':
        return <Database className="h-4 w-4" />;
      case 'finalize':
        return <FlaskConical className="h-4 w-4" />;
      case 'citation':
        return <Search className="h-4 w-4" />;
      // Standard search steps
      case 'web':
        return <Search className="h-4 w-4" />;
      case 'ai':
        return <FlaskConical className="h-4 w-4" />;
      // Default status-based icons
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