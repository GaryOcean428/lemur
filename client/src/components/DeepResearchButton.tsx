import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Beaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeepResearchButtonProps {
  query: string;
  isPro: boolean;
  isFollowUp?: boolean;
}

export default function DeepResearchButton({ query, isPro, isFollowUp = false }: DeepResearchButtonProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleDeepResearch = () => {
    if (!isPro) {
      toast({
        title: "Pro feature",
        description: "Deep Research is only available for Pro subscribers. Please upgrade to access this feature.",
        variant: "destructive",
      });
      return;
    }

    // Build URL parameters
    const params = new URLSearchParams();
    params.append("q", query);
    params.append("deepResearch", "true");
    
    // Preserve follow-up context if needed
    if (isFollowUp) {
      params.append("isFollowUp", "true");
    }
    
    // Use default research settings
    params.append("maxIterations", "3");
    params.append("includeReasoning", "true");
    
    // Navigate to search with deep research enabled
    setLocation(`/search?${params.toString()}`);
    
    // Show success toast
    toast({
      title: "Starting deep research",
      description: "Analyzing multiple sources for comprehensive insights...",
      duration: 3000,
    });
  };

  return (
    <Button
      onClick={handleDeepResearch}
      variant="outline"
      size="sm"
      className={`flex items-center gap-1 ${!isPro ? 'opacity-75' : ''}`}
    >
      <Beaker className="h-4 w-4" />
      <span>Deep Research</span>
    </Button>
  );
}