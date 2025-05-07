import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

interface DeepResearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function DeepResearchToggle({ enabled, onToggle }: DeepResearchToggleProps) {
  const { user } = useAuth();
  const isProUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'developer';
  
  const handleToggle = (checked: boolean) => {
    if (!isProUser && checked) {
      return; // Don't allow non-Pro users to enable
    }
    onToggle(checked);
  };
  
  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="deep-research-mode"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={!isProUser}
        className={!isProUser ? 'cursor-not-allowed opacity-60' : ''}
      />
      <div className="flex items-center gap-2">
        <Label htmlFor="deep-research-mode" className={!isProUser ? 'cursor-not-allowed opacity-60' : ''}>
          Advanced Research
        </Label>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {isProUser ? (
              <p>Advanced Research uses comprehensive algorithms to deliver deeper analysis and detailed summaries. Pro feature only.</p>
            ) : (
              <p>Pro subscription required to access Advanced Research capabilities.</p>
            )}
          </TooltipContent>
        </Tooltip>
        
        {!isProUser && (
          <Badge variant="outline" className="text-xs bg-muted">
            Pro
          </Badge>
        )}
      </div>
    </div>
  );
}