import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  DoorOpen,
  Plus,
  QrCode,
  Clock,
  Users,
  Edit,
  Trash2,
  Power,
  Upload,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Gate, Location } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CsvImportResult, ImportResult, ImportError, validateRequired, validateNumber, validateStatus } from '@/components/shared/CsvImportResult';

export default function Gates() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({
    totalGates: 0,
    activeGates: 0,
    qrEnabled: 0,
    currentVisitors: 0,
  });

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    location_id: '',
    gate_type: 'Entry & Exit',
    capacity: 100,
    operating_hours: '06:00 - 22:00',
    has_qr: true,
    status: 'active' as 'active' | 'inactive',
    camera_url: '',
    camera_type: 'snapshot',
    camera_enabled: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [gatesRes, locRes] = await Promise.all([
      supabase.from('gates').select('*, location:locations(*)').order('name'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (gatesRes.data) {
      const typedData = gatesRes.data as Gate[];
      setGates(typedData);

      setStats({
        totalGates: typedData.length,
        activeGates: typedData.filter((g) => g.status === 'active').length,
        qrEnabled: typedData.filter((g) => g.has_qr).length,
        currentVisitors: typedData.reduce((acc, g) => acc + g.current_visitors, 0),
      });
    }
    if (locRes.data) setLocations(locRes.data as Location[]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      building: '',
      location_id: '',
      gate_type: 'Entry & Exit',
      capacity: 100,
      operating_hours: '06:00 - 22:00',
      has_qr: true,
      status: 'active',
      camera_url: '',
      camera_type: 'snapshot',
      camera_enabled: false,
    });
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Please enter gate name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('gates').insert({
      name: formData.name,
      building: formData.building || null,
      location_id: formData.location_id || null,
      gate_type: formData.gate_type,
      capacity: formData.capacity,
      operating_hours: formData.operating_hours,
      has_qr: formData.has_qr,
      status: formData.status,
      camera_url: formData.camera_url || null,
      camera_type: formData.camera_type,
      camera_enabled: formData.camera_enabled,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to add gate');
    } else {
      toast.success('Gate added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleEdit = async () => {
    if (!selectedGate || !formData.name) return;

    setLoading(true);
    const { error } = await supabase
      .from('gates')
      .update({
        name: formData.name,
        building: formData.building || null,
        location_id: formData.location_id || null,
        gate_type: formData.gate_type,
        capacity: formData.capacity,
        operating_hours: formData.operating_hours,
        has_qr: formData.has_qr,
        status: formData.status,
        camera_url: formData.camera_url || null,
        camera_type: formData.camera_type,
        camera_enabled: formData.camera_enabled,
      })
      .eq('id', selectedGate.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to update gate');
    } else {
      toast.success('Gate updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedGate) return;

    setLoading(true);
    const { error } = await supabase.from('gates').delete().eq('id', selectedGate.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to delete gate');
    } else {
      toast.success('Gate deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedGate(null);
      fetchData();
    }
  };

  const toggleGateStatus = async (gate: Gate) => {
    const newStatus = gate.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('gates').update({ status: newStatus }).eq('id', gate.id);

    if (error) {
      toast.error('Failed to update gate status');
    } else {
      toast.success(`Gate ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchData();
    }
  };

  const openEditDialog = (gate: Gate) => {
    setSelectedGate(gate);
    setFormData({
      name: gate.name,
      building: gate.building || '',
      location_id: gate.location_id || '',
      gate_type: gate.gate_type,
      capacity: gate.capacity,
      operating_hours: gate.operating_hours,
      has_qr: gate.has_qr,
      status: gate.status,
      camera_url: gate.camera_url || '',
      camera_type: gate.camera_type || 'snapshot',
      camera_enabled: gate.camera_enabled || false,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (gate: Gate) => {
    setSelectedGate(gate);
    setIsDeleteDialogOpen(true);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Building', 'Location Name', 'Gate Type', 'Capacity', 'Operating Hours', 'QR Enabled', 'Status'];
    const sampleRows = [
      ['Main Entry', 'Building A', 'Corporate HQ', 'Entry & Exit', '100', '06:00 - 22:00', 'yes', 'active'],
      ['Side Gate', 'Building B', 'Tech Center', 'Entry Only', '50', '08:00 - 18:00', 'yes', 'active'],
    ];
    const csv = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gates-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setUploading(true);
    const errors: ImportError[] = [];
    const gatesToInsert: any[] = [];
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        setUploading(false);
        return;
      }
      
      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        // Validate required fields
        const nameError = validateRequired(values[0], 'Name');
        if (nameError) {
          errors.push({ row: rowNum, field: 'Name', message: nameError, value: values[0] });
          continue;
        }
        
        // Validate capacity
        const capacityError = validateNumber(values[4], 'Capacity');
        if (capacityError) {
          errors.push({ row: rowNum, field: 'Capacity', message: capacityError, value: values[4] });
        }
        
        // Validate status
        const statusError = validateStatus(values[7], ['active', 'inactive']);
        if (statusError) {
          errors.push({ row: rowNum, field: 'Status', message: statusError, value: values[7] });
        }
        
        // Check location exists
        const locationName = values[2]?.toLowerCase();
        const matchedLocation = locations.find(l => l.name.toLowerCase() === locationName);
        if (values[2] && !matchedLocation) {
          errors.push({ row: rowNum, field: 'Location', message: `Location "${values[2]}" not found`, value: values[2] });
        }
        
        // Validate gate type
        const validGateTypes = ['entry & exit', 'entry only', 'exit only'];
        if (values[3] && !validGateTypes.includes(values[3].toLowerCase())) {
          errors.push({ row: rowNum, field: 'Gate Type', message: 'Must be: Entry & Exit, Entry Only, or Exit Only', value: values[3] });
        }
        
        gatesToInsert.push({
          name: values[0],
          building: values[1] || null,
          location_id: matchedLocation?.id || null,
          gate_type: values[3] || 'Entry & Exit',
          capacity: capacityError ? 100 : (parseInt(values[4]) || 100),
          operating_hours: values[5] || '06:00 - 22:00',
          has_qr: values[6]?.toLowerCase() === 'yes' || values[6]?.toLowerCase() === 'true',
          status: (values[7]?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        });
      }
      
      let successCount = 0;
      let failedCount = errors.filter(e => e.field === 'Name').length;
      
      if (gatesToInsert.length > 0) {
        const { error, data } = await supabase.from('gates').insert(gatesToInsert).select();
        if (error) {
          errors.push({ row: 0, field: 'Database', message: error.message });
          failedCount = gatesToInsert.length;
        } else {
          successCount = data?.length || gatesToInsert.length;
          fetchData();
        }
      }
      
      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errors,
      });
      setIsImportResultOpen(true);
      
      if (successCount > 0) {
        toast.success(`Imported ${successCount} gates`);
      }
    } catch (err) {
      toast.error('Failed to parse CSV file');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const GateForm = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gate Name *</Label>
          <Input
            placeholder="e.g., Main Entry"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Building</Label>
          <Input
            placeholder="e.g., Building A"
            value={formData.building}
            onChange={(e) => setFormData({ ...formData, building: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={formData.location_id} onValueChange={(v) => setFormData({ ...formData, location_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gate Type</Label>
          <Select value={formData.gate_type} onValueChange={(v) => setFormData({ ...formData, gate_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Entry & Exit">Entry & Exit</SelectItem>
              <SelectItem value="Entry Only">Entry Only</SelectItem>
              <SelectItem value="Exit Only">Exit Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 100 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Operating Hours</Label>
          <Input
            placeholder="06:00 - 22:00"
            value={formData.operating_hours}
            onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={formData.has_qr} onCheckedChange={(v) => setFormData({ ...formData, has_qr: v })} />
          <Label>QR Code Enabled</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.status === 'active'}
            onCheckedChange={(v) => setFormData({ ...formData, status: v ? 'active' : 'inactive' })}
          />
          <Label>Active</Label>
        </div>
      </div>

      {/* Camera Configuration */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Switch checked={formData.camera_enabled} onCheckedChange={(v) => setFormData({ ...formData, camera_enabled: v })} />
          <Label className="font-medium">Enable Camera</Label>
        </div>
        {formData.camera_enabled && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Camera URL</Label>
              <Input
                placeholder="http://192.168.29.85/cgi-bin/snapshot.cgi"
                value={formData.camera_url}
                onChange={(e) => setFormData({ ...formData, camera_url: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">Enter the HTTP snapshot/MJPEG/HLS URL of your IP camera</p>
            </div>
            <div className="space-y-2">
              <Label>Stream Type</Label>
              <Select value={formData.camera_type} onValueChange={(v) => setFormData({ ...formData, camera_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="snapshot">Snapshot (polling)</SelectItem>
                  <SelectItem value="mjpeg">MJPEG Stream</SelectItem>
                  <SelectItem value="hls">HLS Stream</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
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
              <div className="p-2 rounded-lg bg-[#10b981] text-white">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activeGates}</p>
                <p className="text-sm text-muted-foreground">Active Gates</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#14b8a6] text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.qrEnabled}</p>
                <p className="text-sm text-muted-foreground">QR Enabled</p>
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
            <h1 className="text-2xl font-bold text-foreground">Gates</h1>
            <p className="text-muted-foreground">Manage entry and exit points for your facilities</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
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
              {uploading ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button className="gap-2" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add Gate
            </Button>
          </div>
        </div>

        {/* Gates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <DoorOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No gates configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                Add Your First Gate
              </Button>
            </div>
          ) : (
            gates.map((gate) => {
              const capacityPercent = getCapacityPercentage(gate.current_visitors, gate.capacity);

              return (
                <Card key={gate.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg', gate.status === 'active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-gray-100 text-gray-600')}>
                          <DoorOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{gate.name}</CardTitle>
                          {gate.building && <p className="text-sm text-muted-foreground mt-1">{gate.building}</p>}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(gate.status === 'active' ? 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]/20' : 'bg-gray-100 text-gray-600 border-gray-300/20')}
                      >
                        {gate.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Gate Type & QR */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{gate.gate_type}</Badge>
                      {gate.has_qr && (
                        <Badge variant="outline" className="gap-1">
                          <QrCode className="h-3 w-3" />
                          QR
                        </Badge>
                      )}
                    </div>

                    {/* Capacity */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Capacity</span>
                        <span className="text-sm font-medium">{gate.current_visitors} / {gate.capacity}</span>
                      </div>
                      <Progress
                        value={capacityPercent}
                        className={cn('h-2', capacityPercent > 80 && '[&>div]:bg-amber-500', capacityPercent > 95 && '[&>div]:bg-rose-500')}
                      />
                    </div>

                    {/* Operating Hours */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {gate.operating_hours}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => openEditDialog(gate)}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(gate.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700')}
                        onClick={() => toggleGateStatus(gate)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(gate)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Gate</DialogTitle>
            <DialogDescription>Create a new entry/exit point</DialogDescription>
          </DialogHeader>
          <GateForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? 'Adding...' : 'Add Gate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Gate</DialogTitle>
            <DialogDescription>Update gate details</DialogDescription>
          </DialogHeader>
          <GateForm />
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
            <AlertDialogTitle>Delete Gate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGate?.name}"? This action cannot be undone.
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

      {/* Import Result Dialog */}
      <CsvImportResult
        open={isImportResultOpen}
        onOpenChange={setIsImportResultOpen}
        result={importResult}
        entityName="Gates"
      />
    </MainLayout>
  );
}
