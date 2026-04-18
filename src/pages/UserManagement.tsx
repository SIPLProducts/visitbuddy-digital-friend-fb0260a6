import { useEffect, useState, useRef } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  EyeOff,
  Edit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/auditLog';
import { toast } from 'sonner';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
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
  gate_security: 'bg-warning text-warning-foreground',
  visitor: 'bg-secondary text-secondary-foreground',
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
  gate_security: 'Gate Security',
  visitor: 'Visitor',
};

export default function UserManagement() {
  const { isHoAdmin, isLocationAdmin, userRoles: myRoles, loading: rolesLoading } = useUserRoles();
  const [userRoles, setUserRoles] = useState<UserRoleEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [screens, setScreens] = useState<Screen[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RoleScreenPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedLocationId: headerLocationId, isAllLocations: headerIsAll } = useSelectedLocation();
  const [filterLocationId, setFilterLocationId] = useState<string>('all');
  const [filterSeeded, setFilterSeeded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResult, setShowImportResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create User dialog
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // Password reset
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Change password (admin sets a new password for an existing user)
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordUserId, setChangePasswordUserId] = useState('');
  const [changePasswordUserName, setChangePasswordUserName] = useState('');
  const [changePasswordValue, setChangePasswordValue] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Create Role dialog (step wizard)
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [createRoleStep, setCreateRoleStep] = useState(1);
  const [createRoleType, setCreateRoleType] = useState<AppRole>('operator');
  const [createRoleLocations, setCreateRoleLocations] = useState<string[]>([]);
  const [createRoleIsHoAdmin, setCreateRoleIsHoAdmin] = useState(false);
  const [createRolePermissions, setCreateRolePermissions] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [savingRole, setSavingRole] = useState(false);

  // Assign User to Role dialog
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLocationId, setAssignLocationId] = useState('');
  const [assignRole, setAssignRole] = useState<AppRole>('operator');
  const [assignIsHoAdmin, setAssignIsHoAdmin] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

  // Edit Role dialog
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRoleEntry | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('operator');
  const [editIsHoAdmin, setEditIsHoAdmin] = useState(false);
  const [editLocationId, setEditLocationId] = useState('');

  // Role Permissions tab state
  const [selectedPermLocation, setSelectedPermLocation] = useState('');
  const [selectedPermRole, setSelectedPermRole] = useState<AppRole>('operator');
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Delete user confirmation
  const [deleteUserDialog, setDeleteUserDialog] = useState<{ userId: string; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPermLocation && selectedPermRole) {
      fetchRolePermissions();
    }
  }, [selectedPermLocation, selectedPermRole]);

  // Seed location filter from header selection once locations are loaded
  useEffect(() => {
    if (filterSeeded || rolesLoading) return;
    if (locations.length === 0) return;
    if (headerIsAll) {
      setFilterLocationId('all');
    } else if (headerLocationId && locations.find(l => l.id === headerLocationId)) {
      setFilterLocationId(headerLocationId);
    }
    setFilterSeeded(true);
  }, [headerLocationId, headerIsAll, locations, rolesLoading, filterSeeded]);

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

      // Fetch emails (admin-only edge function); silently ignore failures
      supabase.functions.invoke('list-user-emails').then(({ data, error }) => {
        if (!error && data?.emails) setUserEmails(data.emails as Record<string, string>);
      });
      setScreens(screensRes.data || []);

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

  // --- Handlers ---

  const handleDeleteUserFully = async () => {
    if (!deleteUserDialog) return;
    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-fully', {
        body: { userId: deleteUserDialog.userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('User deleted permanently');
      setDeleteUserDialog(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setDeletingUser(false);
    }
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
        options: { data: { full_name: newUserFullName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      toast.success(`User ${newUserFullName} created successfully!`);
      setIsCreateUserDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
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
    if (!resetEmail) { toast.error('Please enter an email address'); return; }
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
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const openChangePasswordDialog = (userId: string, userName: string) => {
    setChangePasswordUserId(userId);
    setChangePasswordUserName(userName);
    setChangePasswordValue('');
    setShowChangePassword(false);
    setIsChangePasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!changePasswordUserId) return;
    if (!changePasswordValue || changePasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-change-password', {
        body: { user_id: changePasswordUserId, new_password: changePasswordValue },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Password updated for ${changePasswordUserName || 'user'}`);
      logAudit({
        action: 'user_role_changed',
        entityType: 'user',
        entityId: changePasswordUserId,
        entityName: changePasswordUserName,
        details: { change: 'password_reset_by_admin' },
      });
      setIsChangePasswordDialogOpen(false);
      setChangePasswordValue('');
      setChangePasswordUserId('');
      setChangePasswordUserName('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };
  const openCreateRoleDialog = () => {
    setCreateRoleStep(1);
    setCreateRoleType('operator');
    setCreateRoleLocations([]);
    setCreateRoleIsHoAdmin(false);
    // Initialize all permissions as view=true, edit=false
    const perms: Record<string, { can_view: boolean; can_edit: boolean }> = {};
    screens.forEach(s => { perms[s.id] = { can_view: true, can_edit: false }; });
    setCreateRolePermissions(perms);
    setIsCreateRoleDialogOpen(true);
  };

  const toggleCreateRoleLocation = (locationId: string) => {
    setCreateRoleLocations(prev =>
      prev.includes(locationId) ? prev.filter(id => id !== locationId) : [...prev, locationId]
    );
  };

  const handleCreateRolePermChange = (screenId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setCreateRolePermissions(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        [field]: value,
        ...(field === 'can_view' && !value ? { can_edit: false } : {}),
      },
    }));
  };

  const handleSaveRole = async () => {
    if (createRoleLocations.length === 0) {
      toast.error('Please select at least one location');
      return;
    }

    setSavingRole(true);
    try {
      // For each selected location, upsert screen permissions
      for (const locationId of createRoleLocations) {
        // Delete existing permissions for this role+location
        await supabase
          .from('role_screen_permissions')
          .delete()
          .eq('location_id', locationId)
          .eq('role', createRoleType);

        // Insert new permissions
        const permsToInsert = Object.entries(createRolePermissions)
          .filter(([_, p]) => p.can_view || p.can_edit)
          .map(([screenId, p]) => ({
            location_id: locationId,
            role: createRoleType,
            screen_id: screenId,
            can_view: p.can_view,
            can_edit: p.can_edit,
          }));

        if (permsToInsert.length > 0) {
          const { error } = await supabase
            .from('role_screen_permissions')
            .insert(permsToInsert);
          if (error) throw error;
        }
      }

      const locationNames = createRoleLocations.map(id => locations.find(l => l.id === id)?.name).join(', ');
      toast.success(`${roleLabels[createRoleType]} role created for ${locationNames} with screen permissions!`);
      setIsCreateRoleDialogOpen(false);
      fetchRolePermissions();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error.message || 'Failed to create role');
    } finally {
      setSavingRole(false);
    }
  };

  // --- Assign User to Role ---
  const handleAssignUser = async () => {
    if (!assignUserId || !assignLocationId) {
      toast.error('Please select a user and location');
      return;
    }

    setAssigningRole(true);
    try {
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
      const profile = profiles.find(p => p.user_id === assignUserId);
      logAudit({ action: 'user_role_changed', entityType: 'user', entityId: assignUserId, entityName: profile?.full_name || assignUserId, details: { change: 'assigned', role: assignRole, location_id: assignLocationId, is_ho_admin: assignIsHoAdmin }, locationId: assignLocationId });
      toast.success('User assigned to role successfully!');
      setIsAssignUserDialogOpen(false);
      setAssignUserId('');
      setAssignLocationId('');
      setAssignRole('operator');
      setAssignIsHoAdmin(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setAssigningRole(false);
    }
  };

  // --- Edit Role ---
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
        .update({ role: editRole, is_ho_admin: editIsHoAdmin, location_id: editLocationId })
        .eq('id', editingRole.id);
      if (error) throw error;
      const profile = profiles.find(p => p.user_id === editingRole.user_id);
      logAudit({ action: 'user_role_changed', entityType: 'user', entityId: editingRole.user_id, entityName: profile?.full_name || editingRole.user_id, details: { change: 'updated', oldRole: editingRole.role, newRole: editRole, is_ho_admin: editIsHoAdmin, location_id: editLocationId }, locationId: editLocationId });
      toast.success('Role updated successfully!');
      setIsEditRoleDialogOpen(false);
      setEditingRole(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  // --- Bulk Import ---
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

        const emailError = validateEmail(email);
        if (emailError) { errors.push({ row: rowNum, field: 'email', message: emailError, value: email }); failedCount++; continue; }
        const nameError = validateRequired(fullName, 'Full Name');
        if (nameError) { errors.push({ row: rowNum, field: 'full_name', message: nameError, value: fullName }); failedCount++; continue; }
        if (!password || password.length < 6) { errors.push({ row: rowNum, field: 'password', message: 'Password must be at least 6 characters' }); failedCount++; continue; }
        if (!['admin', 'manager', 'operator', 'gate_security', 'visitor'].includes(role)) { errors.push({ row: rowNum, field: 'role', message: 'Invalid role', value: role }); failedCount++; continue; }

        const location = locations.find(l => l.name.toLowerCase() === locationName?.toLowerCase());
        if (locationName && !location) { errors.push({ row: rowNum, field: 'location_name', message: 'Location not found', value: locationName }); failedCount++; continue; }

        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName } },
          });
          if (authError) { errors.push({ row: rowNum, field: 'email', message: authError.message, value: email }); failedCount++; continue; }

          if (authData.user && location) {
            await new Promise(r => setTimeout(r, 500));
            await supabase.from('user_location_roles').insert({
              user_id: authData.user.id, location_id: location.id, role, is_ho_admin: isHoAdmin,
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
      if (successCount > 0) fetchData();
    } catch (error) {
      toast.error('Failed to process CSV file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Permissions Tab ---
  const handlePermissionChange = (screenId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissionChanges(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        [field]: value,
        ...(field === 'can_view' && !value ? { can_edit: false } : {}),
      },
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedPermLocation || !selectedPermRole) return;
    setSavingPermissions(true);
    try {
      await supabase.from('role_screen_permissions').delete()
        .eq('location_id', selectedPermLocation).eq('role', selectedPermRole);

      const permsToInsert = Object.entries(permissionChanges)
        .filter(([_, perm]) => perm.can_view || perm.can_edit)
        .map(([screenId, perm]) => ({
          location_id: selectedPermLocation,
          role: selectedPermRole,
          screen_id: screenId,
          can_view: perm.can_view,
          can_edit: perm.can_edit,
        }));

      if (permsToInsert.length > 0) {
        const { error } = await supabase.from('role_screen_permissions').insert(permsToInsert);
        if (error) throw error;
      }
      toast.success('Role permissions saved successfully!');
      fetchRolePermissions();
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  // --- Derived Data ---
  const filteredUserRoles = userRoles.filter((role) => {
    if (filterLocationId !== 'all' && role.location_id !== filterLocationId) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      role.profile?.full_name?.toLowerCase().includes(query) ||
      role.location?.name?.toLowerCase().includes(query) ||
      role.role?.toLowerCase().includes(query) ||
      userEmails[role.user_id]?.toLowerCase().includes(query)
    );
  });

  const userGroups = userRoles.reduce((acc, role) => {
    const userId = role.user_id;
    if (!acc[userId]) acc[userId] = { user_id: userId, profile: role.profile, roles: [] };
    acc[userId].roles.push(role);
    return acc;
  }, {} as Record<string, { user_id: string; profile?: Profile; roles: UserRoleEntry[] }>);

  const screensByCategory = screens.reduce((acc, screen) => {
    const cat = screen.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  // Get unique role+location combos from role_screen_permissions perspective
  // We'll derive from what exists in user_location_roles
  const uniqueRoleLocations = Array.from(
    new Set(userRoles.map(r => `${r.role}|${r.location_id}`))
  ).map(key => {
    const [role, locationId] = key.split('|');
    const loc = locations.find(l => l.id === locationId);
    const usersWithRole = userRoles.filter(r => r.role === role && r.location_id === locationId);
    return { role: role as AppRole, locationId, locationName: loc?.name || 'Unknown', city: loc?.city, userCount: usersWithRole.length };
  });

  if (rolesLoading || loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!isHoAdmin && !isLocationAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only Admins can manage user roles and permissions.</p>
        </div>
    );
  }

  // Scope locations for Location Admins
  const adminLocationIds = myRoles.filter(r => r.role === 'admin').map(r => r.location_id);
  const accessibleLocations = isHoAdmin ? locations : locations.filter(l => adminLocationIds.includes(l.id));

  // Filter displayed roles for Location Admins
  const scopedUserRoles = isHoAdmin ? userRoles : userRoles.filter(r => adminLocationIds.includes(r.location_id));

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Create roles with permissions, then assign users
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Password Reset */}
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
                  <DialogDescription>Send a password reset email to a user</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">User Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="resetEmail" type="email" placeholder="user@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handlePasswordReset} disabled={sendingReset}>
                    {sendingReset ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Email'}
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
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkImport} className="hidden" />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />
                {uploading ? 'Importing...' : 'Bulk Import'}
              </Button>
            </div>

            {/* Create User */}
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Create a user account. You can assign a role later.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" placeholder="John Doe" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="user@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showNewUserPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewUserPassword((s) => !s)}
                        tabIndex={-1}
                      >
                        {showNewUserPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={creatingUser}>
                    {creatingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Change Password Dialog (admin sets new password) */}
        <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for{' '}
                <span className="font-medium text-foreground">{changePasswordUserName || 'this user'}</span>.
                The user will need to use this new password on their next sign in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="changePasswordValue">New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="changePasswordValue"
                    type={showChangePassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={changePasswordValue}
                    onChange={(e) => setChangePasswordValue(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowChangePassword((s) => !s)}
                    tabIndex={-1}
                  >
                    {showChangePassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)} disabled={changingPassword}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary"><Users className="h-6 w-6" /></div>
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
                <div className="p-3 rounded-lg bg-success/10 text-success"><MapPin className="h-6 w-6" /></div>
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
                <div className="p-3 rounded-lg bg-warning/10 text-warning"><Crown className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">HO Admins</p>
                  <p className="text-2xl font-bold">{userRoles.filter(r => r.is_ho_admin).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10 text-info"><Monitor className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Screens</p>
                  <p className="text-2xl font-bold">{screens.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Roles → Screen Permissions → Users */}
        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Monitor className="h-4 w-4" />
              Screen Permissions
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Assign Users
            </TabsTrigger>
            <TabsTrigger value="by-location" className="gap-2">
              <MapPin className="h-4 w-4" />
              Users by Location
            </TabsTrigger>
          </TabsList>

          {/* ========== Tab 1: Roles ========== */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Step 1: Create a role by selecting role type, locations, and screen permissions.
              </p>
              <Button className="gap-2" onClick={openCreateRoleDialog}>
                <Plus className="h-4 w-4" />
                Create Role
              </Button>
            </div>

            {/* Existing role+location combos */}
            <Card>
              <CardHeader>
                <CardTitle>Configured Roles by Location</CardTitle>
                <CardDescription>Role types with assigned locations and user counts</CardDescription>
              </CardHeader>
              <CardContent>
                {uniqueRoleLocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No roles configured yet. Click "Create Role" to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Users Assigned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniqueRoleLocations.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge className={roleColors[item.role]}>{roleLabels[item.role]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {item.locationName}
                              {item.city && <span className="text-muted-foreground text-sm">({item.city})</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.userCount} user(s)</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Tab 2: Screen Permissions ========== */}
          <TabsContent value="permissions" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Step 2: Configure which screens each role can view or edit at each location.
            </p>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Screen Permissions by Role
                </CardTitle>
                <CardDescription>Select a location and role to configure screen access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2 min-w-[200px]">
                    <Label>Location</Label>
                    <Select value={selectedPermLocation} onValueChange={setSelectedPermLocation}>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {accessibleLocations.map((location) => (
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="gate_security">Gate Security</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedPermLocation && selectedPermRole && (
                  <div className="space-y-6">
                    {Object.entries(screensByCategory).map(([category, categoryScreens]) => (
                      <div key={category} className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{category}</h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Screen</TableHead>
                                <TableHead className="w-[100px] text-center">
                                  <div className="flex items-center justify-center gap-1"><Eye className="h-4 w-4" />View</div>
                                </TableHead>
                                <TableHead className="w-[100px] text-center">
                                  <div className="flex items-center justify-center gap-1"><Edit className="h-4 w-4" />Edit</div>
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
                                      onCheckedChange={(checked) => handlePermissionChange(screen.id, 'can_view', checked === true)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={permissionChanges[screen.id]?.can_edit ?? false}
                                      disabled={!permissionChanges[screen.id]?.can_view}
                                      onCheckedChange={(checked) => handlePermissionChange(screen.id, 'can_edit', checked === true)}
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
                        {savingPermissions ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="h-4 w-4" />Save Permissions</>}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Tab 3: Assign Users ========== */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Step 3: Assign users to roles at specific locations.
              </p>
              <Button className="gap-2" onClick={() => setIsAssignUserDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Assign User to Role
              </Button>
            </div>

            {/* Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users, locations, or roles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>

            {/* User Roles Table */}
            <Card>
              <CardHeader>
                <CardTitle>User Role Assignments</CardTitle>
                <CardDescription>Users assigned to roles at specific locations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>HO Admin</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserRoles.filter(r => isHoAdmin || adminLocationIds.includes(r.location_id)).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No users found matching your search' : 'No user roles assigned yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUserRoles.filter(r => isHoAdmin || adminLocationIds.includes(r.location_id)).map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {(role.profile?.full_name || 'U')[0].toUpperCase()}
                              </div>
                              <span className="font-medium">{role.profile?.full_name || 'Unknown User'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{userEmails[role.user_id] || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {role.location?.name || 'Unknown'}
                              {role.location?.city && <span className="text-muted-foreground text-sm">({role.location.city})</span>}
                            </div>
                          </TableCell>
                          <TableCell><Badge className={roleColors[role.role]}>{roleLabels[role.role]}</Badge></TableCell>
                          <TableCell>
                            {role.is_ho_admin && <Badge variant="outline" className="gap-1"><Crown className="h-3 w-3" />Yes</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditRole(role)} title="Edit role">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => openChangePasswordDialog(role.user_id, role.profile?.full_name || 'User')}
                                title="Change password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteUserDialog({ userId: role.user_id, name: role.profile?.full_name || userEmails[role.user_id] || 'this user' })}
                                title="Delete user permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Tab 4: Users by Location ========== */}
          <TabsContent value="by-location" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View all users grouped by their assigned location.
            </p>

            {/* Search + Location filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users, locations, or roles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                <SelectTrigger className="w-[220px]">
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="Filter by location" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {isHoAdmin && <SelectItem value="all">All Locations</SelectItem>}
                  {accessibleLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}{loc.city ? ` (${loc.city})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const query = searchQuery.toLowerCase();
              const baseRoles = filterLocationId === 'all'
                ? scopedUserRoles
                : scopedUserRoles.filter(r => r.location_id === filterLocationId);
              const grouped = baseRoles.reduce((acc, role) => {
                const locId = role.location_id;
                if (!acc[locId]) acc[locId] = { location: role.location, roles: [] };
                acc[locId].roles.push(role);
                return acc;
              }, {} as Record<string, { location: Location; roles: UserRoleEntry[] }>);

              const filteredGroups = Object.entries(grouped)
                .map(([locId, group]) => {
                  const filteredRoles = group.roles.filter(r => {
                    if (!query) return true;
                    const name = r.profile?.full_name?.toLowerCase() || '';
                    const locName = r.location?.name?.toLowerCase() || '';
                    const roleName = roleLabels[r.role]?.toLowerCase() || '';
                    return name.includes(query) || locName.includes(query) || roleName.includes(query);
                  });
                  return { locId, location: group.location, roles: filteredRoles };
                })
                .filter(g => g.roles.length > 0);

              if (filteredGroups.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {searchQuery ? 'No users found matching your search' : 'No user roles assigned yet.'}
                    </CardContent>
                  </Card>
                );
              }

              return filteredGroups.map(({ locId, location, roles }) => (
                <Card key={locId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      {location?.name || 'Unknown Location'}
                      {location?.city && <span className="text-sm font-normal text-muted-foreground">({location.city})</span>}
                    </CardTitle>
                    <CardDescription>{roles.length} user(s) at this location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>HO Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                  {(role.profile?.full_name || 'U')[0].toUpperCase()}
                                </div>
                                <span className="font-medium">{role.profile?.full_name || 'Unknown User'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleColors[role.role]}>{roleLabels[role.role]}</Badge>
                            </TableCell>
                            <TableCell>
                              {role.is_ho_admin ? (
                                <Badge variant="outline" className="gap-1"><Crown className="h-3 w-3" />Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ));
            })()}
          </TabsContent>
        </Tabs>

        {/* ===== Create Role Step Wizard Dialog ===== */}
        <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Create Role — Step {createRoleStep} of 2
              </DialogTitle>
              <DialogDescription>
                {createRoleStep === 1
                  ? 'Select role type and locations'
                  : 'Configure screen permissions for this role'}
              </DialogDescription>
            </DialogHeader>

            {createRoleStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Role Type *</Label>
                  <Select value={createRoleType} onValueChange={(v) => setCreateRoleType(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="manager">Manager - Manage visitors</SelectItem>
                      <SelectItem value="operator">Operator - Basic operations</SelectItem>
                      <SelectItem value="gate_security">Gate Security - Gate check-in/out</SelectItem>
                      <SelectItem value="visitor">Visitor - View only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Locations * <span className="text-xs text-muted-foreground">(one or multiple)</span></Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {accessibleLocations.map((loc) => (
                      <div key={loc.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`loc-${loc.id}`}
                          checked={createRoleLocations.includes(loc.id)}
                          onCheckedChange={() => toggleCreateRoleLocation(loc.id)}
                        />
                        <label htmlFor={`loc-${loc.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {loc.name} {loc.city && <span className="text-muted-foreground">({loc.city})</span>}
                        </label>
                      </div>
                    ))}
                    {locations.length === 0 && (
                      <p className="text-sm text-muted-foreground">No locations found. Create locations first.</p>
                    )}
                  </div>
                  {createRoleLocations.length > 0 && (
                    <p className="text-xs text-muted-foreground">{createRoleLocations.length} location(s) selected</p>
                  )}
                </div>

                {isHoAdmin && (
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="createRoleHoAdmin"
                    checked={createRoleIsHoAdmin}
                    onCheckedChange={(checked) => setCreateRoleIsHoAdmin(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="createRoleHoAdmin" className="text-sm font-medium cursor-pointer">HO Admin</label>
                    <p className="text-xs text-muted-foreground">Can access all locations and manage user roles</p>
                  </div>
                </div>
                )}
              </div>
            )}

            {createRoleStep === 2 && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Badge className={roleColors[createRoleType]}>{roleLabels[createRoleType]}</Badge>
                  <span className="text-sm text-muted-foreground">at</span>
                  <span className="text-sm font-medium">
                    {createRoleLocations.map(id => locations.find(l => l.id === id)?.name).join(', ')}
                  </span>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                  {Object.entries(screensByCategory).map(([category, categoryScreens]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{category}</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Screen</TableHead>
                              <TableHead className="w-[80px] text-center text-xs">View</TableHead>
                              <TableHead className="w-[80px] text-center text-xs">Edit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryScreens.map((screen) => (
                              <TableRow key={screen.id}>
                                <TableCell className="py-2">
                                  <span className="text-sm font-medium">{screen.name}</span>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                  <Checkbox
                                    checked={createRolePermissions[screen.id]?.can_view ?? true}
                                    onCheckedChange={(checked) => handleCreateRolePermChange(screen.id, 'can_view', checked === true)}
                                  />
                                </TableCell>
                                <TableCell className="text-center py-2">
                                  <Checkbox
                                    checked={createRolePermissions[screen.id]?.can_edit ?? false}
                                    disabled={!createRolePermissions[screen.id]?.can_view}
                                    onCheckedChange={(checked) => handleCreateRolePermChange(screen.id, 'can_edit', checked === true)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              {createRoleStep === 2 && (
                <Button variant="outline" onClick={() => setCreateRoleStep(1)} className="gap-1 mr-auto">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {createRoleStep === 1 ? (
                <Button
                  onClick={() => {
                    if (createRoleLocations.length === 0) { toast.error('Please select at least one location'); return; }
                    setCreateRoleStep(2);
                  }}
                  className="gap-1"
                >
                  Next: Set Permissions
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSaveRole} disabled={savingRole} className="gap-2">
                  {savingRole ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle2 className="h-4 w-4" />Create Role</>}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Assign User to Role Dialog ===== */}
        <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Assign User to Role</DialogTitle>
              <DialogDescription>Select a user and assign them to a role at a location</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50 max-h-60">
                    {profiles.map((profile) => {
                      const email = userEmails[profile.user_id];
                      return (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          <div className="flex flex-col">
                            <span>{profile.full_name || 'Unknown User'}</span>
                            {email && (
                              <span className="text-xs text-muted-foreground">{email}</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={assignLocationId} onValueChange={setAssignLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {accessibleLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.city && `(${loc.city})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={assignRole} onValueChange={(v) => setAssignRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="gate_security">Gate Security</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isHoAdmin && (
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                <Checkbox id="assignHoAdmin" checked={assignIsHoAdmin} onCheckedChange={(checked) => setAssignIsHoAdmin(checked === true)} />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="assignHoAdmin" className="text-sm font-medium cursor-pointer">HO Admin</label>
                  <p className="text-xs text-muted-foreground">Can access all locations and manage user roles</p>
                </div>
              </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignUserDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignUser} disabled={assigningRole}>
                {assigningRole ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</> : 'Assign User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Edit Role Dialog ===== */}
        <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>Update role for {editingRole?.profile?.full_name || 'user'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={editLocationId} onValueChange={setEditLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {accessibleLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name} {loc.city && `(${loc.city})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="gate_security">Gate Security</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isHoAdmin && (
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                <Checkbox id="editHoAdmin" checked={editIsHoAdmin} onCheckedChange={(checked) => setEditIsHoAdmin(checked === true)} />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="editHoAdmin" className="text-sm font-medium cursor-pointer">HO Admin</label>
                  <p className="text-xs text-muted-foreground">Can access all locations and manage user roles</p>
                </div>
              </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRole}>Update Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Result */}
        <CsvImportResult open={showImportResult} onOpenChange={setShowImportResult} result={importResult} entityName="Users" />
      <AlertDialog open={!!deleteUserDialog} onOpenChange={(open) => !open && !deletingUser && setDeleteUserDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteUserDialog?.name}</strong>, their profile, and all role assignments across every location. The login account will no longer work. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUserFully(); }}
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
