import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Plus, Building2, Laptop, Mail, Car, CalendarIcon, X, CheckSquare, LogOut, Printer, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { VisitorDetailsDialog } from '@/components/visitors/VisitorDetailsDialog';
import { VisitorEditDialog } from '@/components/visitors/VisitorEditDialog';
import { VisitorActions } from '@/components/visitors/VisitorActions';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CheckInDialog } from '@/components/visitors/CheckInDialog';
import { logAudit } from '@/lib/auditLog';
import { useTranslation } from 'react-i18next';

export default function Visitors() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  
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

    const visitorDate = new Date(visitor.created_at);
    const matchesFromDate = !fromDate || visitorDate >= new Date(fromDate.setHours(0, 0, 0, 0));
    const matchesToDate = !toDate || visitorDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999));

    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const handleRefresh = useCallback(async () => {
    await fetchVisitors();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVisitors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVisitors.map(v => v.id)));
    }
  };

  const handleBulkCheckout = async () => {
    const checkedIn = filteredVisitors.filter(v => selectedIds.has(v.id) && v.status === 'checked_in');
    if (checkedIn.length === 0) { toast.error('No checked-in visitors selected'); return; }
    setBulkLoading(true);
    const { error } = await supabase.from('visitors').update({ status: 'checked_out', check_out_time: new Date().toISOString() }).in('id', checkedIn.map(v => v.id));
    setBulkLoading(false);
    if (error) { toast.error('Bulk checkout failed'); return; }
    await logAudit({ action: 'bulk_checkout', entityType: 'visitor', entityName: `${checkedIn.length} visitors`, details: { count: checkedIn.length } });
    toast.success(`${checkedIn.length} visitors checked out`);
    setSelectedIds(new Set());
    fetchVisitors();
  };

  const handleBulkApprove = async () => {
    const pending = filteredVisitors.filter(v => selectedIds.has(v.id) && v.status === 'pending_approval');
    if (pending.length === 0) { toast.error('No pending visitors selected'); return; }
    setBulkLoading(true);
    for (const v of pending) {
      await supabase.functions.invoke('approve-visitor', { body: { visitorId: v.id, action: 'approve' } });
    }
    setBulkLoading(false);
    await logAudit({ action: 'bulk_approval', entityType: 'visitor', entityName: `${pending.length} visitors`, details: { count: pending.length } });
    toast.success(`${pending.length} visitors approved`);
    setSelectedIds(new Set());
    fetchVisitors();
  };

  const handleBulkPrint = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error('No visitors selected'); return; }
    ids.forEach(id => window.open(`/print-badge?id=${id}`, '_blank'));
    toast.success(`Printing ${ids.length} badges`);
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('visitors.title')}</h1>
            <p className="text-muted-foreground">
              {t('visitors.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1.5" disabled={bulkLoading}>
                    <CheckSquare className="h-4 w-4" />
                    Bulk Actions ({selectedIds.size})
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover">
                  <DropdownMenuItem onClick={handleBulkCheckout} className="gap-2"><LogOut className="h-4 w-4" /> Check Out Selected</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkApprove} className="gap-2"><CheckSquare className="h-4 w-4" /> Approve Selected</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkPrint} className="gap-2"><Printer className="h-4 w-4" /> Print Badges</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link to="/visitors/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Visitor
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, email, ID..."
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

          {/* From Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd/MM/yyyy") : "From Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* To Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "dd/MM/yyyy") : "To Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {(fromDate || toDate) && (
            <Button variant="ghost" size="icon" onClick={() => { setFromDate(undefined); setToDate(undefined); }} title="Clear date filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredVisitors.length > 0 && selectedIds.size === filteredVisitors.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Host / Department</TableHead>
                <TableHead>Date of Visit</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Laptop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in/out</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                   <TableCell colSpan={11} className="text-center py-8">
                    Loading visitors...
                  </TableCell>
                </TableRow>
              ) : filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    No visitors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id} className={selectedIds.has(visitor.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(visitor.id)}
                        onCheckedChange={() => toggleSelect(visitor.id)}
                      />
                    </TableCell>
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
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(visitor.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {visitor.vehicle_type && visitor.vehicle_type !== 'by_walk' ? (
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm capitalize">{visitor.vehicle_type.replace('_', ' ')}</p>
                            {visitor.vehicle_number && (
                              <p className="text-xs text-muted-foreground">{visitor.vehicle_number}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">By Walk</span>
                      )}
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
        visitorPhone={checkInVisitor?.phone}
        visitorEmail={checkInVisitor?.email}
        onConfirm={handleConfirmCheckIn}
        loading={checkInLoading}
      />
    </MainLayout>
  );
}
