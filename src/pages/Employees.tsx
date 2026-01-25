import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserRound, Search, Plus, Building2, MapPin, Edit, Trash2, Upload, Download, Users, UserCheck, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Department, Location } from '@/types/database';
import { toast } from 'sonner';
import { CsvImportResult, ImportResult, ImportError, validateRequired, validateEmail } from '@/components/shared/CsvImportResult';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState({
    totalEmployees: 0,
    hosts: 0,
    departments: 0,
    locations: 0,
  });
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    position: '',
    department_id: '',
    location_id: '',
    is_host: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [empRes, deptRes, locRes] = await Promise.all([
      supabase.from('employees').select('*, department:departments(*), location:locations(*)').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (empRes.data) {
      const typedData = empRes.data as unknown as Employee[];
      setEmployees(typedData);
      
      const uniqueDepts = new Set(typedData.map(e => e.department_id).filter(Boolean));
      const uniqueLocs = new Set(typedData.map(e => e.location_id).filter(Boolean));
      
      setStats({
        totalEmployees: typedData.length,
        hosts: typedData.filter(e => e.is_host).length,
        departments: uniqueDepts.size,
        locations: uniqueLocs.size,
      });
    }
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (locRes.data) setLocations(locRes.data as Location[]);
  };

  const generateEmployeeId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'EMP-';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const resetForm = () => {
    setFormData({
      employee_id: generateEmployeeId(),
      name: '',
      email: '',
      phone: '',
      position: '',
      department_id: '',
      location_id: '',
      is_host: true,
    });
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Please enter employee name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('employees').insert({
      employee_id: formData.employee_id || generateEmployeeId(),
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      position: formData.position || null,
      department_id: formData.department_id || null,
      location_id: formData.location_id || null,
      is_host: formData.is_host,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to add employee: ' + error.message);
    } else {
      toast.success('Employee added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleEdit = async () => {
    if (!selectedEmployee || !formData.name) return;

    setLoading(true);
    const { error } = await supabase
      .from('employees')
      .update({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        position: formData.position || null,
        department_id: formData.department_id || null,
        location_id: formData.location_id || null,
        is_host: formData.is_host,
      })
      .eq('id', selectedEmployee.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to update employee');
    } else {
      toast.success('Employee updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', selectedEmployee.id);

    setLoading(false);
    if (error) {
      toast.error('Failed to delete employee');
    } else {
      toast.success('Employee deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchData();
    }
  };

  const openEditDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email || '',
      phone: (emp as any).phone || '',
      position: emp.position || '',
      department_id: emp.department_id || '',
      location_id: emp.location_id || '',
      is_host: emp.is_host,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteDialogOpen(true);
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Position', 'Department Name', 'Location Name', 'Is Host (yes/no)'];
    const sampleRows = [
      ['EMP-001', 'John Doe', 'john@company.com', '+919876543210', 'Software Engineer', 'Engineering', 'Corporate HQ', 'yes'],
      ['EMP-002', 'Jane Smith', 'jane@company.com', '+919876543211', 'HR Manager', 'Human Resources', 'Tech Center', 'yes'],
      ['EMP-003', 'Bob Wilson', 'bob@company.com', '', 'Accountant', 'Finance', 'Corporate HQ', 'no'],
    ];
    const csv = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees-upload-template.csv';
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
    const employeesToInsert: any[] = [];
    
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
        const nameError = validateRequired(values[1], 'Name');
        if (nameError) {
          errors.push({ row: rowNum, field: 'Name', message: nameError, value: values[1] });
          continue;
        }
        
        // Validate email if provided
        const emailError = validateEmail(values[2]);
        if (emailError) {
          errors.push({ row: rowNum, field: 'Email', message: emailError, value: values[2] });
        }
        
        // Match department (column index shifted due to phone field)
        const deptName = values[5]?.toLowerCase();
        const matchedDept = departments.find(d => d.name.toLowerCase() === deptName);
        if (values[5] && !matchedDept) {
          errors.push({ row: rowNum, field: 'Department', message: `Department "${values[5]}" not found`, value: values[5] });
        }
        
        // Match location
        const locName = values[6]?.toLowerCase();
        const matchedLoc = locations.find(l => l.name.toLowerCase() === locName);
        if (values[6] && !matchedLoc) {
          errors.push({ row: rowNum, field: 'Location', message: `Location "${values[6]}" not found`, value: values[6] });
        }
        
        const isHost = values[7]?.toLowerCase() === 'yes' || values[7]?.toLowerCase() === 'true' || values[7] === '1';
        
        employeesToInsert.push({
          employee_id: values[0] || generateEmployeeId(),
          name: values[1],
          email: emailError ? null : (values[2] || null),
          phone: values[3] || null,
          position: values[4] || null,
          department_id: matchedDept?.id || null,
          location_id: matchedLoc?.id || null,
          is_host: isHost,
        });
      }
      
      let successCount = 0;
      let failedCount = errors.filter(e => e.field === 'Name').length;
      
      if (employeesToInsert.length > 0) {
        const { error, data } = await supabase.from('employees').insert(employeesToInsert).select();
        if (error) {
          errors.push({ row: 0, field: 'Database', message: error.message });
          failedCount = employeesToInsert.length;
        } else {
          successCount = data?.length || employeesToInsert.length;
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
        toast.success(`Imported ${successCount} employees`);
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

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const employeeFormContent = (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employee ID</Label>
          <Input
            placeholder="Auto-generated"
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            placeholder="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="email@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone (for WhatsApp notifications)</Label>
          <Input
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Position</Label>
          <Input
            placeholder="Job title"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={formData.is_host}
            onCheckedChange={(v) => setFormData({ ...formData, is_host: v })}
          />
          <Label>Can host visitors</Label>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalEmployees}</p>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.hosts}</p>
                  <p className="text-sm text-muted-foreground">Visitor Hosts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.departments}</p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.locations}</p>
                  <p className="text-sm text-muted-foreground">Locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">Manage employees who can host visitors</p>
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
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employees Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <UserRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No employees found</p>
                      <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                        Add Your First Employee
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {emp.email && (
                                <>
                                  <Mail className="h-3 w-3" />
                                  {emp.email}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(emp as any).phone ? (
                          <span className="text-sm flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 text-success" />
                            {(emp as any).phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{emp.position || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {emp.department?.name ? (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {emp.department.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.location?.name ? (
                          <span className="text-sm flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {emp.location.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.is_host ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Host
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(emp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(emp)}>
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
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Add a new employee who can host visitors</DialogDescription>
          </DialogHeader>
          {employeeFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? 'Adding...' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details</DialogDescription>
          </DialogHeader>
          {employeeFormContent}
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
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEmployee?.name}"? This action cannot be undone.
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
        entityName="Employees"
      />
    </MainLayout>
  );
}
