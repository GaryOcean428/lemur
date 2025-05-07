import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Lock } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';

interface DeepResearchToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export default function DeepResearchToggle({ enabled, onChange, className = "" }: DeepResearchToggleProps) {
  const { user } = useAuth();
  
  // Check if user has pro subscription to enable deep research
  const canUseDeepResearch = user && user.subscriptionTier === 'pro';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Switch
                id="deep-research"
                checked={enabled}
                onCheckedChange={onChange}
                disabled={!canUseDeepResearch}
                className="data-[state=checked]:bg-indigo-600"
              />
              <Label
                htmlFor="deep-research"
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1"
              >
                Deep Research
                {!canUseDeepResearch && <Lock className="h-3 w-3 text-muted-foreground" />}
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px]">
            {canUseDeepResearch ? (
              <p className="text-xs">
                Deep Research provides comprehensive analysis from multiple sources, topic clustering, 
                and in-depth content extraction. Available for Pro subscribers only.
              </p>
            ) : (
              <p className="text-xs">
                Deep Research is a Pro feature. Upgrade your subscription to 
                access comprehensive research capabilities with topic clustering
                and detailed source analysis.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}