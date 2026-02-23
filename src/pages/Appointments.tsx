import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Video, Building2, User, Clock, MoreVertical, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Department, Employee } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchData = async () => {
    const [deptRes, empRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('employees').select('*, department:departments(*)').eq('is_host', true).order('name'),
    ]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
  };

  const fetchAppointments = async () => {
    if (!selectedDate) return;

    setLoading(true);
    // Use local date to avoid timezone offset issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*)
      `)
      .eq('scheduled_date', dateStr)
      .order('scheduled_time');

    if (data) {
      setAppointments(data as unknown as Appointment[]);
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
    }
  };

  const openDeleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]/20';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-300/20';
      default: return 'bg-gray-100 text-gray-600 border-gray-300/20';
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

  const scheduledCount = appointments.filter((a) => a.status !== 'cancelled').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground">Schedule and manage visitor appointments</p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-none">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Date
            </h3>
            <Calendar 
              mode="single" 
              selected={selectedDate} 
              onSelect={setSelectedDate} 
              className="rounded-md"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Appointments</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <Badge variant="secondary">{scheduledCount} scheduled</Badge>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground">Loading appointments...</div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments scheduled for this date</p>
                </div>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#0891b2] text-white font-medium">
                          {getInitials(appointment.visitor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{appointment.visitor_name}</p>
                          <Badge variant="outline" className={cn(getStatusColor(appointment.status))}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(appointment.scheduled_time)} ({formatDuration(appointment.duration_minutes)})
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {appointment.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(appointment, 'confirmed')}>
                                <Check className="h-4 w-4 mr-2 text-green-600" />
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(appointment, 'cancelled')}>
                                <X className="h-4 w-4 mr-2 text-red-600" />
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <Select value={formData.host_id} onValueChange={(v) => setFormData({ ...formData, host_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select host" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                  <SelectTrigger>
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
    </MainLayout>
  );
}
