import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'manager' | 'operator' | 'gate_security' | 'visitor';

export interface UserLocationRole {
  id: string;
  user_id: string;
  location_id: string;
  role: AppRole;
  is_ho_admin: boolean;
  created_at: string;
  updated_at: string;
  location?: {
    id: string;
    name: string;
    city: string | null;
  };
}

export interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: UserLocationRole[];
}

export function useUserRoles() {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserLocationRole[]>([]);
  const [isHoAdmin, setIsHoAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_location_roles')
        .select(`
          *,
          location:locations(id, name, city)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = (data || []) as unknown as UserLocationRole[];
      setUserRoles(roles);
      setIsHoAdmin(roles.some(r => r.is_ho_admin));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRoleAtLocation = (locationId: string, role: AppRole): boolean => {
    if (isHoAdmin) return true;
    return userRoles.some(r => r.location_id === locationId && r.role === role);
  };

  const canAccessLocation = (locationId: string): boolean => {
    if (isHoAdmin) return true;
    return userRoles.some(r => r.location_id === locationId);
  };

  const getRoleAtLocation = (locationId: string): AppRole | null => {
    const role = userRoles.find(r => r.location_id === locationId);
    return role?.role || null;
  };

  const getAccessibleLocationIds = (): string[] => {
    return userRoles.map(r => r.location_id);
  };

  return {
    userRoles,
    isHoAdmin,
    loading,
    hasRoleAtLocation,
    canAccessLocation,
    getRoleAtLocation,
    getAccessibleLocationIds,
    refetch: fetchUserRoles,
  };
}
