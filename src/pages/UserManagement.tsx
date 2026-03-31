import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Shield, 
  MapPin,
  Trash2,
  Crown,
  Mail,
  Lock,
  Search,
  KeyRound,
  Upload,
  Download,
  Monitor,
  Eye,
  Edit,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { CsvImportResult, ImportResult, ImportError, validateRequired, validateEmail } from '@/components/shared/CsvImportResult';
import { parseCsvFile, downloadCsvTemplate } from '@/components/shared/CsvImport';

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

interface Screen {
  id: string;
  name: string;
  path: string;
  category: string | null;
  icon: string | null;
  display_order: number;
}

interface RoleScreenPermission {
  id: string;
  location_id: string;
  role: AppRole;
  screen_id: string;
  can_view: boolean;
  can_edit: boolean;
  screen?: Screen;
  location?: Location;
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
  admin: 'bg-destructive text-destructive-foreground',
  manager: 'bg-info text-info-foreground',
  operator: 'bg-success text-success-foreground',
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
  const [screens, setScreens] = useState<Screen[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RoleScreenPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRoleEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResult, setShowImportResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for user creation
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserLocationId, setNewUserLocationId] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('operator');
  const [newUserIsHoAdmin, setNewUserIsHoAdmin] = useState(false);

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');

