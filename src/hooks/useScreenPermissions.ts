import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from './useUserRoles';

interface ScreenPermission {
  path: string;
  can_view: boolean;
  can_edit: boolean;
}

export function useScreenPermissions() {
  const { userRoles, isHoAdmin, isLocationAdmin, isAdminHead, loading: rolesLoading } = useUserRoles();
  const [permissions, setPermissions] = useState<ScreenPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rolesLoading) return;

    // HO Admins, Admin Heads, and Location Admins get full view access — skip fetching
    if (isHoAdmin || isLocationAdmin || isAdminHead) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    if (userRoles.length === 0) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [userRoles, isHoAdmin, isLocationAdmin, isAdminHead, rolesLoading]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      // Get all role+location combos for the user
      const locationIds = userRoles.map(r => r.location_id);
      const roles = [...new Set(userRoles.map(r => r.role))];

      const { data, error } = await supabase
        .from('role_screen_permissions')
        .select('can_view, can_edit, screen_id, screens!inner(path)')
        .in('location_id', locationIds)
        .in('role', roles);

      if (error) throw error;

      // Merge permissions across locations — if ANY location grants view/edit, allow it
      const permMap = new Map<string, ScreenPermission>();
      for (const row of data || []) {
        const screen = row.screens as unknown as { path: string };
        const path = screen.path;
        const existing = permMap.get(path);
        if (existing) {
          existing.can_view = existing.can_view || row.can_view;
          existing.can_edit = existing.can_edit || row.can_edit;
        } else {
          permMap.set(path, { path, can_view: row.can_view, can_edit: row.can_edit });
        }
      }

      setPermissions(Array.from(permMap.values()));
    } catch (error) {
      console.error('Error fetching screen permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const canViewScreen = useCallback((path: string): boolean => {
    // Admins and Admin Heads always have view access to every screen
    if (isHoAdmin || isLocationAdmin || isAdminHead) return true;
    // If no permissions configured at all, default to showing everything
    if (permissions.length === 0 && !loading) return true;
    const perm = permissions.find(p => p.path === path);
    return perm?.can_view ?? false;
  }, [permissions, isHoAdmin, isLocationAdmin, isAdminHead, loading]);

  const canEditScreen = useCallback((path: string): boolean => {
    // Admin Head is strictly read-only
    if (isAdminHead && !isHoAdmin && !isLocationAdmin) return false;
    if (isHoAdmin || isLocationAdmin) return true;
    if (permissions.length === 0 && !loading) return true;
    const perm = permissions.find(p => p.path === path);
    return perm?.can_edit ?? false;
  }, [permissions, isHoAdmin, isLocationAdmin, isAdminHead, loading]);

  return {
    canViewScreen,
    canEditScreen,
    loading: loading || rolesLoading,
  };
}
