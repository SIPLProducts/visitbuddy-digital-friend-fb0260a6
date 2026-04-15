import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Visitor } from '@/types/database';
import { Building2, Mail, Phone, Laptop, Calendar, Clock, User, MapPin, ShieldCheck, Car, Smartphone, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700 border-amber-200';
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
      case 'pending_approval':
        return 'Pending Approval';
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

  const getCheckoutMethodLabel = (method: string | null) => {
    switch (method) {
      case 'security': return 'Security';
      case 'self': return 'Self';
      case 'system': return 'System (Auto)';
      default: return method || '—';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Visitor Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header with Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {visitor.photo_url && <AvatarImage src={visitor.photo_url} alt={visitor.name} />}
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

            {/* Created Date */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Created:</span>{' '}
              {new Date(visitor.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
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

            {/* Visit Information */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Visit Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date of Visit</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {visitor.scheduled_date
                      ? new Date(visitor.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'medium' })
                      : '—'}
                  </p>
                </div>
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
                {(visitor as any).govt_id_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Govt ID Number</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {(visitor as any).govt_id_number}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Info */}
            {visitor.vehicle_type && visitor.vehicle_type !== 'by_walk' && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Vehicle Information</h4>
                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">{visitor.vehicle_type.replace('_', ' ')}</p>
                    {visitor.vehicle_number && (
                      <p className="text-xs text-muted-foreground">
                        Number: {visitor.vehicle_number}
                      </p>
                    )}
                  </div>
                </div>
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
                {(visitor as any).checkout_method && (
                  <div>
                    <p className="text-xs text-muted-foreground">Checkout Method</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <LogOut className="h-3 w-3" />
                      {getCheckoutMethodLabel((visitor as any).checkout_method)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Laptop Info */}
            {visitor.has_laptop && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Laptop Details</h4>
                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                  <Laptop className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{visitor.laptop_brand || 'Laptop'}</p>
                    {visitor.laptop_serial && (
                      <p className="text-xs text-muted-foreground">
                        Serial: {visitor.laptop_serial}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Info */}
            {visitor.has_mobile && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Mobile Details</h4>
                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{visitor.mobile_brand || 'Mobile'}</p>
                    {visitor.mobile_serial && (
                      <p className="text-xs text-muted-foreground">
                        IMEI/Serial: {visitor.mobile_serial}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
