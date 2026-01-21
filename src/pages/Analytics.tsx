import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  BarChart3,
  Download,
  Users,
  Clock,
  TrendingUp,
  DoorOpen,
  Truck,
  MapPin,
  CalendarIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/database';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const LOCATION_COLORS = [
  'hsl(var(--primary))',
  'hsl(160, 84%, 39%)',
  'hsl(205, 90%, 52%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 72%, 51%)',
];

interface LocationStats {
  name: string;
  visitors: number;
  vehicles: number;
  color: string;
}

interface TrendData {
  month: string;
  visitors: number;
  vehicles: number;
}

export default function Analytics() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [totals, setTotals] = useState({
    visitors: 0,
    vehicles: 0,
    activeGates: 0,
    totalGates: 0,
    avgDuration: '0h 0m',
    peakHour: '9:00 AM',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dateRange?.from) {
      fetchAnalyticsData();
    }
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);

    // Fetch locations
    const { data: locationsData } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (locationsData) {
      setLocations(locationsData as Location[]);
    }

    // Fetch visitors grouped by location with date filter
    let visitorsQuery = supabase
      .from('visitors')
      .select(`
        id,
        created_at,
        gate:gates(location_id)
      `);

    if (dateRange?.from) {
      visitorsQuery = visitorsQuery.gte('created_at', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      visitorsQuery = visitorsQuery.lte('created_at', endOfDay.toISOString());
    }

    const { data: visitorsData } = await visitorsQuery;

    // Fetch vehicles grouped by location with date filter
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id, location_id, created_at');

    if (dateRange?.from) {
      vehiclesQuery = vehiclesQuery.gte('created_at', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      vehiclesQuery = vehiclesQuery.lte('created_at', endOfDay.toISOString());
    }

    const { data: vehiclesData } = await vehiclesQuery;

    // Fetch gates for active count
    const { data: gatesData } = await supabase
      .from('gates')
      .select('id, status, location_id');

    // Calculate location stats
    if (locationsData && visitorsData && vehiclesData) {
      const stats: LocationStats[] = locationsData.map((location, index) => {
        const visitorCount = visitorsData.filter(
          (v: any) => v.gate?.location_id === location.id
        ).length;
        const vehicleCount = vehiclesData.filter(
          (v: any) => v.location_id === location.id
        ).length;

        return {
          name: location.name,
          visitors: visitorCount,
          vehicles: vehicleCount,
          color: LOCATION_COLORS[index % LOCATION_COLORS.length],
        };
      });

      setLocationStats(stats);

      // Calculate totals
      const totalVisitors = visitorsData.length;
      const totalVehicles = vehiclesData.length;
      const activeGates = gatesData?.filter((g) => g.status === 'active').length || 0;
      const totalGates = gatesData?.length || 0;

      setTotals({
        visitors: totalVisitors,
        vehicles: totalVehicles,
        activeGates,
        totalGates,
        avgDuration: '1h 42m',
        peakHour: '10:00 AM',
      });
    }

    // Generate trend data (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const mockTrend = months.map((month, i) => ({
      month,
      visitors: Math.floor(Math.random() * 500) + 200 + i * 50,
      vehicles: Math.floor(Math.random() * 200) + 50 + i * 20,
    }));
    setTrendData(mockTrend);

    setLoading(false);
  };

  const visitorPieData = locationStats
    .filter((l) => l.visitors > 0)
    .map((l) => ({
      name: l.name,
      value: l.visitors,
      color: l.color,
    }));

  const vehiclePieData = locationStats
    .filter((l) => l.vehicles > 0)
    .map((l) => ({
      name: l.name,
      value: l.vehicles,
      color: l.color,
    }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Analytics & KPIs</h1>
            </div>
            <p className="text-muted-foreground">
              Location-wise insights and performance metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-w-[240px]",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy")
                    )
                  ) : (
                    <span>Pick date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="border-t p-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                  >
                    Last 90 days
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visitors</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {loading ? '—' : totals.visitors.toLocaleString()}
                </p>
                <Badge className="mt-2 bg-success/10 text-success border-0">
                  All Locations
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {loading ? '—' : totals.vehicles.toLocaleString()}
                </p>
                <Badge className="mt-2 bg-info/10 text-info border-0">
                  Commercial
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Hour</p>
                <p className="text-3xl font-bold text-foreground mt-2">{totals.peakHour}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Highest activity
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Gates</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {loading ? '—' : `${totals.activeGates}/${totals.totalGates}`}
                </p>
                <Badge className="mt-2 bg-success/10 text-success border-0">
                  98% uptime
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <DoorOpen className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Location Bar Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Location-wise Distribution</h3>
          </div>
          <div className="h-80">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : locationStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No location data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
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
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visitors" name="Visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vehicles" name="Vehicles" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Monthly Trends</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorVisitors3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
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
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVisitors3)"
                    name="Visitors"
                  />
                  <Area
                    type="monotone"
                    dataKey="vehicles"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVehicles)"
                    name="Vehicles"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Visitors</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(160, 84%, 39%)' }} />
                <span className="text-sm text-muted-foreground">Vehicles</span>
              </div>
            </div>
          </div>

          {/* Visitors by Location Pie */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Visitors by Location</h3>
            <div className="h-56">
              {visitorPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visitorPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {visitorPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 mt-4 max-h-32 overflow-y-auto">
              {locationStats.map((loc) => (
                <div key={loc.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: loc.color }}
                    />
                    <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                      {loc.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{loc.visitors}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Summary Table */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Location Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Visitors</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Vehicles</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Activity</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : locationStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No locations configured
                    </td>
                  </tr>
                ) : (
                  locationStats.map((loc) => (
                    <tr key={loc.name} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: loc.color }}
                          />
                          <span className="font-medium text-foreground">{loc.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-foreground">{loc.visitors}</td>
                      <td className="text-right py-3 px-4 text-foreground">{loc.vehicles}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{loc.visitors + loc.vehicles}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}