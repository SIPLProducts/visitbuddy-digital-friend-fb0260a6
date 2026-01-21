import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Building2, Search, Plus, Users, MapPin, Edit, Trash2, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Department, Employee, Location } from '@/types/database';
import { toast } from 'sonner';
import { CsvImportResult, ImportResult, ImportError, validateRequired } from '@/components/shared/CsvImportResult';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    location_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [deptRes, empRes, locRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('employees').select('*, department:departments(*)').order('name'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
    if (locRes.data) setLocations(locRes.data as Location[]);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', location: '', location_id: '' });
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Please enter department name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('departments').insert({
      name: formData.name,
      description: formData.description || null,
      location: formData.location || null,
      location_id: formData.location_id || null,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to add department');
    } else {
      toast.success('Department added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleEdit = async () => {
    if (!selectedDepartment || !formData.name) return;

    setLoading(true);
    const { error } = await supabase
      .from('departments')
      .update({
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        location_id: formData.location_id || null,
      })
      .eq('id', selectedDepartment.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to update department');
    } else {
      toast.success('Department updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    setLoading(true);
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', selectedDepartment.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to delete department');
    } else {
      toast.success('Department deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
      fetchData();
    }
  };

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      location: dept.location || '',
      location_id: (dept as any).location_id || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDeleteDialogOpen(true);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Description', 'Location Name'];
    const sampleRows = [
      ['Engineering', 'Software development team', 'Corporate HQ'],
      ['Human Resources', 'HR and recruitment', 'Tech Center'],
      ['Finance', 'Accounting and finance', 'Corporate HQ'],
    ];
    const csv = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'departments-upload-template.csv';
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
    const departmentsToInsert: any[] = [];
    
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
        
        // Check location exists
        const locationName = values[2]?.toLowerCase();
        const matchedLocation = locations.find(l => l.name.toLowerCase() === locationName);
        if (values[2] && !matchedLocation) {
          errors.push({ row: rowNum, field: 'Location', message: `Location "${values[2]}" not found. Please add the location first.`, value: values[2] });
        }
        
        departmentsToInsert.push({
          name: values[0],
          description: values[1] || null,
          location: matchedLocation?.name || null,
          location_id: matchedLocation?.id || null,
        });
      }
      
      let successCount = 0;
      let failedCount = errors.filter(e => e.field === 'Name').length;
      
      if (departmentsToInsert.length > 0) {
        const { error, data } = await supabase.from('departments').insert(departmentsToInsert).select();
        if (error) {
          errors.push({ row: 0, field: 'Database', message: error.message });
          failedCount = departmentsToInsert.length;
        } else {
          successCount = data?.length || departmentsToInsert.length;
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
        toast.success(`Imported ${successCount} departments`);
      }
    } catch (err) {
      toast.error('Failed to parse CSV file');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDepartmentEmployees = (deptId: string) => {
    return employees.filter((e) => e.department_id === deptId);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground">Manage departments and their employees</p>
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
              Add Department
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No departments found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                Add Your First Department
              </Button>
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const deptEmployees = getDepartmentEmployees(dept.id);
              const hosts = deptEmployees.filter((e) => e.is_host);

              return (
                <Card key={dept.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {deptEmployees.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {dept.location || 'No location set'}
                    </div>

                    {hosts[0] && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(hosts[0].name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{hosts[0].name}</p>
                          <p className="text-xs text-muted-foreground">{hosts[0].position || 'Department Host'}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Host</Badge>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Employees</p>
                      <div className="space-y-2">
                        {deptEmployees.slice(0, 3).map((emp) => (
                          <div key={emp.id} className="flex items-center gap-2 text-sm">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(emp.name)}</AvatarFallback>
                            </Avatar>
                            <span>{emp.name}</span>
                            {emp.is_host && <Badge variant="outline" className="text-xs">Host</Badge>}
                          </div>
                        ))}
                        {deptEmployees.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{deptEmployees.length - 3} more</p>
                        )}
                        {deptEmployees.length === 0 && (
                          <p className="text-sm text-muted-foreground">No employees</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditDialog(dept)}>
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openDeleteDialog(dept)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                placeholder="e.g., Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => {
                  const loc = locations.find(l => l.id === value);
                  setFormData({ ...formData, location_id: value, location: loc?.name || '' });
                }}
              >
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? 'Adding...' : 'Add Department'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => {
                  const loc = locations.find(l => l.id === value);
                  setFormData({ ...formData, location_id: value, location: loc?.name || '' });
                }}
              >
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
          </div>
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
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"? This action cannot be undone.
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
        entityName="Departments"
      />
    </MainLayout>
  );
}
