import { Link } from 'react-router-dom';
import {
  UserPlus,
  QrCode,
  CalendarPlus,
  Video,
  Mail,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    icon: UserPlus,
    label: 'Pre-Register',
    description: 'Add new visitor',
    path: '/visitors/new',
    primary: true,
  },
  {
    icon: QrCode,
    label: 'Scan QR',
    description: 'Quick check-in',
    path: '/check-in-out',
    primary: true,
  },
  {
    icon: CalendarPlus,
    label: 'New appointment',
    description: '',
    path: '/appointments/new',
  },
  {
    icon: Video,
    label: 'Create meeting',
    description: '',
    path: '/appointments/new?meeting=true',
  },
  {
    icon: Mail,
    label: 'Send Invite',
    description: 'Email invitation',
    path: '/visitors/invite',
  },
  {
    icon: FileText,
    label: 'Reports',
    description: 'Generate report',
    path: '/visitor-report',
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
              action.primary
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-accent hover:bg-accent/80 text-foreground'
            )}
          >
            <action.icon className="h-5 w-5 mb-2" />
            <span className="text-sm font-medium">{action.label}</span>
            {action.description && (
              <span className={cn(
                'text-xs mt-0.5',
                action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}>
                {action.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
