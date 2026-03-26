import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Calendar as CalendarIcon, UserCheck, Clock, MapPin, Filter, X, Zap, CalendarDays, Building2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentVisitors } from '@/components/dashboard/RecentVisitors';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GateStatus } from '@/components/dashboard/GateStatus';
import { WeeklyOverview } from '@/components/dashboard/WeeklyOverview';
import { CombinedStats } from '@/components/dashboard/CombinedStats';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Gate, Location, Department } from '@/types/database';
import { Badge } from '@/components/ui/badge';
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
import { subDays, startOfDay, isToday, isThisWeek, format, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeSmartFilter, setActiveSmartFilter] = useState<string>('today');
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [stats, setStats] = useState({
    todaysVisitors: 0,
    scheduledAppointments: 0,
    activeCheckIns: 0,
    avgVisitDuration: '0h 0m',
    pendingApproval: 0,
    overstayed: 0,
  });

  const getSelectedLocationId = () => localStorage.getItem('selectedLocationId') || '';

  useEffect(() => {
    fetchDashboardData();
    fetchLocations();
    fetchDepartments();

    const handleLocationChange = () => {
      fetchDashboardData();
    };
    window.addEventListener('locationChanged', handleLocationChange);
    return () => window.removeEventListener('locationChanged', handleLocationChange);
  }, []);

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

    // Fetch visitors with related data (including pending_approval)
    const { data: visitorsData } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*),
        department:departments(*),
        gate:gates(*, location:locations(*))
      `)
      .in('status', ['checked_in', 'checked_out', 'scheduled', 'pending_approval'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (visitorsData) {
      setVisitors(visitorsData as unknown as Visitor[]);

      // Calculate stats
      const todaysVisitors = visitorsData.filter(
        (v) => v.created_at.startsWith(today)
      ).length;
      const activeCheckIns = visitorsData.filter(
        (v) => v.status === 'checked_in'
      ).length;
      const pendingApproval = visitorsData.filter(
        (v) => v.status === 'pending_approval'
      ).length;

      setStats((prev) => ({
        ...prev,
        todaysVisitors,
        activeCheckIns,
        pendingApproval,
      }));
    }

    // Fetch gates
    const { data: gatesData } = await supabase
      .from('gates')
      .select('*')
      .order('name');

    if (gatesData) {
      setGates(gatesData as Gate[]);
    }

    // Fetch appointments count
    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today);

    setStats((prev) => ({
      ...prev,
      scheduledAppointments: appointmentsCount || 0,
    }));
  };

  const handleRefresh = useCallback(async () => {
    await fetchDashboardData();
    setRefreshKey(prev => prev + 1);
  }, []);

  // Smart filtered visitors
  const filteredVisitors = useMemo(() => {
    let result = visitors;

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(v => v.gate?.location?.id === locationFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter(v => v.department?.id === departmentFilter);
    }

    // Smart filter
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

    // Date range filter
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

  // Filtered stats
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
      avgVisitDuration: stats.avgVisitDuration || '1h 24m',
      overstayed: stats.overstayed,
    };
  }, [filteredVisitors, stats]);

  const smartFilters = [
    { id: 'today', label: "Today's", icon: CalendarIcon, count: visitors.filter(v => isToday(new Date(v.created_at))).length },
    { id: 'this_week', label: 'This Week', icon: CalendarDays, count: visitors.filter(v => isThisWeek(new Date(v.created_at))).length },
    { id: 'inside', label: 'Currently Inside', icon: UserCheck, count: visitors.filter(v => v.status === 'checked_in').length },
    { id: 'pending', label: 'Pending', icon: Clock, count: visitors.filter(v => v.status === 'pending_approval').length },
    { id: 'checked_out', label: 'Checked Out', icon: Users, count: visitors.filter(v => v.status === 'checked_out').length },
  ];

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-[#0891b2] to-[#10b981] p-6 text-white">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 mb-3">
              Dashboard Overview
            </Badge>
            <h1 className="text-2xl font-bold mb-1">
              Welcome back, Admin! 👋
            </h1>
            <p className="text-primary-foreground/80">
              Here's what's happening at your facilities today.
            </p>
          </div>
        </div>

        {/* Smart Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Smart Filters:
          </div>
          <div className="flex flex-wrap gap-2">
            {smartFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeSmartFilter === filter.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSmartFilter(filter.id)}
                className={cn(
                  'gap-1.5 transition-all',
                  activeSmartFilter === filter.id && 'shadow-md'
                )}
              >
                <filter.icon className="h-3.5 w-3.5" />
                {filter.label}
                <Badge variant="secondary" className={cn(
                  'ml-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold px-1.5',
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
                  "gap-1.5 h-8 text-sm",
                  dateRange?.from && "border-primary text-primary"
                )}>
                  <CalendarDays className="h-3.5 w-3.5" />
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
                  className={cn("p-3 pointer-events-auto")}
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
              <SelectTrigger className="w-44 h-8 text-sm">
                <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Visitors"
            value={filteredStats.todaysVisitors}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: '+12% from yesterday', positive: true }}
            iconColor="blue"
          />
          <StatCard
            title="Scheduled Appointments"
            value={filteredStats.scheduledAppointments}
            subtitle={`${filteredStats.pendingApproval} pending approval`}
            icon={<Calendar className="h-6 w-6" />}
            iconColor="teal"
          />
          <StatCard
            title="Active Check-ins"
            value={filteredStats.activeCheckIns}
            subtitle={`${filteredStats.overstayed} overstayed`}
            icon={<UserCheck className="h-6 w-6" />}
            iconColor="emerald"
          />
          <StatCard
            title="Avg. Visit Duration"
            value={filteredStats.avgVisitDuration}
            icon={<Clock className="h-6 w-6" />}
            trend={{ value: '-8% from last week', positive: false }}
            iconColor="indigo"
          />
        </div>

        {/* Pending Approvals Widget */}
        <PendingApprovals visitors={filteredVisitors} onRefresh={fetchDashboardData} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Visitors - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentVisitors visitors={filteredVisitors.filter(v => v.status !== 'pending_approval').slice(0, 10)} onRefresh={fetchDashboardData} />
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <QuickActions />
            <GateStatus gates={gates} />
          </div>
        </div>

        {/* Combined Visitor & Vehicle Stats */}
        <CombinedStats />

        {/* Weekly Overview Chart */}
        <WeeklyOverview />
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}
