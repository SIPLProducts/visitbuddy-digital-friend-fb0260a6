import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const data = [
  { day: 'Mon', visitors: 45, appointments: 32 },
  { day: 'Tue', visitors: 52, appointments: 38 },
  { day: 'Wed', visitors: 78, appointments: 45 },
  { day: 'Thu', visitors: 65, appointments: 40 },
  { day: 'Fri', visitors: 89, appointments: 52 },
  { day: 'Sat', visitors: 35, appointments: 20 },
  { day: 'Sun', visitors: 25, appointments: 15 },
];

export function WeeklyOverview() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Weekly Overview</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Visitors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/40" />
            <span className="text-muted-foreground">Appointments</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(162 80% 52%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(162 80% 52%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(162 80% 52%)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(162 80% 52%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
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
              fill="url(#colorVisitors)"
            />
            <Area
              type="monotone"
              dataKey="appointments"
              stroke="hsl(162 80% 40%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAppointments)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
