import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Building2, User, MapPin, Clock, Navigation, LogIn, LogOut, Eye, Printer, UsersRound, ChevronDown, ChevronUp, Laptop, Smartphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { SwipeableCard } from '@/components/shared/SwipeableCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { CheckInCaptureDialog } from '@/components/visitors/CheckInCaptureDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RecentVisitorsProps {
  visitors: Visitor[];
  onRefresh?: () => void;
}

export function RecentVisitors({ visitors, onRefresh }: RecentVisitorsProps) {
  const navigate = useNavigate();
  const { userRoles, isHoAdmin } = useUserRoles();
  const isGateSecurity = useMemo(() => {
    if (isHoAdmin) return true;
    return userRoles.some(r => r.role === 'gate_security');
  }, [userRoles, isHoAdmin]);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureVisitor, setCaptureVisitor] = useState<Visitor | null>(null);
  const [expandedGuests, setExpandedGuests] = useState<Record<string, boolean>>({});
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]/20';
      case 'checked_out':
        return 'bg-gray-100 text-gray-600 border-gray-300/20';
      case 'scheduled':
        return 'bg-gray-100 text-gray-600 border-gray-300/20';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      case 'scheduled':
        return 'Scheduled';
      default:
        return status;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCheckIn = (visitor: Visitor) => {
    setCaptureVisitor(visitor);
    setCaptureDialogOpen(true);
  };

  const handleCheckOut = async (visitor: Visitor) => {
    const { data, error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
        checkout_method: 'security',
      })
      .eq('id', visitor.id)
      .select('id');

    if (error) {
      toast.error(`Failed to check out: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("You don't have permission to check out this visitor at this location.");
      return;
    }
    toast.success(`${visitor.name} checked out`);
    onRefresh?.();
  };

  const getSwipeActions = (visitor: Visitor) => {
    if (!isGateSecurity) return {};
    const today = new Date().toISOString().split('T')[0];
    const isScheduledToday = !visitor.scheduled_date || visitor.scheduled_date === today;
    if (visitor.status === 'checked_in') {
      return {
        rightAction: {
          icon: <LogOut className="h-5 w-5" />,
          label: 'Check Out',
          onClick: () => handleCheckOut(visitor),
          className: 'bg-rose-500',
        },
      };
    }
    if (isScheduledToday && (visitor.status === 'scheduled' || visitor.status === 'checked_out')) {
      return {
        rightAction: {
          icon: <LogIn className="h-5 w-5" />,
          label: 'Check In',
          onClick: () => handleCheckIn(visitor),
          className: 'bg-emerald-500',
        },
      };
    }
    return {};
  };

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Visitors</h3>
        <Link to="/visitors">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </div>
      <div className="divide-y divide-border">
        {visitors.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No recent visitors
          </div>
        ) : (
          visitors.slice(0, 5).map((visitor) => {
            const swipeActions = getSwipeActions(visitor);
            const guests = ((visitor as any).accompanying || []) as Array<any>;
            const guestCount = (visitor as any).accompanying_count || guests.length || 0;
            const isExpanded = !!expandedGuests[visitor.id];
            const previewNames = guests.slice(0, 2).map((g) => g.name).join(', ');
            const moreCount = Math.max(0, guests.length - 2);
            return (
              <SwipeableCard
                key={visitor.id}
                {...swipeActions}
              >
                <div className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#0891b2] text-white font-medium">
                        {getInitials(visitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{visitor.name}</p>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getStatusColor(visitor.status))}
                        >
                          {getStatusLabel(visitor.status)}
                        </Badge>
                        {guestCount > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <UsersRound className="h-3 w-3" />
                            +{guestCount} guest{guestCount === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {visitor.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {visitor.company}
                          </span>
                        )}
                        {visitor.host && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {visitor.host.name}
                          </span>
                        )}
                        {visitor.gate?.location && (
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {visitor.gate.location.name}
                          </span>
                        )}
                        {visitor.gate && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {visitor.gate.name}
                          </span>
                        )}
                        {visitor.check_in_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(visitor.check_in_time)}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                        <DropdownMenuItem onClick={() => navigate(`/visitors`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {isGateSecurity && visitor.status === 'checked_in' && (
                          <DropdownMenuItem onClick={() => handleCheckOut(visitor)}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Check Out
                          </DropdownMenuItem>
                        )}
                        {isGateSecurity && (() => { const t = new Date().toISOString().split('T')[0]; return !visitor.scheduled_date || visitor.scheduled_date === t; })() && (visitor.status === 'scheduled' || visitor.status === 'checked_out') && (
                          <DropdownMenuItem onClick={() => handleCheckIn(visitor)}>
                            <LogIn className="h-4 w-4 mr-2" />
                            Check In
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => window.open(`/print-badge?id=${visitor.id}`, '_blank')}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print Badge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SwipeableCard>
            );
          })
        )}
      </div>
      <CheckInCaptureDialog
        open={captureDialogOpen}
        onOpenChange={setCaptureDialogOpen}
        visitor={captureVisitor}
        onComplete={() => onRefresh?.()}
        autoPrint={true}
      />
    </div>
  );
}
