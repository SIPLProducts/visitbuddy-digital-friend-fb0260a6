import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, QrCode, Truck, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenPermissions } from '@/hooks/useScreenPermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMemo } from 'react';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Visitors', path: '/visitors' },
  { icon: QrCode, label: 'Check-in', path: '/check-in-out' },
  { icon: Truck, label: 'Vehicles', path: '/vehicles' },
];

const moreNavItems = [
  { label: 'Appointments', path: '/appointments' },
  { label: 'Badge Printing', path: '/badge-printing' },
  { label: 'Visitor Report', path: '/visitor-report' },
  { label: 'Vehicle Report', path: '/vehicles/report' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Settings', path: '/settings' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { canViewScreen } = useScreenPermissions();

  const filteredMainNav = useMemo(
    () => mainNavItems.filter(item => canViewScreen(item.path)),
    [canViewScreen]
  );
  const filteredMoreNav = useMemo(
    () => moreNavItems.filter(item => canViewScreen(item.path)),
    [canViewScreen]
  );

  if (!isMobile) return null;

  const isMoreActive = filteredMoreNav.some(item => location.pathname === item.path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredMainNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'animate-scale-in')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {filteredMoreNav.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="top" 
            className="w-48 mb-2 bg-popover z-[60]"
          >
            {filteredMoreNav.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <Link 
                  to={item.path} 
                  className={cn(
                    'w-full',
                    location.pathname === item.path && 'bg-accent'
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </nav>
  );
}