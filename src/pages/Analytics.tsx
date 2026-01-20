import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  Users,
  Clock,
  TrendingUp,
  DoorOpen,
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
  Legend,
} from 'recharts';

const trendData = [
  { month: 'Jan', visitors: 1200, scheduled: 980 },
  { month: 'Feb', visitors: 1450, scheduled: 1100 },
  { month: 'Mar', visitors: 1680, scheduled: 1250 },
  { month: 'Apr', visitors: 1520, scheduled: 1180 },
  { month: 'May', visitors: 1890, scheduled: 1420 },
  { month: 'Jun', visitors: 2100, scheduled: 1650 },
];

const departmentData = [
  { name: 'Engineering', value: 450, color: '#10b981' },
  { name: 'Marketing', value: 320, color: '#3b82f6' },
  { name: 'HR', value: 280, color: '#f59e0b' },
  { name: 'Finance', value: 150, color: '#ef4444' },
  { name: 'Operations', value: 200, color: '#8b5cf6' },
];

export default function Analytics() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Analytics & KPIs</h1>
            </div>
            <p className="text-muted-foreground">
              Insights and performance metrics for your visitor management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select defaultValue="month">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
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
                <p className="text-3xl font-bold text-foreground mt-2">12,458</p>
                <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-0">
                  +18% vs. last month
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
                <p className="text-sm text-muted-foreground">Avg. Visit Duration</p>
                <p className="text-3xl font-bold text-foreground mt-2">1h 42m</p>
                <Badge className="mt-2 bg-rose-100 text-rose-700 border-0">
                  -12% vs. last month
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Hour</p>
                <p className="text-3xl font-bold text-foreground mt-2">9:00 AM</p>
                <p className="text-sm text-muted-foreground mt-2">
                  78 visitors avg. at peak
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
                <p className="text-3xl font-bold text-foreground mt-2">4/5</p>
                <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-0">
                  98% uptime this month
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <DoorOpen className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visitor Trends */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Visitor Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorVisitors2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(162 80% 52%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(162 80% 52%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199 89% 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199 89% 48%)" stopOpacity={0} />
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
                    stroke="hsl(162 80% 52%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVisitors2)"
                    name="Total Visitors"
                  />
                  <Area
                    type="monotone"
                    dataKey="scheduled"
                    stroke="hsl(199 89% 48%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorScheduled)"
                    name="Pre-Scheduled"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Total Visitors</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-sm text-muted-foreground">Pre-Scheduled</span>
              </div>
            </div>
          </div>

          {/* By Department */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">By Department</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
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
            </div>
            <div className="space-y-2 mt-4">
              {departmentData.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-sm text-muted-foreground">{dept.name}</span>
                  </div>
                  <span className="text-sm font-medium">{dept.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
