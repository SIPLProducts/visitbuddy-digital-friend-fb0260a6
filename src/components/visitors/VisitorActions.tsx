import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Edit, Printer, LogIn, LogOut, UserCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Visitor } from '@/types/database';

interface VisitorActionsProps {
  visitor: Visitor;
  onViewDetails: (visitor: Visitor) => void;
  onEdit: (visitor: Visitor) => void;
  onPrintBadge: (visitor: Visitor) => void;
  onCheckIn: (visitor: Visitor) => void;
  onCheckOut: (visitor: Visitor) => void;
  onCheckInAndPrint?: (visitor: Visitor) => void;
  onApprove?: (visitor: Visitor) => void;
  onReject?: (visitor: Visitor) => void;
  canCheckInOut?: boolean;
  canEdit?: boolean;
  actionLoadingId?: string | null;
}

export function VisitorActions({
  visitor,
  onViewDetails,
  onEdit,
  onPrintBadge,
  onCheckIn,
  onCheckOut,
  onCheckInAndPrint,
  onApprove,
  onReject,
  canCheckInOut = true,
  canEdit = true,
  actionLoadingId,
}: VisitorActionsProps) {
  const today = new Date().toISOString().split('T')[0];
  const isScheduledToday = !visitor.scheduled_date || visitor.scheduled_date === today;
  const isLoading = actionLoadingId === visitor.id;

  return (
    <div className="flex items-center gap-1">
      {/* Quick Check In & Print button for scheduled visitors */}
      {canCheckInOut && visitor.status === 'scheduled' && isScheduledToday && onCheckInAndPrint && (
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 h-8 text-xs"
          onClick={() => onCheckInAndPrint(visitor)}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
            <>
              <UserCheck className="h-3.5 w-3.5" />
              <Printer className="h-3.5 w-3.5" />
            </>
          )}
          Check In & Print
        </Button>
      )}

      {/* Quick Approve/Reject buttons for pending visitors */}
      {visitor.status === 'pending_approval' && onApprove && (
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onApprove(visitor)}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Approve
        </Button>
      )}
      {visitor.status === 'pending_approval' && onReject && (
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 h-8 text-xs"
          onClick={() => onReject(visitor)}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Reject
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDetails(visitor)}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          {canEdit && visitor.status !== 'checked_out' && (
            <DropdownMenuItem onClick={() => onEdit(visitor)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onPrintBadge(visitor)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Badge
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {visitor.status === 'pending_approval' && onApprove && (
            <DropdownMenuItem onClick={() => onApprove(visitor)} disabled={isLoading}>
              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
              Approve
            </DropdownMenuItem>
          )}
          {visitor.status === 'pending_approval' && onReject && (
            <DropdownMenuItem onClick={() => onReject(visitor)} disabled={isLoading}>
              <XCircle className="h-4 w-4 mr-2 text-destructive" />
              Reject
            </DropdownMenuItem>
          )}
          {canCheckInOut && visitor.status === 'checked_in' && (
            <DropdownMenuItem onClick={() => onCheckOut(visitor)}>
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </DropdownMenuItem>
          )}
          {canCheckInOut && isScheduledToday && visitor.status === 'scheduled' && (
            <DropdownMenuItem onClick={() => onCheckIn(visitor)}>
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
