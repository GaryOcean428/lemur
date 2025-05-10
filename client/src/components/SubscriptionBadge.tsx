import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

export function SubscriptionBadge() {
  const { user } = useAuth();

  if (!user?.subscriptionTier) {
    return null;
  }

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
    developer: 'bg-green-100 text-green-800'
  };

  return (
    <Badge className={tierColors[user.subscriptionTier]}>
      {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
    </Badge>
  );
}
