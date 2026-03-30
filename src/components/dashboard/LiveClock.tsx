import { useState, useEffect } from 'react';
import { Clock, CalendarDays } from 'lucide-react';

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5 text-primary-foreground/80">
        <CalendarDays className="h-4 w-4" />
        <span className="font-medium">
          {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
        <Clock className="h-3.5 w-3.5 text-primary-foreground/80" />
        <span className="font-mono font-semibold text-primary-foreground tabular-nums">
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </span>
      </div>
    </div>
  );
}