  // Assign role state
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLocationId, setAssignLocationId] = useState('');
  const [assignRole, setAssignRole] = useState<AppRole>('operator');
  const [assignIsHoAdmin, setAssignIsHoAdmin] = useState(false);

  // Edit role state
  const [editRole, setEditRole] = useState<AppRole>('operator');
  const [editIsHoAdmin, setEditIsHoAdmin] = useState(false);
  const [editLocationId, setEditLocationId] = useState('');

  // Role permissions state
  const [selectedPermLocation, setSelectedPermLocation] = useState('');
  const [selectedPermRole, setSelectedPermRole] = useState<AppRole>('operator');
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPermLocation && selectedPermRole) {
      fetchRolePermissions();
    }
  }, [selectedPermLocation, selectedPermRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, locationsRes, profilesRes, screensRes] = await Promise.all([
        supabase.from('user_location_roles').select('*, location:locations(id, name, city)').order('created_at', { ascending: false }),
        supabase.from('locations').select('id, name, city').order('name'),
        supabase.from('profiles').select('id, user_id, full_name'),
        supabase.from('screens').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (screensRes.error) throw screensRes.error;

      const rolesWithProfiles = (rolesRes.data || []).map((role: any) => ({
        ...role,
        profile: profilesRes.data?.find((p: Profile) => p.user_id === role.user_id),
      }));

      setUserRoles(rolesWithProfiles);
      setLocations(locationsRes.data || []);
      setProfiles(profilesRes.data || []);
      setScreens(screensRes.data || []);

      // Set default location for permissions
      if (locationsRes.data && locationsRes.data.length > 0 && !selectedPermLocation) {
        setSelectedPermLocation(locationsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_screen_permissions')
        .select('*, screen:screens(*), location:locations(id, name, city)')
        .eq('location_id', selectedPermLocation)
        .eq('role', selectedPermRole);

      if (error) throw error;

      setRolePermissions(data || []);
      
      // Initialize permission changes
      const changes: Record<string, { can_view: boolean; can_edit: boolean }> = {};
      screens.forEach(screen => {
        const existing = data?.find(p => p.screen_id === screen.id);
        changes[screen.id] = {
          can_view: existing?.can_view ?? true,
          can_edit: existing?.can_edit ?? false,
        };
      });
      setPermissionChanges(changes);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
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

  const resetCreateUserForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserFullName('');
    setNewUserLocationId('');
    setNewUserRole('operator');
    setNewUserIsHoAdmin(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast.error('Please fill in email, password, and full name');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreatingUser(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserFullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (newUserLocationId) {
        const { error: roleError } = await supabase
          .from('user_location_roles')
          .insert({
            user_id: authData.user.id,
            location_id: newUserLocationId,
            role: newUserRole,
            is_ho_admin: newUserIsHoAdmin,
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          toast.warning('User created but role assignment failed. You can assign manually.');
        }
      }

      toast.success(`User ${newUserFullName} created successfully!`);
      setIsCreateUserDialogOpen(false);
      resetCreateUserForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered')) {
        toast.error('A user with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success('Password reset email sent successfully!');
      setIsPasswordResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const handleAssignRole = async () => {
    if (!assignUserId || !assignLocationId) {
      toast.error('Please select a user and location');
      return;
    }

    setAssigningRole(true);
    try {
      // Check if role already exists
      const { data: existing } = await supabase
        .from('user_location_roles')
        .select('id')
        .eq('user_id', assignUserId)
        .eq('location_id', assignLocationId)
        .maybeSingle();

      if (existing) {
        toast.error('This user already has a role at this location. Edit it instead.');
        setAssigningRole(false);
        return;
      }

      const { error } = await supabase
        .from('user_location_roles')
        .insert({
          user_id: assignUserId,
          location_id: assignLocationId,
          role: assignRole,
          is_ho_admin: assignIsHoAdmin,
        });

      if (error) throw error;

      toast.success('Role assigned successfully!');
      setIsAssignRoleDialogOpen(false);
      setAssignUserId('');
      setAssignLocationId('');
      setAssignRole('operator');
      setAssignIsHoAdmin(false);
      fetchData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setAssigningRole(false);
    }
  };

  const handleOpenEditRole = (role: UserRoleEntry) => {
    setEditingRole(role);
    setEditRole(role.role);
    setEditIsHoAdmin(role.is_ho_admin);
    setEditLocationId(role.location_id);
    setIsEditRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const { error } = await supabase
        .from('user_location_roles')
        .update({
          role: editRole,
          is_ho_admin: editIsHoAdmin,
          location_id: editLocationId,
        })
        .eq('id', editingRole.id);

      if (error) throw error;

      toast.success('Role updated successfully!');
      setIsEditRoleDialogOpen(false);
      setEditingRole(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsvTemplate(
      ['email', 'full_name', 'password', 'location_name', 'role', 'is_ho_admin'],
      [
        ['user@example.com', 'John Doe', 'password123', 'Main Office', 'operator', 'false'],
        ['admin@example.com', 'Jane Smith', 'securepass', 'Branch Office', 'admin', 'true'],
      ],
      'user_import_template.csv'
    );
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const errors: ImportError[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      const text = await file.text();
      const { headers, rows } = parseCsvFile(text);

      const emailIdx = headers.indexOf('email');
      const nameIdx = headers.indexOf('full_name');
      const passwordIdx = headers.indexOf('password');
      const locationIdx = headers.indexOf('location_name');
      const roleIdx = headers.indexOf('role');
      const hoAdminIdx = headers.indexOf('is_ho_admin');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const email = row[emailIdx]?.trim();
        const fullName = row[nameIdx]?.trim();
        const password = row[passwordIdx]?.trim();
        const locationName = row[locationIdx]?.trim();
        const role = row[roleIdx]?.trim().toLowerCase() as AppRole;
        const isHoAdmin = row[hoAdminIdx]?.trim().toLowerCase() === 'true';

        // Validate
        const emailError = validateEmail(email);
        if (emailError) {
          errors.push({ row: rowNum, field: 'email', message: emailError, value: email });
          failedCount++;
          continue;
        }

        const nameError = validateRequired(fullName, 'Full Name');
        if (nameError) {
          errors.push({ row: rowNum, field: 'full_name', message: nameError, value: fullName });
          failedCount++;
          continue;
        }

        if (!password || password.length < 6) {
          errors.push({ row: rowNum, field: 'password', message: 'Password must be at least 6 characters' });
          failedCount++;
          continue;
        }

        if (!['admin', 'manager', 'operator'].includes(role)) {
          errors.push({ row: rowNum, field: 'role', message: 'Invalid role (use admin, manager, or operator)', value: role });
          failedCount++;
          continue;
        }

        // Find location
        const location = locations.find(l => l.name.toLowerCase() === locationName?.toLowerCase());
        if (locationName && !location) {
          errors.push({ row: rowNum, field: 'location_name', message: 'Location not found', value: locationName });
          failedCount++;
          continue;
        }

        try {
          // Create user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

          if (authError) {
            errors.push({ row: rowNum, field: 'email', message: authError.message, value: email });
            failedCount++;
            continue;
          }

          if (authData.user && location) {
            await new Promise(r => setTimeout(r, 500));
            
            await supabase.from('user_location_roles').insert({
              user_id: authData.user.id,
              location_id: location.id,
              role,
              is_ho_admin: isHoAdmin,
            });
          }

          successCount++;
        } catch (error: any) {
          errors.push({ row: rowNum, field: 'email', message: error.message, value: email });
          failedCount++;
        }
      }

      setImportResult({ success: successCount, failed: failedCount, errors });
      setShowImportResult(true);
      
      if (successCount > 0) {
        fetchData();
      }
    } catch (error) {
      console.error('Error importing users:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePermissionChange = (screenId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissionChanges(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        [field]: value,
        // If removing view, also remove edit
        ...(field === 'can_view' && !value ? { can_edit: false } : {}),
      },
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedPermLocation || !selectedPermRole) return;

    setSavingPermissions(true);
    try {
      // Delete existing permissions for this location/role
      await supabase
        .from('role_screen_permissions')
        .delete()
        .eq('location_id', selectedPermLocation)
        .eq('role', selectedPermRole);

      // Insert new permissions
      const permissionsToInsert = Object.entries(permissionChanges)
        .filter(([_, perm]) => perm.can_view || perm.can_edit)
        .map(([screenId, perm]) => ({
          location_id: selectedPermLocation,
          role: selectedPermRole,
          screen_id: screenId,
          can_view: perm.can_view,
          can_edit: perm.can_edit,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('role_screen_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success('Role permissions saved successfully!');
      fetchRolePermissions();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const filteredUserRoles = userRoles.filter((role) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      role.profile?.full_name?.toLowerCase().includes(query) ||
      role.location?.name?.toLowerCase().includes(query) ||
      role.role?.toLowerCase().includes(query)
    );
  });

  const userGroups = userRoles.reduce((acc, role) => {
    const userId = role.user_id;
    if (!acc[userId]) {
      acc[userId] = { user_id: userId, profile: role.profile, roles: [] };
    }
    acc[userId].roles.push(role);
    return acc;
  }, {} as Record<string, { user_id: string; profile?: Profile; roles: UserRoleEntry[] }>);

  // Group screens by category
  const screensByCategory = screens.reduce((acc, screen) => {
    const cat = screen.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  if (rolesLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Create users, manage roles, and configure screen permissions
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Password Reset Dialog */}
            <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Password Reset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Password Reset</DialogTitle>
                  <DialogDescription>
                    Send a password reset email to a user
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">User Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePasswordReset} disabled={sendingReset}>
                    {sendingReset ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Email'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Bulk Import */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" />
                Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleBulkImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Importing...' : 'Bulk Import'}
              </Button>
            </div>

            {/* Create User Dialog */}
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and optionally assign a role
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Assign Role (Optional)</p>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Select value={newUserLocationId} onValueChange={setNewUserLocationId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border z-50">
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
                        <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border z-50">
                            <SelectItem value="admin">Admin - Full access</SelectItem>
                            <SelectItem value="manager">Manager - Manage visitors</SelectItem>
                            <SelectItem value="operator">Operator - Basic operations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                        <Checkbox
                          id="newUserHoAdmin"
                          checked={newUserIsHoAdmin}
                          onCheckedChange={(checked) => setNewUserIsHoAdmin(checked === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="newUserHoAdmin" className="text-sm font-medium cursor-pointer">
                            HO Admin
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Can access all locations and manage user roles
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creatingUser}>
                    {creatingUser ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
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
                <div className="p-3 rounded-lg bg-success/10 text-success">
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
                <div className="p-3 rounded-lg bg-warning/10 text-warning">
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10 text-info">
                  <Monitor className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Screens</p>
                  <p className="text-2xl font-bold">{screens.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              Role Permissions
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users, locations, or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                    {filteredUserRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery
                            ? 'No users found matching your search'
                            : 'No user roles assigned yet. Click "Create User" to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUserRoles.map((role) => (
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
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Screen Permissions by Role
                </CardTitle>
                <CardDescription>
                  Configure which screens each role can access at each location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location and Role Selector */}
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2 min-w-[200px]">
                    <Label>Location</Label>
                    <Select value={selectedPermLocation} onValueChange={setSelectedPermLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} {location.city && `(${location.city})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 min-w-[200px]">
                    <Label>Role</Label>
                    <Select value={selectedPermRole} onValueChange={(v) => setSelectedPermRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Permissions Grid */}
                {selectedPermLocation && selectedPermRole && (
                  <div className="space-y-6">
                    {Object.entries(screensByCategory).map(([category, categoryScreens]) => (
                      <div key={category} className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Screen</TableHead>
                                <TableHead className="w-[100px] text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    View
                                  </div>
                                </TableHead>
                                <TableHead className="w-[100px] text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryScreens.map((screen) => (
                                <TableRow key={screen.id}>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{screen.name}</span>
                                      <span className="text-xs text-muted-foreground">{screen.path}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={permissionChanges[screen.id]?.can_view ?? true}
                                      onCheckedChange={(checked) => 
                                        handlePermissionChange(screen.id, 'can_view', checked === true)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={permissionChanges[screen.id]?.can_edit ?? false}
                                      disabled={!permissionChanges[screen.id]?.can_view}
                                      onCheckedChange={(checked) => 
                                        handlePermissionChange(screen.id, 'can_edit', checked === true)
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={handleSavePermissions} disabled={savingPermissions} className="gap-2">
                        {savingPermissions ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Save Permissions
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CSV Import Result Dialog */}
        <CsvImportResult
          open={showImportResult}
          onOpenChange={setShowImportResult}
          result={importResult}
          entityName="Users"
        />
      </div>
    </MainLayout>
  );
}
