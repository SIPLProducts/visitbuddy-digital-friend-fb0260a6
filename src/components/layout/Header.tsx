import { useState, useEffect } from 'react';
import { Search, Plus, Building2, ChevronDown, Crown, Menu } from 'lucide-react';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface Location {
  id: string;
  name: string;
  city: string | null;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const { userRoles, isHoAdmin, loading: rolesLoading } = useUserRoles();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchLocations();
  }, [userRoles, isHoAdmin]);

  useEffect(() => {
    // Set default location from localStorage or first available
    const savedLocation = localStorage.getItem('selectedLocationId');
    if (savedLocation && locations.find(l => l.id === savedLocation)) {
      setSelectedLocationId(savedLocation);
    } else if (locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, city')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    localStorage.setItem('selectedLocationId', locationId);
    // Trigger a page refresh to reload data for the new location
    window.dispatchEvent(new CustomEvent('locationChanged', { detail: { locationId } }));
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'AU';
  const currentLocation = locations.find(l => l.id === selectedLocationId);
  const currentRole = userRoles.find(r => r.location_id === selectedLocationId)?.role;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    operator: 'Operator',
  };

  return (
    <header className="h-14 md:h-16 border-b border-border/60 bg-card/70 backdrop-blur-xl px-3 md:px-6 flex items-center justify-between gap-2 safe-area-top sticky top-0 z-30">
      {/* Left side - Menu button (mobile) + Location + Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden h-10 w-10 flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Location Selector */}
        {!rolesLoading && locations.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={selectedLocationId} onValueChange={handleLocationChange}>
              <SelectTrigger className="w-[120px] md:w-[200px] bg-background h-10">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Location" className="truncate" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {isHoAdmin && (
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-[#f59e0b]" />
                      All Locations
                    </div>
                  </SelectItem>
                )}
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name} {location.city && `(${location.city})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search - hidden on mobile */}
        <div className="relative w-80 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors, appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background h-10"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
        

        {/* Notifications */}
        <NotificationDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium">
                  {isHoAdmin ? 'HO Admin' : 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHoAdmin ? 'All Locations' : (currentRole ? roleLabels[currentRole] : 'No Role')}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            {isHoAdmin && (
              <div className="px-2 py-1">
                <Badge className="bg-[#f59e0b] text-white gap-1">
                  <Crown className="h-3 w-3" />
                  HO Admin
                </Badge>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/users" className="w-full">User Management</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="w-full">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/help" className="w-full">Help & Support</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}