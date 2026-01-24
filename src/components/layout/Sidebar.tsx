import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  QrCode,
  Printer,
  FileText,
  Building2,
  MapPin,
  DoorOpen,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Truck,
  UserRound,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Visitors', path: '/visitors' },
  { icon: Truck, label: 'Vehicles', path: '/vehicles' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: QrCode, label: 'Check-in/Out', path: '/check-in-out' },
  { icon: Printer, label: 'Badge Printing', path: '/badge-printing' },
  { icon: FileText, label: 'Visitor Report', path: '/visitor-report' },
  { icon: Building2, label: 'Departments', path: '/departments' },
  { icon: UserRound, label: 'Employees', path: '/employees' },
  { icon: MapPin, label: 'Locations', path: '/locations' },
  { icon: DoorOpen, label: 'Gates', path: '/gates' },
  { icon: ScanLine, label: 'Gate QR Codes', path: '/gate-qr-codes' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: UserCog, label: 'User Management', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', path: '/help' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="font-bold text-foreground">VisiGuard</h1>
              <p className="text-xs text-muted-foreground">Enterprise VMS</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <Link
          to="/notifications"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Notifications</span>}
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
