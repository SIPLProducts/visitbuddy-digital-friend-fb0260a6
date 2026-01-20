import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Video, Building2, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/database';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    if (!selectedDate) return;

    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const scheduledCount = appointments.filter((a) => a.status !== 'cancelled').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground">
              Schedule and manage visitor appointments
            </p>
          </div>
          <Link to="/appointments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Appointment
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Date
            </h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Has appointments</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">All confirmed</span>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">
                  Today's Appointments
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Badge variant="secondary">{scheduledCount} scheduled</Badge>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground">
                  Loading appointments...
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments scheduled for this date</p>
                  <Link to="/appointments/new">
                    <Button variant="outline" className="mt-4">
                      Schedule Appointment
                    </Button>
                  </Link>
                </div>
              ) : (
                appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(appointment.visitor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {appointment.visitor_name}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(getStatusColor(appointment.status))}
                          >
                            {appointment.status}
                          </Badge>
                          {appointment.has_teams_meeting && (
                            <Badge variant="outline" className="gap-1">
                              <Video className="h-3 w-3" />
                              Teams
                            </Badge>
                          )}
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
                            {formatTime(appointment.scheduled_time)} (
                            {formatDuration(appointment.duration_minutes)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
