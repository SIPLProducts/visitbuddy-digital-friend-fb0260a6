import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HostCombobox } from '@/components/visitors/HostCombobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Building2, User, Clock, MoreVertical, Check, X, Trash2, CalendarDays, CalendarCheck, CalendarClock, CalendarX2, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Department, Employee } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { useUserRoles } from '@/hooks/useUserRoles';

export default function Appointments() {
  const { selectedLocationId, isAllLocations } = useSelectedLocation();
  const { isReadOnly } = useUserRoles();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    company: '',
    purpose: '',
    host_id: '',
    department_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '10:00',
    duration_minutes: 60,
    has_teams_meeting: false,
    notes: '',
  });

  useEffect(() => {
    fetchData();
    fetchTodayStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, isAllLocations]);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedLocationId, isAllLocations]);

  const fetchData = async () => {
    let deptQuery: any = supabase.from('departments').select('*').order('name');
    let empQuery: any = supabase
      .from('employees')
      .select('*, department:departments(*)')
      .eq('is_host', true)
      .order('name');
    if (!isAllLocations && selectedLocationId) {
      deptQuery = deptQuery.eq('location_id', selectedLocationId);
      empQuery = empQuery.eq('location_id', selectedLocationId);
    }
    const [deptRes, empRes] = await Promise.all([deptQuery, empQuery]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
    setFormData((prev) => ({ ...prev, host_id: '', department_id: '' }));
  };

  const fetchTodayStats = async () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('scheduled_date', dateStr);

    if (data) {
      setAllAppointments(data as unknown as Appointment[]);
    }
  };

  const fetchAppointments = async () => {
    if (!selectedDate) return;

    setLoading(true);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*, location_id)
      `)
      .eq('scheduled_date', dateStr)
      .order('scheduled_time');

    if (data) {
      const filtered = (data as unknown as any[]).filter((a) => {
        if (isAllLocations) return true;
        return !a.department?.location_id || a.department?.location_id === selectedLocationId;
      });
      setAppointments(filtered as unknown as Appointment[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      visitor_name: '',
      visitor_email: '',
      visitor_phone: '',
      company: '',
      purpose: '',
      host_id: '',
      department_id: '',
      scheduled_date: selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
      scheduled_time: '10:00',
      duration_minutes: 60,
      has_teams_meeting: false,
      notes: '',
    });
  };

  const handleAdd = async () => {
    if (!formData.visitor_name || !formData.scheduled_date || !formData.scheduled_time) {
      toast.error('Please fill required fields');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from('appointments').insert({
      visitor_name: formData.visitor_name,
      visitor_email: formData.visitor_email || null,
      visitor_phone: formData.visitor_phone || null,
      company: formData.company || null,
      purpose: formData.purpose || null,
      host_id: formData.host_id || null,
      department_id: formData.department_id || null,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      duration_minutes: formData.duration_minutes,
      has_teams_meeting: formData.has_teams_meeting,
      notes: formData.notes || null,
      status: 'pending',
    });

    setFormLoading(false);
    if (error) {
      toast.error('Failed to schedule appointment');
    } else {
      toast.success('Appointment scheduled successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchAppointments();
      fetchTodayStats();
    }
  };

  const handleStatusUpdate = async (appointment: Appointment, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Appointment ${newStatus}`);
      fetchAppointments();
      fetchTodayStats();
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;

    setFormLoading(true);
    const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);

    setFormLoading(false);
    if (error) {
      toast.error('Failed to delete appointment');
    } else {
      toast.success('Appointment deleted');
      setIsDeleteDialogOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
      fetchTodayStats();
    }
  };

  const openDeleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CalendarCheck className="h-3.5 w-3.5" />;
      case 'pending': return <CalendarClock className="h-3.5 w-3.5" />;
      case 'cancelled': return <CalendarX2 className="h-3.5 w-3.5" />;
      case 'completed': return <Check className="h-3.5 w-3.5" />;
      default: return <CalendarDays className="h-3.5 w-3.5" />;
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const todayStats = useMemo(() => {
    const total = allAppointments.length;
    const confirmed = allAppointments.filter(a => a.status === 'confirmed').length;
    const pending = allAppointments.filter(a => a.status === 'pending').length;
    const cancelled = allAppointments.filter(a => a.status === 'cancelled').length;
    const completed = allAppointments.filter(a => a.status === 'completed').length;
    return { total, confirmed, pending, cancelled, completed };
  }, [allAppointments]);

  const scheduledCount = appointments.filter((a) => a.status !== 'cancelled').length;

  const getTimeSlotColor = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour < 12) return 'border-l-blue-500';
    if (hour < 15) return 'border-l-amber-500';
    return 'border-l-purple-500';
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Appointments
            </h1>
            <p className="text-muted-foreground">Schedule and manage visitor appointments</p>
          </div>
          {!isReadOnly && (
            <Button className="gap-2" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Schedule Appointment
            </Button>
          )}
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Today's Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{todayStats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-emerald-600">{todayStats.confirmed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-amber-600">{todayStats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-blue-500" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-blue-600">{todayStats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarX2 className="h-3.5 w-3.5 text-rose-500" />
                Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-rose-600">{todayStats.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md pointer-events-auto"
              />
            </CardContent>
          </Card>

          {/* Appointments List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Appointments</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {scheduledCount} scheduled
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading appointments...</div>
                  ) : appointments.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No appointments scheduled</p>
                      <p className="text-sm mt-1">
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'this date'}
                      </p>
                    </div>
                  ) : (
                    appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={cn(
                          'p-4 hover:bg-accent/50 transition-colors border-l-4',
                          getTimeSlotColor(appointment.scheduled_time)
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(appointment.visitor_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">{appointment.visitor_name}</p>
                              <Badge variant="outline" className={cn('gap-1 text-[10px] font-semibold', getStatusColor(appointment.status))}>
                                {getStatusIcon(appointment.status)}
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-foreground/80">
                                <Clock className="h-3 w-3" />
                                {formatTime(appointment.scheduled_time)}
                                <span className="text-muted-foreground font-normal">
                                  ({formatDuration(appointment.duration_minutes)})
                                </span>
                              </span>
                              {appointment.company && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {appointment.company}
                                </span>
                              )}
                              {appointment.host && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {appointment.host.name}
                                </span>
                              )}
                              {appointment.purpose && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {appointment.purpose}
                                </span>
                              )}
                            </div>
                            {(appointment.visitor_email || appointment.visitor_phone) && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {appointment.visitor_email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {appointment.visitor_email}
                                  </span>
                                )}
                                {appointment.visitor_phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {appointment.visitor_phone}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {!isReadOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {appointment.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(appointment, 'confirmed')}>
                                    <Check className="h-4 w-4 mr-2 text-emerald-600" />
                                    Confirm
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(appointment, 'cancelled')}>
                                    <X className="h-4 w-4 mr-2 text-rose-600" />
                                    Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                              {appointment.status === 'confirmed' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(appointment, 'completed')}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openDeleteDialog(appointment)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>Create a new visitor appointment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visitor Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="Company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="visitor@company.com"
                  value={formData.visitor_email}
                  onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.visitor_phone}
                  onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <HostCombobox
                  value={formData.host_id || ''}
                  options={employees as any}
                  onChange={(id, opt) =>
                    setFormData({
                      ...formData,
                      host_id: id,
                      department_id: opt?.department?.id || formData.department_id || '',
                    })
                  }
                  onClear={() => setFormData({ ...formData, host_id: '' })}
                  placeholder="Select host"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })} disabled={!!formData.host_id}>
                  <SelectTrigger disabled={!!formData.host_id}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                placeholder="Meeting, Interview, etc."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={formLoading}>
              {formLoading ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the appointment with "{selectedAppointment?.visitor_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
