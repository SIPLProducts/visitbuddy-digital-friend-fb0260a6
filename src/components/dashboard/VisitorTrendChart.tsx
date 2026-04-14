import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface DailyData {
  date: string;
  visitors: number;
  vehicles: number;
}

interface VisitorTrendChartProps {
  locationFilter?: string;
  departmentFilter?: string;
}

export function VisitorTrendChart({ locationFilter = 'all', departmentFilter = 'all' }: VisitorTrendChartProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [locationFilter, departmentFilter]);

  const fetchTrendData = async () => {
    setLoading(true);
    const days = 7;
    const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    // Fetch all visitors and vehicles for the 7-day range in one query each
    let visitorQuery = supabase
      .from('visitors')
      .select('created_at, department_id, gate:gates(location_id)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    let vehicleQuery = supabase
      .from('vehicles')
      .select('created_at, department_id, gate:gates(location_id)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const [visitorRes, vehicleRes] = await Promise.all([visitorQuery, vehicleQuery]);

    let visitorData = (visitorRes.data || []) as any[];
    let vehicleData = (vehicleRes.data || []) as any[];

    // Apply filters client-side
    if (locationFilter !== 'all') {
      visitorData = visitorData.filter(v => v.gate?.location_id === locationFilter);
      vehicleData = vehicleData.filter(v => v.gate?.location_id === locationFilter);
    }
    if (departmentFilter !== 'all') {
      visitorData = visitorData.filter(v => v.department_id === departmentFilter);
      vehicleData = vehicleData.filter(v => v.department_id === departmentFilter);
    }

    const result: DailyData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');

      result.push({
        date: format(date, 'EEE'),
        visitors: visitorData.filter(v => v.created_at?.startsWith(dateStr)).length,
        vehicles: vehicleData.filter(v => v.created_at?.startsWith(dateStr)).length,
      });
    }

    setData(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="h-6 bg-muted rounded w-48 mb-6 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">7-Day Traffic Trend</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(195, 85%, 35%)' }} />
            <span className="text-muted-foreground">Visitors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(30, 90%, 55%)' }} />
            <span className="text-muted-foreground">Vehicles</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="visitors"
              fill="hsl(195, 85%, 35%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="vehicles"
              fill="hsl(30, 90%, 55%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
