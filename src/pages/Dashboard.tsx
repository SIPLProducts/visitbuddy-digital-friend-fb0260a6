import { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, UserCheck, Clock } from 'lucide-react';
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
import { Visitor, Gate } from '@/types/database';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [stats, setStats] = useState({
    todaysVisitors: 0,
    scheduledAppointments: 0,
    activeCheckIns: 0,
    avgVisitDuration: '0h 0m',
    pendingApproval: 0,
    overstayed: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Visitors"
            value={stats.todaysVisitors}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: '+12% from yesterday', positive: true }}
            iconColor="blue"
          />
          <StatCard
            title="Scheduled Appointments"
            value={stats.scheduledAppointments}
            subtitle={`${stats.pendingApproval} pending approval`}
            icon={<Calendar className="h-6 w-6" />}
            iconColor="teal"
          />
          <StatCard
            title="Active Check-ins"
            value={stats.activeCheckIns}
            subtitle={`${stats.overstayed} overstayed`}
            icon={<UserCheck className="h-6 w-6" />}
            iconColor="emerald"
          />
          <StatCard
            title="Avg. Visit Duration"
            value={stats.avgVisitDuration || '1h 24m'}
            icon={<Clock className="h-6 w-6" />}
            trend={{ value: '-8% from last week', positive: false }}
            iconColor="indigo"
          />
        </div>

        {/* Pending Approvals Widget */}
        <PendingApprovals visitors={visitors} onRefresh={fetchDashboardData} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Visitors - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentVisitors visitors={visitors.filter(v => v.status !== 'pending_approval').slice(0, 10)} />
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
