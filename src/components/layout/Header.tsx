import { useState, useEffect } from 'react';
import { Search, Plus, Building2, ChevronDown, Crown, Menu, Globe, Download, Check } from 'lucide-react';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { InstallButton } from '@/components/install/InstallButton';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';

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
  const { userRoles, isHoAdmin, isAdminHead, loading: rolesLoading } = useUserRoles();
  const isGlobalViewer = isHoAdmin || isAdminHead;
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetchLocations();
  }, [userRoles, isHoAdmin]);

  useEffect(() => {
    const savedLocation = localStorage.getItem('selectedLocationId');

    if (isGlobalViewer) {
      if (savedLocation === 'all') {
        setSelectedLocationId('all');
      } else if (savedLocation && locations.find(l => l.id === savedLocation)) {
        setSelectedLocationId(savedLocation);
      } else if (locations.length > 0) {
        setSelectedLocationId('all');
        localStorage.setItem('selectedLocationId', 'all');
      }
    } else {
      if (savedLocation && savedLocation !== 'all' && locations.find(l => l.id === savedLocation)) {
        setSelectedLocationId(savedLocation);
      } else if (locations.length > 0) {
        const first = locations[0].id;
        setSelectedLocationId(first);
        localStorage.setItem('selectedLocationId', first);
        window.dispatchEvent(new CustomEvent('locationChanged', { detail: { locationId: first } }));
      }
    }
  }, [locations, isGlobalViewer]);

  const fetchLocations = async () => {
    try {
      if (isGlobalViewer) {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, city')
          .eq('status', 'active')
          .order('name');
        if (error) throw error;
        setLocations(data || []);
      } else {
        const assignedLocationIds = userRoles.map(r => r.location_id);
        if (assignedLocationIds.length === 0) {
          setLocations([]);
          return;
        }
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, city')
          .in('id', assignedLocationIds)
          .eq('status', 'active')
          .order('name');
        if (error) throw error;
        setLocations(data || []);
      }
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
  const currentRole = userRoles.find(r => r.location_id === selectedLocationId)?.role || userRoles[0]?.role;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    operator: 'Operator',
    gate_security: 'Gate Security',
    visitor: 'Visitor',
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
            {locations.length === 1 && !isGlobalViewer ? (
              <div className="flex items-center gap-2 text-sm px-3 h-10">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{locations[0].name}</span>
              </div>
            ) : (
              <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={locationPopoverOpen}
                    className="w-[140px] md:w-[220px] bg-background h-10 justify-between font-normal"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {selectedLocationId === 'all' ? (
                        <Crown className="h-4 w-4 text-[#f59e0b] flex-shrink-0" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">
                        {selectedLocationId === 'all'
                          ? 'All Locations'
                          : currentLocation
                            ? currentLocation.name
                            : 'Location'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search locations..." />
                    <CommandList>
                      <CommandEmpty>No locations found.</CommandEmpty>
                      <CommandGroup>
                        {isGlobalViewer && (
                          <CommandItem
                            value="all locations"
                            onSelect={() => {
                              handleLocationChange('all');
                              setLocationPopoverOpen(false);
                            }}
                          >
                            <Crown className="h-4 w-4 text-[#f59e0b] mr-2" />
                            <span>All Locations</span>
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                selectedLocationId === 'all' ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        )}
                        {locations.map((location) => (
                          <CommandItem
                            key={location.id}
                            value={`${location.name} ${location.city ?? ''}`}
                            onSelect={() => {
                              handleLocationChange(location.id);
                              setLocationPopoverOpen(false);
                            }}
                          >
                            <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                            <span className="truncate">
                              {location.name}
                              {location.city && (
                                <span className="text-muted-foreground"> ({location.city})</span>
                              )}
                            </span>
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                selectedLocationId === location.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* Search - hidden on mobile */}
        <div className="relative w-80 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background h-10"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10" title="Change Language">
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>{t('settings.language')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={i18n.language === lang.code ? 'bg-accent' : ''}
              >
                <span className="mr-2 font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">({lang.name})</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
                  {isHoAdmin ? t('header.hoAdmin') : isAdminHead ? 'Admin Head' : t('header.user')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rolesLoading ? '...' : (isHoAdmin || isAdminHead) ? t('header.allLocations') : (currentRole ? roleLabels[currentRole] : t('header.noRole'))}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
            <DropdownMenuLabel>{t('header.myAccount')}</DropdownMenuLabel>
            {isHoAdmin && (
              <div className="px-2 py-1">
                <Badge className="bg-[#f59e0b] text-white gap-1">
                  <Crown className="h-3 w-3" />
                  {t('header.hoAdmin')}
                </Badge>
              </div>
            )}
            {!isHoAdmin && isAdminHead && (
              <div className="px-2 py-1">
                <Badge className="bg-emerald-600 text-white gap-1">
                  <Crown className="h-3 w-3" />
                  Admin Head (Read-only)
                </Badge>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/users" className="w-full">{t('header.userManagement')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="w-full">{t('header.settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/help" className="w-full">{t('header.helpSupport')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="md:hidden p-0">
              <div className="w-full px-2 py-1.5">
                <InstallButton
                  variant="ghost"
                  size="sm"
                  label="Install App"
                  className="w-full justify-start h-8 px-2"
                />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              {t('header.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}