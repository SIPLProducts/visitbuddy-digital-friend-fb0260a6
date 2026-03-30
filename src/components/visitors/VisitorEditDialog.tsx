import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Visitor } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface VisitorEditDialogProps {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

interface Employee {
  id: string;
  name: string;
  department?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

export function VisitorEditDialog({ visitor, open, onOpenChange, onSave }: VisitorEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    purpose: '',
    host_id: '',
    department_id: '',
    vehicle_type: 'by_walk',
    vehicle_number: '',
    has_laptop: false,
    laptop_brand: '',
    laptop_serial: '',
    has_mobile: false,
    mobile_brand: '',
    mobile_serial: '',
    accompanying_count: 0,
  });

  useEffect(() => {
    if (visitor) {
      setFormData({
        name: visitor.name || '',
        email: visitor.email || '',
        phone: visitor.phone || '',
        company: visitor.company || '',
        purpose: visitor.purpose || '',
        host_id: visitor.host_id || '',
        department_id: visitor.department_id || '',
        vehicle_type: visitor.vehicle_type || 'by_walk',
        vehicle_number: visitor.vehicle_number || '',
        has_laptop: visitor.has_laptop || false,
        laptop_brand: visitor.laptop_brand || '',
        laptop_serial: visitor.laptop_serial || '',
        has_mobile: (visitor as any).has_mobile || false,
        mobile_brand: (visitor as any).mobile_brand || '',
        mobile_serial: (visitor as any).mobile_serial || '',
        accompanying_count: visitor.accompanying_count || 0,
      });
    }
  }, [visitor]);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, department:departments(id, name)')
      .eq('is_host', true)
      .order('name');
    if (data) setEmployees(data as Employee[]);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .order('name');
    if (data) setDepartments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitor) return;

    setLoading(true);
    const { error } = await supabase
      .from('visitors')
      .update({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        purpose: formData.purpose || null,
        host_id: formData.host_id || null,
        department_id: formData.department_id || null,
        vehicle_type: formData.vehicle_type || 'by_walk',
        vehicle_number: (formData.vehicle_type && formData.vehicle_type !== 'by_walk') ? formData.vehicle_number || null : null,
        has_laptop: formData.has_laptop,
        laptop_brand: formData.has_laptop ? formData.laptop_brand : null,
        laptop_serial: formData.has_laptop ? formData.laptop_serial : null,
        has_mobile: formData.has_mobile,
        mobile_brand: formData.has_mobile ? formData.mobile_brand : null,
        mobile_serial: formData.has_mobile ? formData.mobile_serial : null,
        accompanying_count: formData.accompanying_count,
      })
      .eq('id', visitor.id);

    setLoading(false);

    if (error) {
      toast.error('Failed to update visitor');
      console.error(error);
    } else {
      toast.success('Visitor updated successfully');
      onOpenChange(false);
      onSave();
    }
  };

  if (!visitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Visitor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="host">Host</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.host_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, host_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select host" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.department ? `(${emp.department.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.host_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setFormData({ ...formData, host_id: '' })}
                    title="Clear host"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.department_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.department_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setFormData({ ...formData, department_id: '' })}
                    title="Clear department"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="accompanying">Accompanying Persons</Label>
              <Input
                id="accompanying"
                type="number"
                min="0"
                value={formData.accompanying_count}
                onChange={(e) => setFormData({ ...formData, accompanying_count: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Vehicle Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_type">Mode of Transport</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_walk">By Walk</SelectItem>
                    <SelectItem value="two_wheeler">Two Wheeler</SelectItem>
                    <SelectItem value="four_wheeler">Four Wheeler</SelectItem>
                    <SelectItem value="cab">Cab / Taxi</SelectItem>
                    <SelectItem value="auto">Auto Rickshaw</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.vehicle_type && formData.vehicle_type !== 'by_walk' && (
                <div>
                  <Label htmlFor="vehicle_number">Vehicle Number</Label>
                  <Input
                    id="vehicle_number"
                    placeholder="e.g. KA-01-AB-1234"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Laptop Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="has_laptop">Has Laptop</Label>
              <Switch
                id="has_laptop"
                checked={formData.has_laptop}
                onCheckedChange={(checked) => setFormData({ ...formData, has_laptop: checked })}
              />
            </div>
            
            {formData.has_laptop && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="laptop_brand">Laptop Brand</Label>
                  <Input
                    id="laptop_brand"
                    value={formData.laptop_brand}
                    onChange={(e) => setFormData({ ...formData, laptop_brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="laptop_serial">Serial Number</Label>
                  <Input
                    id="laptop_serial"
                    value={formData.laptop_serial}
                    onChange={(e) => setFormData({ ...formData, laptop_serial: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mobile Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="has_mobile">Has Mobile Device</Label>
              <Switch
                id="has_mobile"
                checked={formData.has_mobile}
                onCheckedChange={(checked) => setFormData({ ...formData, has_mobile: checked })}
              />
            </div>
            
            {formData.has_mobile && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile_brand">Mobile Brand/Model</Label>
                  <Input
                    id="mobile_brand"
                    value={formData.mobile_brand}
                    onChange={(e) => setFormData({ ...formData, mobile_brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_serial">IMEI / Serial Number</Label>
                  <Input
                    id="mobile_serial"
                    value={formData.mobile_serial}
                    onChange={(e) => setFormData({ ...formData, mobile_serial: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
