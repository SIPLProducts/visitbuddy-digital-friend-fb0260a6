import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Calendar as CalendarIcon, UserCheck, Clock, MapPin, Zap, CalendarDays, Building2, Truck, ShieldAlert, Activity, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentVisitors } from '@/components/dashboard/RecentVisitors';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GateStatus } from '@/components/dashboard/GateStatus';
import { CombinedStats } from '@/components/dashboard/CombinedStats';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { LiveClock } from '@/components/dashboard/LiveClock';
import { SecurityOverview } from '@/components/dashboard/SecurityOverview';
import { DepartmentDistribution } from '@/components/dashboard/DepartmentDistribution';
import { VisitorTrendChart } from '@/components/dashboard/VisitorTrendChart';
import { PeakHoursChart } from '@/components/dashboard/PeakHoursChart';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Gate, Location, Department } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { subDays, startOfDay, isToday, isThisWeek, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

export default function Dashboard() {
  const { user } = useAuth();
  const { settings: tenantSettings } = useTenantSettings();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeSmartFilter, setActiveSmartFilter] = useState<string>('today');
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [vehiclesInside, setVehiclesInside] = useState(0);
  const [stats, setStats] = useState({
    todaysVisitors: 0,
    scheduledAppointments: 0,
    activeCheckIns: 0,
    avgVisitDuration: '0h 0m',
    pendingApproval: 0,
    overstayed: 0,
    todaysVehicles: 0,
    yesterdaysVisitors: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    fetchLocations();
    fetchDepartments();
    // Fetch user profile
    if (user) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setUserName((data as any).full_name || user.email?.split('@')[0] || ''); });
      supabase.from('user_location_roles').select('role, is_ho_admin').eq('user_id', user.id).limit(1).single()
        .then(({ data }) => { if (data) setUserRole((data as any).is_ho_admin ? 'HO Admin' : (data as any).role); });
    }

    const handleLocationChange = () => {
      fetchDashboardData();
    };
    window.addEventListener('locationChanged', handleLocationChange);

    // Real-time subscriptions for live updates
    const visitorChannel = supabase
      .channel('dashboard-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const vehicleChannel = supabase
      .channel('dashboard-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const appointmentChannel = supabase
      .channel('dashboard-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('locationChanged', handleLocationChange);
      supabase.removeChannel(visitorChannel);
      supabase.removeChannel(vehicleChannel);
      supabase.removeChannel(appointmentChannel);
    };
  }, [user]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data as Location[]);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data as Department[]);
  };

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data: visitorsData } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*),
        gate:gates(*, location:locations(*))
      `)
      .in('status', ['checked_in', 'checked_out', 'scheduled', 'pending_approval'])
      .order('created_at', { ascending: false });

    if (visitorsData) {
      setVisitors(visitorsData as unknown as Visitor[]);

      const todaysVisitors = visitorsData.filter(
        (v) => v.created_at.startsWith(today)
      ).length;
      const yesterdaysVisitors = visitorsData.filter(
        (v) => v.created_at.startsWith(yesterday)
      ).length;
      const activeCheckIns = visitorsData.filter(
        (v) => v.status === 'checked_in'
      ).length;
      const pendingApproval = visitorsData.filter(
        (v) => v.status === 'pending_approval'
      ).length;

      // Calculate avg visit duration from completed visits
      const completedVisits = visitorsData.filter(v => v.check_in_time && v.check_out_time);
      let avgDuration = '0h 0m';
      if (completedVisits.length > 0) {
        const totalMs = completedVisits.reduce((acc, v) => {
          return acc + (new Date(v.check_out_time!).getTime() - new Date(v.check_in_time!).getTime());
        }, 0);
        const avgMs = totalMs / completedVisits.length;
        const avgHours = Math.floor(avgMs / (1000 * 60 * 60));
        const avgMins = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
        avgDuration = `${avgHours}h ${avgMins}m`;
      }

      // Count overstayed (checked in > 8 hours)
      const overstayed = visitorsData.filter(v => {
        if (v.status !== 'checked_in' || !v.check_in_time) return false;
        return (Date.now() - new Date(v.check_in_time).getTime()) / (1000 * 60 * 60) > 8;
      }).length;

      setStats(prev => ({
        ...prev,
        todaysVisitors,
        yesterdaysVisitors,
        activeCheckIns,
        pendingApproval,
        avgVisitDuration: avgDuration,
        overstayed,
      }));
    }

    const { data: gatesData } = await supabase
      .from('gates')
      .select('*')
      .order('name');

    if (gatesData) {
      setGates(gatesData as Gate[]);
    }

    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today);

    // Get vehicles inside count (all time checked_in, not just today)
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'checked_in');

    // Get today's vehicles
    const { count: todaysVehicleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    setVehiclesInside(vehicleCount || 0);
    setStats(prev => ({
      ...prev,
      scheduledAppointments: appointmentsCount || 0,
      todaysVehicles: todaysVehicleCount || 0,
    }));
  };

  const handleRefresh = useCallback(async () => {
    await fetchDashboardData();
    setRefreshKey(prev => prev + 1);
  }, []);

  const filteredVisitors = useMemo(() => {
    let result = visitors;

    if (locationFilter !== 'all') {
      result = result.filter(v => v.gate?.location?.id === locationFilter);
    }

    if (departmentFilter !== 'all') {
      result = result.filter(v => v.department?.id === departmentFilter);
    }

    switch (activeSmartFilter) {
      case 'today':
        result = result.filter(v => isToday(new Date(v.created_at)));
        break;
      case 'this_week':
        result = result.filter(v => isThisWeek(new Date(v.created_at)));
        break;
      case 'inside':
        result = result.filter(v => v.status === 'checked_in');
        break;
      case 'pending':
        result = result.filter(v => v.status === 'pending_approval');
        break;
      case 'checked_out':
        result = result.filter(v => v.status === 'checked_out');
        break;
    }

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999)) : new Date(new Date(from).setHours(23, 59, 59, 999));
      result = result.filter(v => {
        const d = new Date(v.created_at);
        return d >= from && d <= to;
      });
    }

    return result;
  }, [visitors, activeSmartFilter, locationFilter, departmentFilter, dateRange]);

  const filteredStats = useMemo(() => {
    const todaysVisitors = filteredVisitors.filter(v => isToday(new Date(v.created_at))).length;
    const activeCheckIns = filteredVisitors.filter(v => v.status === 'checked_in').length;
    const pendingApproval = filteredVisitors.filter(v => v.status === 'pending_approval').length;
    const checkedOut = filteredVisitors.filter(v => v.status === 'checked_out').length;

    return {
      todaysVisitors,
      activeCheckIns,
      pendingApproval,
      checkedOut,
      scheduledAppointments: stats.scheduledAppointments,
      avgVisitDuration: stats.avgVisitDuration,
      overstayed: stats.overstayed,
    };
  }, [filteredVisitors, stats]);

  const smartFilters = [
    { id: 'today', label: "Today", icon: CalendarIcon, count: visitors.filter(v => isToday(new Date(v.created_at))).length },
    { id: 'this_week', label: 'This Week', icon: CalendarDays, count: visitors.filter(v => isThisWeek(new Date(v.created_at))).length },
    { id: 'inside', label: 'Inside', icon: UserCheck, count: visitors.filter(v => v.status === 'checked_in').length },
    { id: 'pending', label: 'Pending', icon: Clock, count: visitors.filter(v => v.status === 'pending_approval').length },
    { id: 'checked_out', label: 'Left', icon: Users, count: visitors.filter(v => v.status === 'checked_out').length },
  ];

  const totalGateCapacity = gates.reduce((sum, g) => sum + (g.capacity || 0), 0);

  return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-5">
          {/* Enterprise Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(220,30%,15%)] via-[hsl(195,85%,25%)] to-[hsl(160,84%,30%)] p-6 text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] uppercase tracking-wider font-semibold">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Dashboard
                  </Badge>
                  {userRole && (
                    <Badge className="bg-white/15 text-white hover:bg-white/20 border-0 text-[10px] uppercase tracking-wider font-semibold">
                      {userRole}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {userName ? `Welcome back, ${userName}` : 'Command Center'}
                </h1>
                <p className="text-sm text-white/70 mt-1">
                  Real-time monitoring across all facilities
                </p>
              </div>
              <div className="flex items-center gap-4">
                <LiveClock />
              </div>
            </div>
          </div>

          {/* Smart Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-card border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Filters
            </div>
            <div className="flex flex-wrap gap-1.5">
              {smartFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeSmartFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSmartFilter(filter.id)}
                  className={cn(
                    'gap-1 h-8 text-xs transition-all',
                    activeSmartFilter === filter.id && 'shadow-md'
                  )}
                >
                  <filter.icon className="h-3 w-3" />
                  {filter.label}
                  <Badge variant="secondary" className={cn(
                    'ml-0.5 h-4 min-w-[16px] flex items-center justify-center text-[9px] font-bold px-1',
                    activeSmartFilter === filter.id ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                  )}>
                    {filter.count}
                  </Badge>
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(
                    "gap-1.5 h-8 text-xs",
                    dateRange?.from && "border-primary text-primary"
                  )}>
                    <CalendarDays className="h-3 w-3" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>{format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}</>
                      ) : format(dateRange.from, "dd MMM yyyy")
                    ) : "Date Range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="p-3 pointer-events-auto"
                  />
                  <div className="border-t p-3 flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                      Last 7 days
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                      Last 30 days
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-destructive">
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50 max-h-60">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Grid - 6 cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Today's Visitors"
              value={filteredStats.todaysVisitors}
              icon={<Users className="h-5 w-5" />}
              trend={stats.yesterdaysVisitors > 0 ? {
                value: `${stats.todaysVisitors >= stats.yesterdaysVisitors ? '+' : ''}${Math.round(((stats.todaysVisitors - stats.yesterdaysVisitors) / stats.yesterdaysVisitors) * 100)}% vs yesterday`,
                positive: stats.todaysVisitors >= stats.yesterdaysVisitors,
              } : undefined}
              iconColor="blue"
            />
            <StatCard
              title="Currently Inside"
              value={filteredStats.activeCheckIns}
              subtitle={filteredStats.overstayed > 0 ? `${filteredStats.overstayed} overstayed` : undefined}
              icon={<UserCheck className="h-5 w-5" />}
              iconColor="emerald"
            />
            <StatCard
              title="Pending Approval"
              value={filteredStats.pendingApproval}
              icon={<ShieldAlert className="h-5 w-5" />}
              iconColor="amber"
            />
            <StatCard
              title="Appointments"
              value={filteredStats.scheduledAppointments}
              icon={<CalendarIcon className="h-5 w-5" />}
              iconColor="teal"
            />
            <StatCard
              title="Vehicles Today"
              value={stats.todaysVehicles}
              subtitle={`${vehiclesInside} inside`}
              icon={<Truck className="h-5 w-5" />}
              iconColor="indigo"
            />
            <StatCard
              title="Avg Duration"
              value={filteredStats.avgVisitDuration}
              icon={<Clock className="h-5 w-5" />}
              iconColor="rose"
            />
          </div>

          {/* Configurable Checkout Warning Banner */}
          {(() => {
            const nowHour = new Date().getHours();
            const warningHour = tenantSettings?.checkout_warning_hour ?? 18;
            const warningTimeLabel = warningHour > 12 ? `${warningHour - 12} PM` : warningHour === 12 ? '12 PM' : `${warningHour} AM`;
            const notCheckedOut = visitors.filter(v => v.status === 'checked_in' && v.check_in_time && isToday(new Date(v.check_in_time)));
            if (nowHour >= warningHour && notCheckedOut.length > 0) {
              return (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <AlertTitle className="text-amber-300 font-semibold">
                    {notCheckedOut.length} Visitor(s) Still Checked In After {warningTimeLabel}
                  </AlertTitle>
                  <AlertDescription className="text-amber-200/80 mt-1">
                    {notCheckedOut.map(v => v.name).join(', ')} — Please verify and process checkout.
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          {/* Pending Approvals */}
          <PendingApprovals visitors={filteredVisitors} onRefresh={fetchDashboardData} />

          {/* Main Grid: Recent Visitors + Security Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <RecentVisitors visitors={filteredVisitors.filter(v => v.status !== 'pending_approval').slice(0, 10)} onRefresh={fetchDashboardData} />
            </div>
            <SecurityOverview
              visitors={visitors}
              totalGateCapacity={totalGateCapacity}
              vehiclesInside={vehiclesInside}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <VisitorTrendChart key={refreshKey} />
            </div>
            <div className="space-y-5">
              <DepartmentDistribution visitors={filteredVisitors} />
              <PeakHoursChart visitors={visitors} />
            </div>
          </div>

          {/* Bottom Row: Quick Actions + Gate Status + Activity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <QuickActions />
            <GateStatus gates={gates} />
            <CombinedStats />
          </div>
        </div>
      </PullToRefresh>
  );
}
