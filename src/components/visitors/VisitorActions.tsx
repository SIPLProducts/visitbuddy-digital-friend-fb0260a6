import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Edit, Printer, LogIn, LogOut, UserCheck } from 'lucide-react';
import { Visitor } from '@/types/database';

interface VisitorActionsProps {
  visitor: Visitor;
  onViewDetails: (visitor: Visitor) => void;
  onEdit: (visitor: Visitor) => void;
  onPrintBadge: (visitor: Visitor) => void;
  onCheckIn: (visitor: Visitor) => void;
  onCheckOut: (visitor: Visitor) => void;
  onCheckInAndPrint?: (visitor: Visitor) => void;
}

export function VisitorActions({
  visitor,
  onViewDetails,
  onEdit,
  onPrintBadge,
  onCheckIn,
  onCheckOut,
  onCheckInAndPrint,
}: VisitorActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Quick Check In & Print button for scheduled visitors */}
      {visitor.status === 'scheduled' && onCheckInAndPrint && (
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 h-8 text-xs"
          onClick={() => onCheckInAndPrint(visitor)}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <Printer className="h-3.5 w-3.5" />
          Check In & Print
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
          {visitor.status !== 'checked_out' && (
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
          {visitor.status === 'checked_in' && (
            <DropdownMenuItem onClick={() => onCheckOut(visitor)}>
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </DropdownMenuItem>
          )}
          {(visitor.status === 'scheduled' || visitor.status === 'checked_out') && (
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
