import { cn } from '@/lib/utils';
import { Shield, AlertTriangle } from 'lucide-react';

interface OccupancyMeterProps {
  current: number;
  capacity: number;
  label: string;
}

export function OccupancyMeter({ current, capacity, label }: OccupancyMeterProps) {
  const percentage = capacity > 0 ? Math.min(Math.round((current / capacity) * 100), 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {isCritical ? (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          ) : isWarning ? (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-success" />
          )}
          <span className={cn(
            "font-bold tabular-nums",
            isCritical ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"
          )}>
            {current}
          </span>
          <span className="text-muted-foreground">/ {capacity}</span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isCritical
              ? "bg-gradient-to-r from-destructive/80 to-destructive"
              : isWarning
              ? "bg-gradient-to-r from-warning/80 to-warning"
              : "bg-gradient-to-r from-success/80 to-success"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={cn(
        "text-xs font-medium",
        isCritical ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"
      )}>
        {percentage}% occupied
        {isCritical && " — Near capacity!"}
        {isWarning && !isCritical && " — Approaching limit"}
      </p>
    </div>
  );
}
