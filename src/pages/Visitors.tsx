import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter, Plus, Building2, Laptop, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VisitorDetailsDialog } from '@/components/visitors/VisitorDetailsDialog';
import { VisitorEditDialog } from '@/components/visitors/VisitorEditDialog';
import { VisitorActions } from '@/components/visitors/VisitorActions';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CheckInDialog } from '@/components/visitors/CheckInDialog';

export default function Visitors() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkInVisitor, setCheckInVisitor] = useState<Visitor | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInAndPrint, setCheckInAndPrint] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*),
        gate:gates(*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setVisitors(data as unknown as Visitor[]);
    }
    setLoading(false);
  };

  const handleViewDetails = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setEditDialogOpen(true);
  };

  const handlePrintBadge = (visitor: Visitor) => {
    // Open dedicated print page in new tab for direct printing
    window.open(`/print-badge?id=${visitor.id}`, '_blank');
  };

  const handleCheckIn = (visitor: Visitor) => {
    setCheckInVisitor(visitor);
    setCheckInAndPrint(false);
    setCheckInDialogOpen(true);
  };

  const handleCheckInAndPrint = (visitor: Visitor) => {
    setCheckInVisitor(visitor);
    setCheckInAndPrint(true);
    setCheckInDialogOpen(true);
  };

  const handleConfirmCheckIn = async (govtIdNumber: string) => {
    if (!checkInVisitor) return;
    setCheckInLoading(true);

    const { error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_in' as const,
        check_in_time: new Date().toISOString(),
        govt_id_number: govtIdNumber,
      })
      .eq('id', checkInVisitor.id);

    setCheckInLoading(false);

    if (error) {
      toast.error('Failed to check in visitor');
      return;
    }

    toast.success(`${checkInVisitor.name} checked in successfully`);
    setCheckInDialogOpen(false);

    if (checkInAndPrint) {
      window.open(`/print-badge?id=${checkInVisitor.id}`, '_blank');
    }

    setCheckInVisitor(null);
    fetchVisitors();
  };

  const handleCheckOut = async (visitor: Visitor) => {
    const { error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
      })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to check out visitor');
    } else {
      toast.success(`${visitor.name} checked out successfully`);
      fetchVisitors();
    }
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
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'checked in';
      case 'checked_out':
        return 'checked out';
      case 'scheduled':
        return 'scheduled';
      case 'pending_approval':
        return 'pending approval';
      case 'cancelled':
        return 'cancelled';
      default:
        return status;
    }
  };

  const handleApprove = async (visitor: Visitor) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-visitor', {
        body: { visitorId: visitor.id, action: 'approve' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${visitor.name} approved! Badge sent via WhatsApp & SMS.`);
        fetchVisitors();
      } else {
        throw new Error(data.error || 'Failed to approve');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve visitor');
    }
  };

  const handleReject = async (visitor: Visitor) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-visitor', {
        body: { visitorId: visitor.id, action: 'reject' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${visitor.name} rejected.`);
        fetchVisitors();
      } else {
        throw new Error(data.error || 'Failed to reject');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject visitor');
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '—';
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

  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.visitor_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || visitor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRefresh = useCallback(async () => {
    await fetchVisitors();
  }, []);

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visitors</h1>
            <p className="text-muted-foreground">
              Manage and track all visitor records
            </p>
          </div>
          <Link to="/visitors/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Visitor
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, email, ID, or laptop serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Host / Department</TableHead>
                <TableHead>Laptop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in/out</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading visitors...
                  </TableCell>
                </TableRow>
              ) : filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No visitors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {getInitials(visitor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {visitor.name}
                          </p>
                          {visitor.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {visitor.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {visitor.visitor_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {visitor.company ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {visitor.company}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {visitor.host?.name || '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {visitor.host?.department?.name || visitor.department?.name || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {visitor.has_laptop ? (
                        <div className="flex items-center gap-1">
                          <Laptop className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{visitor.laptop_brand}</p>
                            {visitor.laptop_serial && (
                              <p className="text-xs text-muted-foreground">
                                {visitor.laptop_serial}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No laptop</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', getStatusColor(visitor.status))}
                      >
                        {getStatusLabel(visitor.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {visitor.check_in_time
                        ? `${formatTime(visitor.check_in_time)}${
                            visitor.check_out_time
                              ? ` → ${formatTime(visitor.check_out_time)}`
                              : ''
                          }`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {visitor.status === 'pending_approval' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleApprove(visitor)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(visitor)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <VisitorActions
                          visitor={visitor}
                          onViewDetails={handleViewDetails}
                          onEdit={handleEdit}
                          onPrintBadge={handlePrintBadge}
                          onCheckIn={handleCheckIn}
                          onCheckOut={handleCheckOut}
                          onCheckInAndPrint={handleCheckInAndPrint}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </PullToRefresh>

      {/* Dialogs */}
      <VisitorDetailsDialog
        visitor={selectedVisitor}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
      <VisitorEditDialog
        visitor={selectedVisitor}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={fetchVisitors}
      />
      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        visitorName={checkInVisitor?.name || ''}
        onConfirm={handleConfirmCheckIn}
        loading={checkInLoading}
      />
    </MainLayout>
  );
}
