import { useEffect, useState } from 'react';
import { Users, Truck, TrendingUp, TrendingDown, Clock, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CombinedStatsData {
  visitors: {
    today: number;
    activeCheckIns: number;
    trend: number;
  };
  vehicles: {
    today: number;
    currentlyInside: number;
    trend: number;
  };
}

export function CombinedStats() {
  const [stats, setStats] = useState<CombinedStatsData>({
    visitors: { today: 0, activeCheckIns: 0, trend: 0 },
    vehicles: { today: 0, currentlyInside: 0, trend: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCombinedStats();
  }, []);

  const fetchCombinedStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // Fetch today's visitors
      const { data: todayVisitors } = await supabase
        .from('visitors')
        .select('id, status')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      // Fetch yesterday's visitors for trend
      const { data: yesterdayVisitors } = await supabase
        .from('visitors')
        .select('id')
        .gte('created_at', `${yesterday}T00:00:00`)
        .lte('created_at', `${yesterday}T23:59:59`);

      // Fetch today's vehicles (commercial)
      const { data: todayVehicles } = await supabase
        .from('vehicles')
        .select('id, status')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      // Fetch yesterday's vehicles for trend
      const { data: yesterdayVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .gte('created_at', `${yesterday}T00:00:00`)
        .lte('created_at', `${yesterday}T23:59:59`);

      const todayVisitorCount = todayVisitors?.length || 0;
      const yesterdayVisitorCount = yesterdayVisitors?.length || 0;
      const visitorTrend = yesterdayVisitorCount > 0 
        ? Math.round(((todayVisitorCount - yesterdayVisitorCount) / yesterdayVisitorCount) * 100) 
        : 0;

      const todayVehicleCount = todayVehicles?.length || 0;
      const yesterdayVehicleCount = yesterdayVehicles?.length || 0;
      const vehicleTrend = yesterdayVehicleCount > 0 
        ? Math.round(((todayVehicleCount - yesterdayVehicleCount) / yesterdayVehicleCount) * 100) 
        : 0;

      setStats({
        visitors: {
          today: todayVisitorCount,
          activeCheckIns: todayVisitors?.filter(v => v.status === 'checked_in').length || 0,
          trend: visitorTrend,
        },
        vehicles: {
          today: todayVehicleCount,
          currentlyInside: todayVehicles?.filter(v => v.status === 'checked_in').length || 0,
          trend: vehicleTrend,
        },
      });
    } catch (error) {
      console.error('Error fetching combined stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-6" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Today's Activity Overview</h3>
        <span className="text-xs text-muted-foreground">Real-time stats</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visitors Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-blue-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Visitors</p>
                <p className="text-2xl font-bold text-foreground">{stats.visitors.today}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCheck className="h-4 w-4" />
                  <span>Active Check-ins</span>
                </div>
                <span className="font-semibold text-foreground">{stats.visitors.activeCheckIns}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {stats.visitors.trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  stats.visitors.trend >= 0 ? "text-emerald-500" : "text-amber-500"
                )}>
                  {stats.visitors.trend >= 0 ? '+' : ''}{stats.visitors.trend}% vs yesterday
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Vehicles Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-orange-500 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commercial Vehicles</p>
                <p className="text-2xl font-bold text-foreground">{stats.vehicles.today}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Currently Inside</span>
                </div>
                <span className="font-semibold text-foreground">{stats.vehicles.currentlyInside}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {stats.vehicles.trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  stats.vehicles.trend >= 0 ? "text-emerald-500" : "text-amber-500"
                )}>
                  {stats.vehicles.trend >= 0 ? '+' : ''}{stats.vehicles.trend}% vs yesterday
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
