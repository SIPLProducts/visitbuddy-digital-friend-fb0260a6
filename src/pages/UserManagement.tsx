import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Shield, 
  MapPin,
  Trash2,
  Edit,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';

interface Location {
  id: string;
  name: string;
  city: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface UserRoleEntry {
  id: string;
  user_id: string;
  location_id: string;
  role: AppRole;
  is_ho_admin: boolean;
  location: Location;
  profile?: Profile;
}

const roleColors: Record<AppRole, string> = {
  admin: 'bg-[#ef4444] text-white',
  manager: 'bg-[#3b82f6] text-white',
  operator: 'bg-[#10b981] text-white',
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
};

export default function UserManagement() {
  const { isHoAdmin, loading: rolesLoading } = useUserRoles();
  const [userRoles, setUserRoles] = useState<UserRoleEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('operator');
  const [isHoAdminFlag, setIsHoAdminFlag] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all user roles with location details
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_location_roles')
        .select(`
          *,
          location:locations(id, name, city)
        `)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, city')
        .order('name');

      if (locationsError) throw locationsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name');

      if (profilesError) throw profilesError;

      // Map profiles to roles
      const rolesWithProfiles = (rolesData || []).map((role: any) => ({
        ...role,
        profile: profilesData?.find((p: Profile) => p.user_id === role.user_id),
      }));

      setUserRoles(rolesWithProfiles);
      setLocations(locationsData || []);
      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedLocationId || !selectedRole) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_location_roles')
        .insert({
          user_id: selectedUserId,
          location_id: selectedLocationId,
          role: selectedRole,
          is_ho_admin: isHoAdminFlag,
        });

      if (error) throw error;

      toast.success('User role added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('User already has a role at this location');
      } else {
        console.error('Error adding role:', error);
        toast.error('Failed to add user role');
      }
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_location_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success('User role removed');
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to remove user role');
    }
  };

  const handleUpdateRole = async (roleId: string, newRole: AppRole, newIsHoAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('user_location_roles')
        .update({ role: newRole, is_ho_admin: newIsHoAdmin })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('User role updated');
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedLocationId('');
    setSelectedRole('operator');
    setIsHoAdminFlag(false);
  };

  // Group roles by user
  const userGroups = userRoles.reduce((acc, role) => {
    const userId = role.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        profile: role.profile,
        roles: [],
      };
    }
    acc[userId].roles.push(role);
    return acc;
  }, {} as Record<string, { user_id: string; profile?: Profile; roles: UserRoleEntry[] }>);

  if (rolesLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!isHoAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only HO Admins can manage user roles and permissions.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage user roles and location access permissions
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User Role</DialogTitle>
                <DialogDescription>
                  Assign a role to a user at a specific location
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || 'Unnamed User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} {location.city && `(${location.city})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="manager">Manager - Manage visitors</SelectItem>
                      <SelectItem value="operator">Operator - Basic operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <input
                    type="checkbox"
                    id="ho_admin"
                    checked={isHoAdminFlag}
                    onChange={(e) => setIsHoAdminFlag(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <div>
                    <Label htmlFor="ho_admin" className="font-medium">HO Admin</Label>
                    <p className="text-sm text-muted-foreground">
                      Can access all locations and manage user roles
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRole}>Assign Role</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#3b82f6] text-white">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{Object.keys(userGroups).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#10b981] text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                  <p className="text-2xl font-bold">{locations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#f59e0b] text-white">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">HO Admins</p>
                  <p className="text-2xl font-bold">
                    {userRoles.filter(r => r.is_ho_admin).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles by Location</CardTitle>
            <CardDescription>
              View and manage user access permissions across locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>HO Admin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No user roles assigned yet. Click "Assign Role" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  userRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {(role.profile?.full_name || 'U')[0].toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {role.profile?.full_name || 'Unknown User'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {role.location?.name || 'Unknown'}
                          {role.location?.city && (
                            <span className="text-muted-foreground text-sm">
                              ({role.location.city})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[role.role]}>
                          {roleLabels[role.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.is_ho_admin && (
                          <Badge variant="outline" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Yes
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
