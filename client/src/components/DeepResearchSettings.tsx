import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LightbulbIcon, FlameIcon, LayersIcon, ZapIcon, InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DeepResearchSettingsProps {
  maxIterations: number;
  includeReasoning: boolean;
  deepDive: boolean;
  searchContextSize: 'low' | 'medium' | 'high';
  onSettingsChange: (settings: {
    maxIterations?: number;
    includeReasoning?: boolean;
    deepDive?: boolean;
    searchContextSize?: 'low' | 'medium' | 'high';
  }) => void;
  isPro: boolean;
}

export default function DeepResearchSettings({
  maxIterations,
  includeReasoning,
  deepDive,
  searchContextSize,
  onSettingsChange,
  isPro
}: DeepResearchSettingsProps) {
  // If the user isn't pro, we'll show a restricted interface
  if (!isPro) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-6">
          <h3 className="text-lg font-medium">Advanced Research Settings</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Upgrade to Pro to customize your deep research experience with advanced settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-2">
        <h3 className="text-lg font-medium">Advanced Research Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the depth and quality of your research
        </p>
      </div>
      
      {/* Iterations Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ZapIcon className="h-4 w-4 mr-2 text-indigo-500" />
            <Label htmlFor="iterations">Research Iterations</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-3 w-3 ml-1 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">
                    More iterations mean deeper research but take longer to complete. Each iteration adds a layer of reflection and analysis.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-sm font-medium">{maxIterations}</span>
        </div>
        <Slider
          id="iterations"
          min={1}
          max={5}
          step={1}
          value={[maxIterations]}
          onValueChange={(value) => onSettingsChange({ maxIterations: value[0] })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Quick</span>
          <span>Standard</span>
          <span>Deep</span>
        </div>
      </div>
      
      {/* Include Reasoning Toggle */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center">
          <LightbulbIcon className="h-4 w-4 mr-2 text-amber-500" />
          <Label htmlFor="include-reasoning" className="cursor-pointer">
            Show Reasoning Process
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3 w-3 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  Makes the AI's reasoning process transparent, including all steps of analysis and refinement.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="include-reasoning"
          checked={includeReasoning}
          onCheckedChange={(checked) => onSettingsChange({ includeReasoning: checked })}
          className="data-[state=checked]:bg-amber-600"
        />
      </div>
      
      {/* Deep Dive Toggle */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center">
          <FlameIcon className="h-4 w-4 mr-2 text-orange-500" />
          <Label htmlFor="deep-dive" className="cursor-pointer">
            Deep Dive Mode
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3 w-3 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  Extracts deeper insights from sources by running multiple specialized reasoning processes. Uses more API requests.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="deep-dive"
          checked={deepDive}
          onCheckedChange={(checked) => onSettingsChange({ deepDive: checked })}
          className="data-[state=checked]:bg-orange-600"
        />
      </div>
      
      {/* Context Size Selection */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center">
          <LayersIcon className="h-4 w-4 mr-2 text-blue-500" />
          <Label htmlFor="context-size" className="cursor-pointer">
            Research Context Size
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3 w-3 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  The amount of source material used in each reasoning step. Higher values lead to more comprehensive but potentially slower analysis.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select value={searchContextSize} onValueChange={(value: 'low' | 'medium' | 'high') => onSettingsChange({ searchContextSize: value })}>
          <SelectTrigger id="context-size" className="w-24">
            <SelectValue placeholder="Context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Basic</SelectItem>
            <SelectItem value="medium">Standard</SelectItem>
            <SelectItem value="high">Comprehensive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}