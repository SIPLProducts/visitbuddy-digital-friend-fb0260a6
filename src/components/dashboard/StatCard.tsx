import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
  iconColor?: 'blue' | 'teal' | 'emerald' | 'indigo';
}

const iconColorClasses = {
  blue: 'bg-[#3b82f6] text-white',
  teal: 'bg-[#14b8a6] text-white',
  emerald: 'bg-[#10b981] text-white',
  indigo: 'bg-[#6366f1] text-white',
};

export function StatCard({ title, value, subtitle, icon, trend, className, iconColor = 'blue' }: StatCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm mt-2 font-medium',
                trend.positive ? 'text-[#10b981]' : 'text-[#f59e0b]'
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconColorClasses[iconColor])}>{icon}</div>
      </div>
    </div>
  );
}
