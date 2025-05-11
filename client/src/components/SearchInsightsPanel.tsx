import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Clock, Database, FlaskConical, Loader2, Search, ServerCrash, Waves,
  BarChart3, FileCheck, FilterX, Lightbulb, GitMerge
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register ChartJS components including Filler for area charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  // New props for tracking agentic research
  currentIteration?: number;
  maxIterations?: number;
  reasoningLog?: string[];
  previousQueries?: string[]; // Add support for contextual follow-up questions
}

export default function SearchInsightsPanel({ 
  isOpen, 
  onOpenChange,
  query,
  isDeepResearch,
  currentIteration = 0,
  maxIterations = 2,
  reasoningLog = [],
  previousQueries = [] // Add support for contextual follow-up questions
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
  // These match the extended agentic reasoning process
  const deepResearchSteps: SearchStep[] = [
    {
      id: 'idle',
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
      details: 'Breaking down the query into sub-questions and identifying key areas to explore'
    },
    {
      id: 'searching',
      label: 'Information gathering',
      status: 'pending',
      timestamp: new Date(),
      details: 'Retrieving relevant information from diverse sources with varied perspectives'
    },
    {
      id: 'analyzing',
      label: 'Initial synthesis',
      status: 'pending',
      timestamp: new Date(),
      details: 'Synthesizing information using structured reasoning and evidence analysis'
    },
    {
      id: 'critiquing',
      label: 'Critical reflection',
      status: 'pending',
      timestamp: new Date(),
      details: 'Self-critique to identify biases, gaps, and weaknesses in the analysis'
    },
    {
      id: 'refining',
      label: 'Iterative refinement',
      status: 'pending',
      timestamp: new Date(),
      details: 'Improving the analysis based on critical reflection and additional evidence'
    },
    {
      id: 'cross_checking',
      label: 'Cross validation',
      status: 'pending',
      timestamp: new Date(),
      details: 'Verifying information across multiple sources and checking for consistency'
    },
    {
      id: 'organizing',
      label: 'Organization',
      status: 'pending',
      timestamp: new Date(),
      details: 'Structuring insights into coherent themes and identifying connections'
    },
    {
      id: 'finished',
      label: 'Report finalization',
      status: 'pending',
      timestamp: new Date(),
      details: 'Compiling final research report with accurate citations and structured insights'
    }
  ];

  // Choose steps based on whether it's deep research or not
  const [steps, setSteps] = useState<SearchStep[]>(isDeepResearch ? deepResearchSteps : standardSearchSteps);
  
  // Update steps based on server research state
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset steps when query changes or panel opens
    setSteps(prev => 
      prev.map(step => ({...step, status: 'pending', timestamp: new Date()}))
    );
    
    // When using simulated progress (for now, until we have real-time updates)
    if (reasoningLog.length === 0) {
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
    } else {
      // Real-time status from server-side progress
      // This will be integrated with websocket/SSE data from server when available
      
      // For now, use the current iteration to determine progress in the steps
      const stepIdToUpdate = (() => {
        // Maps server state to corresponding step ID
        if (currentIteration === 0) {
          return 'planning'; // First iteration starts with planning
        } else if (currentIteration === maxIterations) {
          return 'finished'; // Last iteration means we're finishing
        } else if (reasoningLog.length > 0) {
          // Check the last log entry to determine current state
          const lastLog = reasoningLog[reasoningLog.length - 1].toLowerCase();
          if (lastLog.includes('search')) return 'searching';
          if (lastLog.includes('analyz')) return 'analyzing';
          if (lastLog.includes('critique') || lastLog.includes('evaluat')) return 'critiquing';
          if (lastLog.includes('refin') || lastLog.includes('improv')) return 'refining';
          if (lastLog.includes('cross')) return 'cross_checking';
          if (lastLog.includes('organiz') || lastLog.includes('structur')) return 'organizing';
          return 'analyzing'; // Default to analyzing if we can't determine
        }
        
        return 'idle'; // Default to idle
      })();
      
      // Update the steps based on the current state
      setSteps(prev => {
        const newSteps = [...prev];
        let foundActive = false;
        
        // Update each step's status
        return newSteps.map(step => {
          // If this is the active step
          if (step.id === stepIdToUpdate) {
            foundActive = true;
            return {...step, status: 'active', timestamp: new Date()};
          }
          
          // Steps before the active step are completed
          if (!foundActive) {
            return {...step, status: 'completed', timestamp: new Date()};
          }
          
          // Steps after the active step are pending
          return {...step, status: 'pending', timestamp: new Date()};
        });
      });
    }
  }, [isOpen, query, isDeepResearch, steps.length, reasoningLog, currentIteration, maxIterations]);
  
  // Get the currently active step
  const activeStep = steps.find(step => step.status === 'active');
  
  // Generate chart data for search progress
  const chartData = {
    labels: steps.map(step => step.label.split(' ')[0]), // Use just the first word of each label for brevity
    datasets: [
      {
        label: 'Progress',
        data: steps.map(step => {
          // Convert status to a numeric value: completed = 100, active = 50, pending/error = 0
          return step.status === 'completed' ? 100 : 
                 step.status === 'active' ? 50 : 0;
        }),
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const stepIdx = context.dataIndex;
            const step = steps[stepIdx];
            return `${step.label}: ${
              step.status === 'completed' ? 'Completed' : 
              step.status === 'active' ? 'In Progress' : 
              step.status === 'error' ? 'Error' : 'Pending'
            }`;
          }
        }
      }
    }
  };
  
  // Helper function to get appropriate icon for step
  const getStepIcon = (step: SearchStep) => {
    // When using specific icons for agentic research process steps
    switch (step.id) {
      case 'idle':
        return <Waves className="h-4 w-4" />;
      case 'planning':
        return <FlaskConical className="h-4 w-4" />;
      case 'searching':
        return <Search className="h-4 w-4" />;
      case 'analyzing':
        return <Database className="h-4 w-4" />;
      case 'critiquing':
        return <FilterX className="h-4 w-4" />;
      case 'refining':
        return <GitMerge className="h-4 w-4" />;
      case 'cross_checking':
        return <FileCheck className="h-4 w-4" />;
      case 'organizing':
        return <BarChart3 className="h-4 w-4" />;
      case 'finished':
        return <CheckCircle2 className="h-4 w-4" />;
      // Standard search steps
      case 'web':
        return <Search className="h-4 w-4" />;
      case 'ai':
        return <Lightbulb className="h-4 w-4" />;
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
      <SheetContent className="sm:max-w-md" useGridLayout={false}>
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
          
          {/* Display iteration progress for deep research */}
          {isDeepResearch && (
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-medium text-muted-foreground">Research Iteration:</h3>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {currentIteration} of {maxIterations}
                </Badge>
              </div>
            </div>
          )}
          
          {/* Progress Chart */}
          <Card className="border-muted mb-4 overflow-hidden">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Progress Visualization</h3>
              <div className="h-[120px] w-full">
                <Chart
                  type="line"
                  data={chartData}
                  options={chartOptions}
                />
              </div>
            </CardContent>
          </Card>
          
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
          
          {/* Display reasoning log for deep research */}
          {isDeepResearch && reasoningLog.length > 0 && (
            <Card className="border-muted mb-4">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Reasoning Process:</h3>
                <ScrollArea className="h-[120px] rounded-md border p-2">
                  <div className="space-y-1">
                    {reasoningLog.map((log, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        {log}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
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
