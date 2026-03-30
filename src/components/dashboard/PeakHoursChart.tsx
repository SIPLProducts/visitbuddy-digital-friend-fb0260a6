import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface PeakHoursChartProps {
  visitors: Visitor[];
}

export function PeakHoursChart({ visitors }: PeakHoursChartProps) {
  // Count visitors by hour of check-in
  const hourCounts = new Array(24).fill(0);
  
  visitors.forEach(v => {
    const time = v.check_in_time || v.created_at;
    if (time) {
      const hour = new Date(time).getHours();
      hourCounts[hour]++;
    }
  });

  // Show business hours only (6am-10pm)
  const businessHours = hourCounts.slice(6, 22);
  const maxCount = Math.max(...businessHours, 1);

  const hours = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 6;
    return {
      label: hour <= 12 ? `${hour}${hour < 12 ? 'a' : 'p'}` : `${hour - 12}p`,
      count: businessHours[i],
      percentage: (businessHours[i] / maxCount) * 100,
    };
  });

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Peak Hours</h3>
      </div>
      <div className="flex items-end gap-1 h-24">
        {hours.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex items-end" style={{ height: '80px' }}>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  h.percentage > 80 ? "bg-primary" :
                  h.percentage > 50 ? "bg-primary/70" :
                  h.percentage > 20 ? "bg-primary/40" :
                  "bg-primary/15"
                )}
                style={{ height: `${Math.max(h.percentage, 4)}%` }}
                title={`${h.label}: ${h.count} visitors`}
              />
            </div>
            {i % 2 === 0 && (
              <span className="text-[9px] text-muted-foreground font-medium">{h.label}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
        <span>6:00 AM</span>
        <span className="font-medium text-foreground">
          Peak: {hours.reduce((a, b) => a.count > b.count ? a : b).label} ({hours.reduce((a, b) => a.count > b.count ? a : b).count} visitors)
        </span>
        <span>10:00 PM</span>
      </div>
    </div>
  );
}
