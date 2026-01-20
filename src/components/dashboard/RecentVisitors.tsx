import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Building2, User, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';

interface RecentVisitorsProps {
  visitors: Visitor[];
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'checked_out':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
          visitors.slice(0, 5).map((visitor) => (
            <div key={visitor.id} className="p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(visitor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{visitor.name}</p>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getStatusColor(visitor.status))}
                    >
                      {getStatusLabel(visitor.status)}
                    </Badge>
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
