import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Search, Filter, Plus, Building2, Laptop, Mail, Car, CalendarIcon, X, CheckSquare, LogOut, Printer, ChevronDown, MapPin, DoorOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { VisitorDetailsDialog } from '@/components/visitors/VisitorDetailsDialog';
import { VisitorEditDialog } from '@/components/visitors/VisitorEditDialog';
import { VisitorActions } from '@/components/visitors/VisitorActions';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CheckInCaptureDialog } from '@/components/visitors/CheckInCaptureDialog';
import { logAudit } from '@/lib/auditLog';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useHostEmployee } from '@/hooks/useHostEmployee';
import { useTranslation } from 'react-i18next';
import NewVisitor from './NewVisitor';

export default function Visitors() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userRoles, isHoAdmin, loading: rolesLoading } = useUserRoles();
  const { hostEmployeeId } = useHostEmployee();
  const [searchParams] = useSearchParams();
  const isGateSecurityOnly = useMemo(() => {
    if (rolesLoading) return false;
    if (isHoAdmin) return false;
    return userRoles.length > 0 && userRoles.every(r => r.role === 'gate_security');
  }, [userRoles, isHoAdmin, rolesLoading]);
  const isGateSecurity = useMemo(() => {
    if (isHoAdmin) return true;
    return userRoles.some(r => r.role === 'gate_security');
  }, [userRoles, isHoAdmin]);
  const isRestrictedRole = useMemo(() => {
    if (rolesLoading) return false;
    if (isHoAdmin) return false;
    if (userRoles.some(r => r.role === 'admin' || r.role === 'gate_security')) return false;
    return true; // Manager or Operator
  }, [userRoles, isHoAdmin, rolesLoading]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [gateFilter, setGateFilter] = useState('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [gates, setGates] = useState<{ id: string; name: string }[]>([]);
  
  // Dialog states
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureVisitor, setCaptureVisitor] = useState<Visitor | null>(null);
  const [captureAutoPrint, setCaptureAutoPrint] = useState(false);
  const [showNewVisitorForm, setShowNewVisitorForm] = useState(false);

  // Read URL status param (e.g. from PendingApprovals dashboard link)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  // Default filters for gate security users
  useEffect(() => {
    if (isGateSecurityOnly) {
      setStatusFilter('scheduled');
      const today = new Date();
      setFromDate(today);
      setToDate(today);
    }
  }, [isGateSecurityOnly]);

  useEffect(() => {
    fetchVisitors();
    fetchFilterOptions();

    // Realtime subscription for auto-refresh when visitors are updated
    const channel = supabase
      .channel('visitors-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchVisitors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const fetchFilterOptions = async () => {
    const [deptRes, locRes, gateRes] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('gates').select('id, name').order('name'),
    ]);
    if (deptRes.data) setDepartments(deptRes.data);
    if (locRes.data) setLocations(locRes.data);
    if (gateRes.data) setGates(gateRes.data);
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
    setCaptureVisitor(visitor);
    setCaptureAutoPrint(false);
    setCaptureDialogOpen(true);
  };

  const handleCheckInAndPrint = (visitor: Visitor) => {
    setCaptureVisitor(visitor);
    setCaptureAutoPrint(true);
    setCaptureDialogOpen(true);
  };

  const handleCheckOut = async (visitor: Visitor) => {
    const { error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
        checkout_method: 'security',
      })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to check out visitor');
    } else {
      toast.success(`${visitor.name} checked out successfully`);
      fetchVisitors();
    }
  };

  const handleApprove = async (visitor: Visitor) => {
    if (visitor.status !== 'pending_approval') {
      toast.info(`${visitor.name} is already ${visitor.status === 'scheduled' ? 'approved' : visitor.status}`);
      fetchVisitors();
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('approve-visitor', {
        body: { visitorId: visitor.id, action: 'approve' },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.currentStatus === 'scheduled') {
          toast.info(`${visitor.name} is already approved`);
        } else {
          toast.error(data.error);
        }
        fetchVisitors();
        return;
      }
      toast.success(`${visitor.name} approved successfully`);
      fetchVisitors();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve visitor');
    }
  };

  const handleReject = async (visitor: Visitor) => {
    if (visitor.status !== 'pending_approval') {
      toast.info(`${visitor.name} is no longer pending approval`);
      fetchVisitors();
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('approve-visitor', {
        body: { visitorId: visitor.id, action: 'reject' },
      });
      if (error) throw error;
      if (data?.error) {
        toast.info(`${visitor.name} is no longer pending approval`);
        fetchVisitors();
        return;
      }
      toast.success(`${visitor.name} rejected`);
      fetchVisitors();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject visitor');
    }
  };

  const isManagerOnly = useMemo(() => {
    if (isHoAdmin) return false;
    return userRoles.length > 0 && userRoles.some(r => r.role === 'manager');
  }, [userRoles, isHoAdmin]);

  const canApproveReject = !isGateSecurityOnly;

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
    // Host-based filtering for Manager/Operator roles
    if (isRestrictedRole && hostEmployeeId && visitor.host_id !== hostEmployeeId && (visitor as any).created_by_user_id !== user?.id) {
      return false;
    }

    const matchesSearch =
      visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.visitor_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || visitor.status === statusFilter;

    const matchesDepartment =
      departmentFilter === 'all' || visitor.department_id === departmentFilter;

    const matchesLocation =
      locationFilter === 'all' || visitor.gate?.location_id === locationFilter;

    const matchesGate =
      gateFilter === 'all' || visitor.gate_id === gateFilter;

    const visitorDate = new Date(visitor.created_at);
    const matchesFromDate = !fromDate || visitorDate >= new Date(new Date(fromDate).setHours(0, 0, 0, 0));
    const matchesToDate = !toDate || visitorDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999));

    return matchesSearch && matchesStatus && matchesDepartment && matchesLocation && matchesGate && matchesFromDate && matchesToDate;
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
    const { error } = await supabase.from('visitors').update({ status: 'checked_out', check_out_time: new Date().toISOString(), checkout_method: 'security' }).in('id', checkedIn.map(v => v.id));
    setBulkLoading(false);
    if (error) { toast.error('Bulk checkout failed'); return; }
    await logAudit({ action: 'bulk_checkout', entityType: 'visitor', entityName: `${checkedIn.length} visitors`, details: { count: checkedIn.length } });
    toast.success(`${checkedIn.length} visitors checked out`);
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
    <>
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
                  
                  <DropdownMenuItem onClick={handleBulkPrint} className="gap-2"><Printer className="h-4 w-4" /> Print Badges</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button className="gap-2" onClick={() => setShowNewVisitorForm(true)}>
              <Plus className="h-4 w-4" />
              {t('visitors.newVisitor')}
            </Button>
          </div>
        </div>

        {/* Inline New Visitor Form */}
        {showNewVisitorForm && (
          <div className="border border-border rounded-xl bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Pre-Register Visitor</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewVisitorForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NewVisitor inline onClose={() => { setShowNewVisitorForm(false); fetchVisitors(); }} />
          </div>
        )}

        {!showNewVisitorForm && (
          <>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('visitors.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('visitors.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('visitors.allStatus')}</SelectItem>
              <SelectItem value="pending_approval">{t('visitors.pendingApproval')}</SelectItem>
              <SelectItem value="checked_in">{t('visitors.checkedIn')}</SelectItem>
              <SelectItem value="checked_out">{t('visitors.checkedOut')}</SelectItem>
              <SelectItem value="scheduled">{t('visitors.scheduled')}</SelectItem>
              <SelectItem value="cancelled">{t('visitors.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-44">
              <Building2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t('dashboard.allDepartments')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allDepartments')}</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-44">
              <MapPin className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t('dashboard.allLocations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allLocations')}</SelectItem>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Gate Filter */}
          <Select value={gateFilter} onValueChange={setGateFilter}>
            <SelectTrigger className="w-40">
              <DoorOpen className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t('gates.title')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('gates.title')}</SelectItem>
              {gates.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* From Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd/MM/yyyy") : t('visitors.fromDate')}
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
                {toDate ? format(toDate, "dd/MM/yyyy") : t('visitors.toDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {(fromDate || toDate || departmentFilter !== 'all' || locationFilter !== 'all' || gateFilter !== 'all') && (
            <Button variant="ghost" size="icon" onClick={() => { setFromDate(undefined); setToDate(undefined); setDepartmentFilter('all'); setLocationFilter('all'); setGateFilter('all'); }} title="Clear all filters">
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
                <TableHead>{t('visitors.visitor')}</TableHead>
                <TableHead>{t('visitors.id')}</TableHead>
                <TableHead>{t('visitors.company')}</TableHead>
                <TableHead>{t('visitors.hostDepartment')}</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>{t('visitors.dateOfVisit')}</TableHead>
                <TableHead>{t('visitors.vehicle')}</TableHead>
                <TableHead>{t('visitors.laptop')}</TableHead>
                <TableHead>{t('visitors.status')}</TableHead>
                <TableHead>Checkout By</TableHead>
                <TableHead>{t('visitors.checkInOut')}</TableHead>
                <TableHead className="w-10">{t('visitors.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                   <TableCell colSpan={14} className="text-center py-8">
                    {t('visitors.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8">
                    {t('visitors.noVisitors')}
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
                    <TableCell className="text-sm text-muted-foreground">
                      {visitor.purpose || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(visitor.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {visitor.scheduled_date ? format(new Date(visitor.scheduled_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
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
                    <TableCell>
                      {visitor.status === 'checked_out' && (visitor as any).checkout_method ? (
                        <Badge variant="outline" className={cn('capitalize text-xs',
                          (visitor as any).checkout_method === 'self' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          (visitor as any).checkout_method === 'security' && 'bg-sky-50 text-sky-700 border-sky-200',
                          (visitor as any).checkout_method === 'system' && 'bg-amber-50 text-amber-700 border-amber-200',
                        )}>
                          {(visitor as any).checkout_method === 'self' ? '🚶 Self' :
                           (visitor as any).checkout_method === 'security' ? '🛡️ Security' :
                           (visitor as any).checkout_method === 'system' ? '⚙️ System' :
                           (visitor as any).checkout_method}
                        </Badge>
                      ) : visitor.status === 'checked_out' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
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
                      <VisitorActions
                        visitor={visitor}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onPrintBadge={handlePrintBadge}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        onCheckInAndPrint={handleCheckInAndPrint}
                        onApprove={canApproveReject ? handleApprove : undefined}
                        onReject={canApproveReject ? handleReject : undefined}
                        canCheckInOut={isGateSecurity}
                        canEdit={true}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
          </>
        )}
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
      <CheckInCaptureDialog
        open={captureDialogOpen}
        onOpenChange={setCaptureDialogOpen}
        visitor={captureVisitor}
        onComplete={fetchVisitors}
        autoPrint={captureAutoPrint}
      />
    </>
  );
}
