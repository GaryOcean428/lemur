import React from 'react';
import { Settings, Info, Zap, BookOpen } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  maxIterations = 3,
  includeReasoning = true,
  deepDive = false,
  searchContextSize = 'medium',
  onSettingsChange,
  isPro = false
}: DeepResearchSettingsProps) {
  // For non-pro users, display locked settings with upgrade prompt
  if (!isPro) {
    return (
      <Card className="mb-4 border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-yellow-500" />
            Advanced Research Settings
          </CardTitle>
          <CardDescription>
            Unlock customizable research with a Pro subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="opacity-60 pointer-events-none">
              <div className="flex justify-between mb-2 items-center">
                <Label htmlFor="max-iterations" className="text-sm font-medium flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Research Depth
                  <Badge className="ml-2 text-xs" variant="outline">PRO</Badge>
                </Label>
                <span className="text-xs text-muted-foreground">{maxIterations} iterations</span>
              </div>
              <Slider
                id="max-iterations"
                disabled={true}
                value={[maxIterations]}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2 opacity-60 pointer-events-none">
              <Switch id="show-reasoning" disabled={true} checked={includeReasoning} />
              <Label htmlFor="show-reasoning" className="text-sm font-medium flex items-center gap-1">
                Show Reasoning Process
                <Badge className="ml-2 text-xs" variant="outline">PRO</Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 opacity-60 pointer-events-none">
              <Switch id="deep-dive" disabled={true} checked={deepDive} />
              <Label htmlFor="deep-dive" className="text-sm font-medium flex items-center gap-1">
                Deep Dive Mode
                <Badge className="ml-2 text-xs" variant="outline">PRO</Badge>
              </Label>
            </div>
            
            <div className="opacity-60 pointer-events-none">
              <div className="flex justify-between mb-2 items-center">
                <Label htmlFor="context-size" className="text-sm font-medium flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Search Context Size
                  <Badge className="ml-2 text-xs" variant="outline">PRO</Badge>
                </Label>
                <span className="text-xs text-muted-foreground capitalize">{searchContextSize}</span>
              </div>
              <Slider
                id="context-size"
                disabled={true}
                value={[searchContextSize === 'low' ? 1 : searchContextSize === 'medium' ? 2 : 3]}
                min={1}
                max={3}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pro user view with functional controls
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Advanced Research Settings
        </CardTitle>
        <CardDescription>
          Customize your research experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div>
            <div className="flex justify-between mb-2 items-center">
              <Label htmlFor="max-iterations" className="text-sm font-medium flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Research Depth
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground cursor-pointer" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <p>Controls how many research iterations are performed. Higher values provide more thorough analysis but take longer.</p>
                  </PopoverContent>
                </Popover>
              </Label>
              <span className="text-xs text-muted-foreground">{maxIterations} iterations</span>
            </div>
            <Slider
              id="max-iterations"
              value={[maxIterations]}
              min={1}
              max={5}
              step={1}
              className="w-full"
              onValueChange={(values) => onSettingsChange({ maxIterations: values[0] })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="show-reasoning" 
              checked={includeReasoning}
              onCheckedChange={(checked) => onSettingsChange({ includeReasoning: checked })}
            />
            <Label htmlFor="show-reasoning" className="text-sm font-medium flex items-center gap-1">
              Show Reasoning Process
              <Popover>
                <PopoverTrigger asChild>
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground cursor-pointer" />
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm">
                  <p>When enabled, research results include detailed explanations of the reasoning and sources behind conclusions.</p>
                </PopoverContent>
              </Popover>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="deep-dive" 
              checked={deepDive}
              onCheckedChange={(checked) => onSettingsChange({ deepDive: checked })}
            />
            <Label htmlFor="deep-dive" className="text-sm font-medium flex items-center gap-1">
              Deep Dive Mode
              <Popover>
                <PopoverTrigger asChild>
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground cursor-pointer" />
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm">
                  <p>Activates enhanced fact-checking and in-depth exploration mode. Best for complex or technical topics.</p>
                </PopoverContent>
              </Popover>
            </Label>
          </div>
          
          <div>
            <div className="flex justify-between mb-2 items-center">
              <Label htmlFor="context-size" className="text-sm font-medium flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Search Context Size
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground cursor-pointer" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <p>Controls how much content is analyzed from each source. Higher values provide more detail but may be slower.</p>
                  </PopoverContent>
                </Popover>
              </Label>
              <span className="text-xs text-muted-foreground capitalize">{searchContextSize}</span>
            </div>
            <Slider
              id="context-size"
              value={[searchContextSize === 'low' ? 1 : searchContextSize === 'medium' ? 2 : 3]}
              min={1}
              max={3}
              step={1}
              className="w-full"
              onValueChange={(values) => {
                const sizeMap = { 1: 'low', 2: 'medium', 3: 'high' };
                onSettingsChange({ 
                  searchContextSize: sizeMap[values[0] as 1 | 2 | 3] as 'low' | 'medium' | 'high'
                });
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}