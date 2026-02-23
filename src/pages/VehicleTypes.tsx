import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VehicleType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function VehicleTypes() {
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<VehicleType | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to load vehicle types');
    } else {
      setTypes(data as VehicleType[]);
    }
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingType(null);
    setFormName('');
    setFormDescription('');
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (type: VehicleType) => {
    setEditingType(type);
    setFormName(type.name);
    setFormDescription(type.description || '');
    setFormActive(type.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);

    if (editingType) {
      const { error } = await supabase
        .from('vehicle_types')
        .update({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_active: formActive,
        })
        .eq('id', editingType.id);

      if (error) {
        toast.error('Failed to update vehicle type');
      } else {
        toast.success('Vehicle type updated');
        setDialogOpen(false);
        fetchTypes();
      }
    } else {
      const { error } = await supabase
        .from('vehicle_types')
        .insert({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_active: formActive,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A vehicle type with this name already exists');
        } else {
          toast.error('Failed to add vehicle type');
        }
      } else {
        toast.success('Vehicle type added');
        setDialogOpen(false);
        fetchTypes();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (type: VehicleType) => {
    if (!confirm(`Delete "${type.name}"?`)) return;

    const { error } = await supabase
      .from('vehicle_types')
      .delete()
      .eq('id', type.id);

    if (error) {
      toast.error('Failed to delete vehicle type');
    } else {
      toast.success('Vehicle type deleted');
      fetchTypes();
    }
  };

  const handleToggleActive = async (type: VehicleType) => {
    const { error } = await supabase
      .from('vehicle_types')
      .update({ is_active: !type.is_active })
      .eq('id', type.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      fetchTypes();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Vehicle Types
            </h1>
            <p className="text-muted-foreground">
              Manage vehicle type categories used during registration
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle Type
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : types.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No vehicle types found
                    </TableCell>
                  </TableRow>
                ) : (
                  types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-muted-foreground">{type.description || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          className={type.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 cursor-pointer'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20 cursor-pointer'}
                          onClick={() => handleToggleActive(type)}
                        >
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(type)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Vehicle Type' : 'Add Vehicle Type'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type-name">Name *</Label>
                <Input
                  id="type-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., 20 Feet Container"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-desc">Description</Label>
                <Input
                  id="type-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingType ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
