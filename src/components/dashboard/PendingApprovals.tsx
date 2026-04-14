import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Clock, 
  AlertCircle,
  Hourglass
} from 'lucide-react';
import { Visitor } from '@/types/database';
import { Link } from 'react-router-dom';

interface PendingApprovalsProps {
  visitors: Visitor[];
  onRefresh: () => void;
}

export function PendingApprovals({ visitors }: PendingApprovalsProps) {
  const { userRoles, isHoAdmin } = useUserRoles();
  
  const isGateSecurityOnly = useMemo(() => {
    if (isHoAdmin) return false;
    return userRoles.length > 0 && userRoles.every(r => r.role === 'gate_security');
  }, [userRoles, isHoAdmin]);
  
  const pendingVisitors = visitors.filter(v => v.status === 'pending_approval');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (pendingVisitors.length === 0 || isGateSecurityOnly) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
              <p className="text-xs text-muted-foreground">{pendingVisitors.length} visitor(s) awaiting host approval</p>
            </div>
          </div>
          <Link to="/visitors?status=pending_approval">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingVisitors.slice(0, 5).map((visitor) => (
          <div key={visitor.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
            <Avatar className="h-10 w-10">
              {visitor.photo_url && <AvatarImage src={visitor.photo_url} />}
              <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-medium">
                {getInitials(visitor.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{visitor.name}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <Hourglass className="h-2.5 w-2.5" />
                  Awaiting Host
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {visitor.company && (
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="h-3 w-3" />
                    {visitor.company}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(visitor.created_at)}
                </span>
              </div>
              {visitor.host?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Host: <span className="font-medium">{visitor.host.name}</span>
                </p>
              )}
            </div>
          </div>
        ))}
        
        {pendingVisitors.length > 5 && (
          <Link to="/visitors?status=pending_approval" className="block">
            <Button variant="outline" className="w-full text-sm">
              View {pendingVisitors.length - 5} more pending approval(s)
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
