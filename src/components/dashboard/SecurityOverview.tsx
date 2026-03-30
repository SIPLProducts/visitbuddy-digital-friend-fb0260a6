import { Shield, AlertTriangle, Users, Clock, CheckCircle2, Car } from 'lucide-react';
import { Visitor } from '@/types/database';
import { cn } from '@/lib/utils';
import { OccupancyMeter } from './OccupancyMeter';

interface SecurityOverviewProps {
  visitors: Visitor[];
  totalGateCapacity: number;
  vehiclesInside: number;
}

export function SecurityOverview({ visitors, totalGateCapacity, vehiclesInside }: SecurityOverviewProps) {
  const checkedIn = visitors.filter(v => v.status === 'checked_in');
  const overstayed = checkedIn.filter(v => {
    if (!v.check_in_time) return false;
    const hoursInside = (Date.now() - new Date(v.check_in_time).getTime()) / (1000 * 60 * 60);
    return hoursInside > 8;
  });

  const alerts = [
    ...(overstayed.length > 0 ? [{
      type: 'warning' as const,
      icon: Clock,
      message: `${overstayed.length} visitor(s) overstayed (>8 hours)`,
      names: overstayed.slice(0, 3).map(v => v.name),
    }] : []),
    ...(checkedIn.length > totalGateCapacity * 0.9 && totalGateCapacity > 0 ? [{
      type: 'critical' as const,
      icon: AlertTriangle,
      message: 'Facility approaching maximum capacity',
      names: [],
    }] : []),
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Security Overview</h3>
          <p className="text-xs text-muted-foreground">Real-time facility status</p>
        </div>
      </div>

      {/* Occupancy Meters */}
      <div className="space-y-4">
        <OccupancyMeter
          current={checkedIn.length}
          capacity={totalGateCapacity || 500}
          label="Visitor Occupancy"
        />
        <OccupancyMeter
          current={vehiclesInside}
          capacity={100}
          label="Vehicle Bay"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-success/5 border border-success/10">
          <CheckCircle2 className="h-4 w-4 text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{checkedIn.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Inside</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-warning/5 border border-warning/10">
          <Clock className="h-4 w-4 text-warning mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{overstayed.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Overstayed</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-info/5 border border-info/10">
          <Car className="h-4 w-4 text-info mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{vehiclesInside}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Vehicles</p>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Alerts</p>
          {alerts.map((alert, i) => (
            <div key={i} className={cn(
              "flex items-start gap-2 p-3 rounded-lg text-sm",
              alert.type === 'critical' 
                ? "bg-destructive/5 border border-destructive/15" 
                : "bg-warning/5 border border-warning/15"
            )}>
              <alert.icon className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                alert.type === 'critical' ? "text-destructive" : "text-warning"
              )} />
              <div>
                <p className={cn(
                  "font-medium",
                  alert.type === 'critical' ? "text-destructive" : "text-warning"
                )}>{alert.message}</p>
                {alert.names.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.names.join(', ')}
                    {overstayed.length > 3 && ` +${overstayed.length - 3} more`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/15">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">All systems normal</span>
        </div>
      )}
    </div>
  );
}
