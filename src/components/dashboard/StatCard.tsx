import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  iconColor?: 'blue' | 'teal' | 'emerald' | 'indigo' | 'amber' | 'rose';
  onClick?: () => void;
}

const iconColorClasses = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-teal-500/25',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/25',
  rose: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/25',
};

const accentBorderClasses = {
  blue: 'hover:border-blue-200 dark:hover:border-blue-800',
  teal: 'hover:border-teal-200 dark:hover:border-teal-800',
  emerald: 'hover:border-emerald-200 dark:hover:border-emerald-800',
  indigo: 'hover:border-indigo-200 dark:hover:border-indigo-800',
  amber: 'hover:border-amber-200 dark:hover:border-amber-800',
  rose: 'hover:border-rose-200 dark:hover:border-rose-800',
};

export function StatCard({ title, value, subtitle, icon, trend, className, iconColor = 'blue', onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative bg-card rounded-xl border border-border p-5 transition-all duration-200',
        accentBorderClasses[iconColor],
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      {/* Subtle accent line at top */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity',
        iconColor === 'blue' && 'bg-blue-500',
        iconColor === 'teal' && 'bg-teal-500',
        iconColor === 'emerald' && 'bg-emerald-500',
        iconColor === 'indigo' && 'bg-indigo-500',
        iconColor === 'amber' && 'bg-amber-500',
        iconColor === 'rose' && 'bg-rose-500',
      )} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.positive ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-warning" />
              )}
              <span className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-success' : 'text-warning'
              )}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl shadow-lg', iconColorClasses[iconColor])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
