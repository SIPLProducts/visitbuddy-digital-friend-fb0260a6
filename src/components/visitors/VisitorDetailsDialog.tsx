import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Visitor } from '@/types/database';
import { Building2, Mail, Phone, Laptop, Calendar, Clock, User, MapPin, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisitorDetailsDialogProps {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisitorDetailsDialog({ visitor, open, onOpenChange }: VisitorDetailsDialogProps) {
  if (!visitor) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'checked_out':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'scheduled':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Visitor Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {getInitials(visitor.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{visitor.name}</h3>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {visitor.visitor_id}
              </code>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={cn('capitalize', getStatusColor(visitor.status))}
                >
                  {getStatusLabel(visitor.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {visitor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{visitor.email}</span>
              </div>
            )}
            {visitor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{visitor.phone}</span>
              </div>
            )}
            {visitor.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{visitor.company}</span>
              </div>
            )}
          </div>

          {/* Host & Department */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Visit Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Host</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {visitor.host?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">
                  {visitor.host?.department?.name || visitor.department?.name || '—'}
                </p>
              </div>
              {visitor.gate && (
                <div>
                  <p className="text-xs text-muted-foreground">Gate</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {visitor.gate.name}
                  </p>
                </div>
              )}
              {visitor.purpose && (
                <div>
                  <p className="text-xs text-muted-foreground">Purpose</p>
                  <p className="text-sm">{visitor.purpose}</p>
                </div>
              )}
            </div>
            </div>
            {(visitor as any).govt_id_number && (
              <div>
                <p className="text-xs text-muted-foreground">Govt ID Number</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {(visitor as any).govt_id_number}
                </p>
              </div>
            )}

          {/* Check-in/out Times */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Timing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Check-in Time</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(visitor.check_in_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-out Time</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(visitor.check_out_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Laptop Info */}
          {visitor.has_laptop && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Laptop Details</h4>
              <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                <Laptop className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{visitor.laptop_brand}</p>
                  {visitor.laptop_serial && (
                    <p className="text-xs text-muted-foreground">
                      Serial: {visitor.laptop_serial}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Accompanying */}
          {visitor.accompanying_count && visitor.accompanying_count > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Accompanying persons:</span>{' '}
                <span className="font-medium">{visitor.accompanying_count}</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
