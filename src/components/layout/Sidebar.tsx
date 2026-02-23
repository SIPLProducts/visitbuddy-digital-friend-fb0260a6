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
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const menuGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ],
  },
  {
    label: 'Visitor Management',
    items: [
      { icon: Users, label: 'Visitors', path: '/visitors' },
      { icon: Truck, label: 'Vehicles', path: '/vehicles' },
      { icon: Calendar, label: 'Appointments', path: '/appointments' },
      { icon: QrCode, label: 'Check-in/Out', path: '/check-in-out' },
      { icon: Printer, label: 'Badge Printing', path: '/badge-printing' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { icon: FileText, label: 'Visitor Report', path: '/visitor-report' },
      { icon: FileText, label: 'Vehicle Report', path: '/vehicles/report' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { icon: Building2, label: 'Departments', path: '/departments' },
      { icon: UserRound, label: 'Employees', path: '/employees' },
      { icon: MapPin, label: 'Locations', path: '/locations' },
      { icon: DoorOpen, label: 'Gates', path: '/gates' },
      { icon: ScanLine, label: 'Gate QR Codes', path: '/gate-qr-codes' },
      { icon: Truck, label: 'Vehicle Types', path: '/vehicle-types' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { icon: UserCog, label: 'User Management', path: '/users' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: HelpCircle, label: 'Help & Support', path: '/help' },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(menuGroups.map(g => g.label));
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const handleLinkClick = () => {
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <h1 className="font-bold text-foreground">VisiGuard</h1>
              <p className="text-xs text-muted-foreground">Enterprise VMS</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="space-y-1 px-2">
          {menuGroups.map((group) => {
            return (
              <Collapsible
                key={group.label}
                open={collapsed && !isMobile ? false : openGroups.includes(group.label)}
                onOpenChange={() => (!collapsed || isMobile) && toggleGroup(group.label)}
              >
                {(!collapsed || isMobile) && (
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform duration-200',
                        openGroups.includes(group.label) ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
                {collapsed && !isMobile && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            'flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                          title={item.label}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Collapsible>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <Link
          to="/notifications"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors min-h-[44px]"
        >
          <Bell className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">Notifications</span>}
        </Link>
        <button
          onClick={() => {
            handleLinkClick();
            signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </>
  );

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Regular sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {sidebarContent}
    </aside>
  );
}