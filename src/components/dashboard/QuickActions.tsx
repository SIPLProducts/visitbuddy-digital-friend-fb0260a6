import { Link } from 'react-router-dom';
import {
  UserPlus,
  QrCode,
  CalendarPlus,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    icon: UserPlus,
    label: 'New Visitor',
    description: 'Register visitor',
    path: '/visitors/new',
    colorClass: 'bg-[#3b82f6] text-white hover:bg-[#2563eb]',
  },
  {
    icon: QrCode,
    label: 'Scan QR',
    description: 'Quick check-in',
    path: '/check-in-out',
    colorClass: 'bg-[#14b8a6] text-white hover:bg-[#0d9488]',
  },
  {
    icon: CalendarPlus,
    label: 'Schedule',
    description: 'New appointment',
    path: '/appointments',
    colorClass: 'bg-accent hover:bg-accent/80 text-foreground',
  },
  {
    icon: FileText,
    label: 'Reports',
    description: 'Generate report',
    path: '/visitor-report',
    colorClass: 'bg-accent hover:bg-accent/80 text-foreground',
  },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.path + action.label}
            to={action.path}
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-lg transition-colors text-center',
              action.colorClass
            )}
          >
            <action.icon className="h-5 w-5 mb-2" />
            <span className="text-sm font-medium">{action.label}</span>
            {action.description && (
              <span className="text-xs mt-0.5 opacity-80">
                {action.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
