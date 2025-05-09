import React, { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, Lock, Settings, Zap } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import DeepResearchSettings from './DeepResearchSettings';
import toast from 'react-hot-toast';

interface DeepResearchToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  maxIterations?: number;
  includeReasoning?: boolean;
  deepDive?: boolean;
  searchContextSize?: 'low' | 'medium' | 'high';
  onSettingsChange?: (settings: {
    maxIterations?: number;
    includeReasoning?: boolean;
    deepDive?: boolean;
    searchContextSize?: 'low' | 'medium' | 'high';
  }) => void;
}

export default function DeepResearchToggle({ 
  enabled, 
  onChange, 
  className = "",
  maxIterations = 3,
  includeReasoning = true,
  deepDive = false,
  searchContextSize = 'medium',
  onSettingsChange
}: DeepResearchToggleProps) {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Check if user has pro subscription to enable deep research
  const canUseDeepResearch = user && (user.subscriptionTier === 'pro' || user.subscriptionTier === 'developer');
  
  // Handle settings change if control was provided
  const handleSettingsChange = (settings: any) => {
    if (onSettingsChange) {
      onSettingsChange(settings);
      // Show a toast notification when settings are changed
      toast.success(
        'Research settings updated',
        {
          icon: '✓',
          duration: 2000,
          style: {
            background: '#4c1d95',
            color: 'white',
          }
        }
      );
    }
  };
  
  // Handle toggle change with better UI feedback
  const handleToggleChange = (checked: boolean) => {
    onChange(checked);
    if (checked && canUseDeepResearch) {
      toast.success(
        'Deep Research activated',
        {
          icon: <Zap className="text-yellow-400" />,
          duration: 2000,
          style: {
            background: '#4c1d95',
            color: 'white',
          }
        }
      );
    }
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  id="deep-research"
                  checked={enabled}
                  onCheckedChange={handleToggleChange}
                  disabled={!canUseDeepResearch}
                  className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-800 transition-all duration-200"
                />
                <Label
                  htmlFor="deep-research"
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1"
                >
                  Deep Research
                  {!canUseDeepResearch && <Lock className="h-3 w-3 text-muted-foreground" />}
                  <Info className="h-3 w-3 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px] bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 shadow-md">
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
        
        {/* Settings button for Pro users */}
        {canUseDeepResearch && (
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <button
                className={`p-1.5 rounded-full text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/30 transition-all duration-200 shadow-sm hover:shadow ${enabled ? 'opacity-100' : 'opacity-50'}`}
                disabled={!enabled}
                title="Advanced Research Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 shadow-lg border-indigo-100 dark:border-indigo-900 rounded-lg overflow-hidden" align="start">
              <DeepResearchSettings
                maxIterations={maxIterations}
                includeReasoning={includeReasoning}
                deepDive={deepDive}
                searchContextSize={searchContextSize}
                onSettingsChange={handleSettingsChange}
                isPro={canUseDeepResearch}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {/* Always show settings UI for Pro users when enabled */}
      {canUseDeepResearch && enabled && (
        <div className="ml-7">
          <DeepResearchSettings
            maxIterations={maxIterations}
            includeReasoning={includeReasoning}
            deepDive={deepDive}
            searchContextSize={searchContextSize}
            onSettingsChange={handleSettingsChange}
            isPro={canUseDeepResearch}
          />
        </div>
      )}
    </div>
  );
}