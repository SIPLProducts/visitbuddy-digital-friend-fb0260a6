import { Link } from 'react-router-dom';
import {
  UserPlus,
  QrCode,
  CalendarPlus,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function QuickActions() {
  const { t } = useTranslation();

  const actions = [
    {
      icon: UserPlus,
      label: t('dashboard.newVisitor'),
      description: t('dashboard.registerVisitor'),
      path: '/visitors/new',
      colorClass: 'bg-[#3b82f6] text-white hover:bg-[#2563eb]',
    },
    {
      icon: QrCode,
      label: t('dashboard.scanQr'),
      description: t('dashboard.quickCheckIn'),
      path: '/check-in-out',
      colorClass: 'bg-[#14b8a6] text-white hover:bg-[#0d9488]',
    },
    {
      icon: CalendarPlus,
      label: t('dashboard.schedule'),
      description: t('dashboard.newAppointment'),
      path: '/appointments',
      colorClass: 'bg-accent hover:bg-accent/80 text-foreground',
    },
    {
      icon: FileText,
      label: t('sidebar.reports'),
      description: t('dashboard.generateReport'),
      path: '/visitor-report',
      colorClass: 'bg-accent hover:bg-accent/80 text-foreground',
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-semibold text-foreground mb-4">{t('dashboard.quickActions')}</h3>
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
