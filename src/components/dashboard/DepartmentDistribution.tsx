import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Visitor } from '@/types/database';
import { Building2 } from 'lucide-react';

interface DepartmentDistributionProps {
  visitors: Visitor[];
}

const COLORS = [
  'hsl(195, 85%, 35%)',   // primary
  'hsl(160, 84%, 39%)',   // success
  'hsl(45, 93%, 47%)',    // warning  
  'hsl(205, 90%, 52%)',   // info
  'hsl(280, 65%, 55%)',   // purple
  'hsl(15, 85%, 55%)',    // orange
  'hsl(340, 75%, 55%)',   // pink
  'hsl(120, 50%, 45%)',   // green
];

export function DepartmentDistribution({ visitors }: DepartmentDistributionProps) {
  const deptMap = new Map<string, number>();
  
  visitors.forEach(v => {
    const deptName = v.host?.department?.name || v.department?.name || 'Unassigned';
    deptMap.set(deptName, (deptMap.get(deptName) || 0) + 1);
  });

  const data = Array.from(deptMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Department Distribution</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">No visitor data</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Department Distribution</h3>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground truncate flex-1">{item.name}</span>
              <span className="font-semibold text-foreground tabular-nums">{item.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
