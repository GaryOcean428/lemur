import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

export default function SubscriptionBadge() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Helper to determine badge color and tooltip text based on subscription tier
  const getBadgeInfo = () => {
    // Special case for developer accounts (like GaryOcean)
    const isDeveloperAccount = user.username === 'GaryOcean';
    
    switch (user.subscriptionTier) {
      case 'pro':
        return {
          variant: 'default' as const,
          label: isDeveloperAccount ? 'Developer' : 'Pro',
          tooltip: isDeveloperAccount
            ? 'Developer account with unlimited Pro features'
            : `Pro subscription with unlimited searches${user.subscriptionExpiresAt ? ` (expires ${new Date(user.subscriptionExpiresAt).toLocaleDateString()})` : ''}`,
          showProgress: false,
        };
      case 'basic':
        return {
          variant: 'secondary' as const,
          label: 'Basic',
          tooltip: `Basic subscription with 100 searches per month${user.subscriptionExpiresAt ? ` (expires ${new Date(user.subscriptionExpiresAt).toLocaleDateString()})` : ''}`,
          showProgress: true,
          progress: (user.searchCount / 100) * 100,
          progressLabel: `${user.searchCount}/100 searches used`,
        };
      default: // 'free'
        return {
          variant: 'outline' as const,
          label: 'Free',
          tooltip: 'Free tier with limited searches (max 5)',
          showProgress: true,
          progress: (user.searchCount / 5) * 100,
          progressLabel: `${user.searchCount}/5 searches used`,
        };
    }
  };
  
  const badgeInfo = getBadgeInfo();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col">
            <Badge variant={badgeInfo.variant} className="cursor-help">
              {badgeInfo.label}
            </Badge>
            
            {badgeInfo.showProgress && (
              <div className="w-full mt-1">
                <Progress 
                  value={badgeInfo.progress} 
                  className="h-1 w-full" 
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{badgeInfo.tooltip}</p>
          {badgeInfo.showProgress && (
            <p className="text-xs mt-1">{badgeInfo.progressLabel}</p>
          )}
          {user.subscriptionTier !== 'pro' && (
            <p className="text-xs mt-1 font-semibold">Upgrade for more features</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
