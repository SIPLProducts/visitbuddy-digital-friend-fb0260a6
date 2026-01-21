import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  MapPin,
  Plus,
  Building2,
  DoorOpen,
  Users,
  Phone,
  Mail,
  Edit,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalGates: 0,
    departments: 0,
    currentVisitors: 0,
  });

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    country: 'India',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');

    if (data) {
      const typedData = data as Location[];
      setLocations(typedData);

      setStats({
        totalLocations: typedData.length,
        totalGates: typedData.reduce((acc, l) => acc + l.gate_count, 0),
        departments: typedData.reduce((acc, l) => acc + l.department_count, 0),
        currentVisitors: typedData.reduce((acc, l) => acc + l.visitor_count, 0),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      country: 'India',
      email: '',
      phone: '',
      status: 'active',
    });
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Please enter location name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('locations').insert({
      name: formData.name,
      address: formData.address || null,
      city: formData.city || null,
      country: formData.country || 'India',
      email: formData.email || null,
      phone: formData.phone || null,
      status: formData.status,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to add location');
    } else {
      toast.success('Location added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchLocations();
    }
  };

  const handleEdit = async () => {
    if (!selectedLocation || !formData.name) return;

    setLoading(true);
    const { error } = await supabase
      .from('locations')
      .update({
        name: formData.name,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || 'India',
        email: formData.email || null,
        phone: formData.phone || null,
        status: formData.status,
      })
      .eq('id', selectedLocation.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to update location');
    } else {
      toast.success('Location updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchLocations();
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    setLoading(true);
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', selectedLocation.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to delete location. Make sure no gates or departments are linked.');
    } else {
      toast.success('Location deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedLocation(null);
      fetchLocations();
    }
  };

  const openEditDialog = (location: Location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      country: location.country || 'India',
      email: location.email || '',
      phone: location.phone || '',
      status: location.status,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (location: Location) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };

  const LocationForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Location Name *</Label>
          <Input
            placeholder="e.g., Corporate HQ"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          placeholder="Street address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            placeholder="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            placeholder="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="location@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            placeholder="+91 XXXXX XXXXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3b82f6] text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalLocations}</p>
                <p className="text-sm text-muted-foreground">Total Locations</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#10b981] text-white">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalGates}</p>
                <p className="text-sm text-muted-foreground">Total Gates</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#14b8a6] text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.departments}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#f59e0b] text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.currentVisitors}</p>
                <p className="text-sm text-muted-foreground">Current Visitors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Locations</h1>
            <p className="text-muted-foreground">Manage your office locations and facilities</p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No locations configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                Add Your First Location
              </Button>
            </div>
          ) : (
            locations.map((location) => (
              <Card key={location.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {location.city}, {location.country}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        location.status === 'active'
                          ? 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]/20'
                          : 'bg-gray-100 text-gray-600 border-gray-300/20'
                      )}
                    >
                      {location.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {location.address && (
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  )}

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-y border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{location.gate_count}</p>
                      <p className="text-xs text-muted-foreground">Gates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{location.department_count}</p>
                      <p className="text-xs text-muted-foreground">Departments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{location.visitor_count}</p>
                      <p className="text-xs text-muted-foreground">Visitors</p>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Capacity Usage</span>
                      <span className="text-sm font-medium">{location.capacity_usage}%</span>
                    </div>
                    <Progress value={location.capacity_usage} className="h-2" />
                  </div>

                  {/* Contact */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {location.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {location.email}
                      </span>
                    )}
                    {location.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {location.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => openEditDialog(location)}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(location)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>Create a new office location or facility</DialogDescription>
          </DialogHeader>
          <LocationForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? 'Adding...' : 'Add Location'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location details</DialogDescription>
          </DialogHeader>
          <LocationForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLocation?.name}"? This will also remove all associated gates and departments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
