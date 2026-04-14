import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
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
  Shield,
  ShieldAlert,
  AlertTriangle,
  Video,
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
import { useScreenPermissions } from '@/hooks/useScreenPermissions';

const getMenuGroups = (t: (key: string) => string) => [
  {
    label: t('sidebar.overview'),
    items: [
      { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/' },
    ],
  },
  {
    label: t('sidebar.visitorManagement'),
    items: [
      { icon: Users, label: t('sidebar.visitors'), path: '/visitors' },
      { icon: Truck, label: t('sidebar.vehicles'), path: '/vehicles' },
      { icon: Calendar, label: t('sidebar.appointments'), path: '/appointments' },
      { icon: QrCode, label: t('sidebar.checkInOut'), path: '/check-in-out' },
      { icon: Printer, label: t('sidebar.badgePrinting'), path: '/badge-printing' },
    ],
  },
  {
    label: t('sidebar.reports'),
    items: [
      { icon: FileText, label: t('sidebar.visitorReport'), path: '/visitor-report' },
      { icon: FileText, label: t('sidebar.vehicleReport'), path: '/vehicles/report' },
      { icon: FileText, label: t('sidebar.compliance'), path: '/compliance' },
    ],
  },
  {
    label: t('sidebar.organization'),
    items: [
      { icon: Building2, label: t('sidebar.departments'), path: '/departments' },
      { icon: UserRound, label: t('sidebar.employees'), path: '/employees' },
      { icon: MapPin, label: t('sidebar.locations'), path: '/locations' },
      { icon: DoorOpen, label: t('sidebar.gates'), path: '/gates' },
      { icon: ScanLine, label: t('sidebar.gateQrCodes'), path: '/gate-qr-codes' },
      { icon: Truck, label: t('sidebar.vehicleTypes'), path: '/vehicle-types' },
    ],
  },
  {
    label: t('sidebar.security'),
    items: [
      { icon: ShieldAlert, label: t('sidebar.watchlist'), path: '/watchlist' },
      { icon: AlertTriangle, label: t('sidebar.emergency'), path: '/emergency' },
      { icon: Video, label: 'Camera Monitor', path: '/camera-monitor' },
    ],
  },
  {
    label: t('sidebar.insights'),
    items: [
      { icon: BarChart3, label: t('sidebar.analytics'), path: '/analytics' },
      { icon: Shield, label: t('sidebar.auditTrail'), path: '/audit-logs' },
    ],
  },
  {
    label: t('sidebar.administration'),
    items: [
      { icon: UserCog, label: t('sidebar.userManagement'), path: '/users' },
      { icon: Settings, label: t('sidebar.settings'), path: '/settings' },
      { icon: HelpCircle, label: t('sidebar.helpSupport'), path: '/help' },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { t } = useTranslation();
  const allMenuGroups = getMenuGroups(t);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(allMenuGroups.map(g => g.label));
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const { canViewScreen, loading: permissionsLoading } = useScreenPermissions();

  // Filter menu groups based on screen permissions
  const menuGroups = useMemo(() => {
    return allMenuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => canViewScreen(item.path)),
      }))
      .filter(group => group.items.length > 0);
  }, [allMenuGroups, canViewScreen]);

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  }, [location.pathname]);

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
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-sidebar-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-bold text-sm font-display">V</span>
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <h1 className="font-bold text-sidebar-foreground font-display text-base tracking-tight">VisiGuard</h1>
              <p className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-widest">Enterprise VMS</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        <div className="space-y-1 px-3">
          {menuGroups.map((group) => {
            return (
              <Collapsible
                key={group.label}
                open={collapsed && !isMobile ? false : openGroups.includes(group.label)}
                onOpenChange={() => (!collapsed || isMobile) && toggleGroup(group.label)}
              >
                {(!collapsed || isMobile) && (
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-[0.15em] hover:text-sidebar-foreground/70 transition-colors">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]',
                          isActive
                            ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/20 shadow-sm shadow-sidebar-primary/10'
                            : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-sidebar-primary")} />
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
                            'flex items-center justify-center px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]',
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary shadow-sm shadow-sidebar-primary/10'
                              : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                          title={item.label}
                        >
                          <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-sidebar-primary")} />
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
      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        <Link
          to="/notifications"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 min-h-[44px]"
        >
          <Bell className="h-[18px] w-[18px] flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">{t('sidebar.notifications')}</span>}
        </Link>
        <button
          onClick={() => {
            handleLinkClick();
            signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 min-h-[44px]"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">{t('sidebar.logout')}</span>}
        </button>
      </div>
    </>
  );

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-sidebar border-sidebar-border">
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
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
