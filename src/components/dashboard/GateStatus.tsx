import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DoorOpen, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Gate } from '@/types/database';
import { cn } from '@/lib/utils';

interface GateStatusProps {
  gates: Gate[];
}

export function GateStatus({ gates }: GateStatusProps) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Gate Status</h3>
        </div>
        <Link to="/gates">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="divide-y divide-border">
        {gates.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No gates configured
          </div>
        ) : (
          gates.slice(0, 4).map((gate) => (
            <div
              key={gate.id}
              className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    gate.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                <div>
                  <p className="font-medium text-foreground">{gate.name}</p>
                  {gate.building && (
                    <p className="text-sm text-muted-foreground">{gate.building}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    gate.status === 'active'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  )}
                >
                  {gate.status}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {gate.current_visitors} / {gate.capacity}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
