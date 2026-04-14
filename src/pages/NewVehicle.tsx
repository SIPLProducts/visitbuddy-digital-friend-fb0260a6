import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Truck, User, Phone, Building2, MessageCircle, IdCard, Car } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Gate, Location, Department, Employee } from '@/types/database';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const vehicleSchema = z.object({
  vehicle_number: z.string().min(4, 'Vehicle number must be at least 4 characters'),
  vehicle_type: z.string().min(1, 'Please select a vehicle type'),
  driver_name: z.string().min(2, 'Driver name must be at least 2 characters'),
  driver_phone: z.string().optional(),
  driver_license: z.string().optional(),
  company: z.string().optional(),
  purpose: z.string().optional(),
  gate_id: z.string().optional(),
  location_id: z.string().optional(),
  department_id: z.string().optional(),
  is_employee_vehicle: z.boolean().default(false),
  employee_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleTypeOption {
  id: string;
  name: string;
}

interface NewVehicleProps {
  inline?: boolean;
  onClose?: () => void;
}

export default function NewVehicle({ inline = false, onClose }: NewVehicleProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [gates, setGates] = useState<Gate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_number: '',
      vehicle_type: 'Truck',
      driver_name: '',
      driver_phone: '',
      driver_license: '',
      company: '',
      purpose: '',
      is_employee_vehicle: false,
    },
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    const [gateRes, locRes, deptRes, empRes, vtRes] = await Promise.all([
      supabase.from('gates').select('*').eq('status', 'active').order('name'),
      supabase.from('locations').select('*').eq('status', 'active').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('employees').select('*, department:departments(id, name)').order('name'),
      supabase.from('vehicle_types').select('id, name').eq('is_active', true).order('name'),
    ]);

    if (gateRes.data) setGates(gateRes.data as Gate[]);
    if (locRes.data) setLocations(locRes.data as Location[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
    if (vtRes.data) setVehicleTypes(vtRes.data as VehicleTypeOption[]);
  };

  const generateVehicleId = () => {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return `VEH-${uuid1.substring(0, 8).toUpperCase()}-${uuid2.substring(0, 4).toUpperCase()}`;
  };

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    const vehicleId = generateVehicleId();

    const isEmployeeVehicle = data.is_employee_vehicle;
    
    const { error } = await supabase.from('vehicles').insert([{
      vehicle_id: vehicleId,
      vehicle_number: data.vehicle_number.toUpperCase(),
      vehicle_type: data.vehicle_type,
      driver_name: data.driver_name,
      driver_phone: data.driver_phone || null,
      driver_license: data.driver_license || null,
      company: data.company || null,
      purpose: data.purpose || null,
      gate_id: data.gate_id || null,
      location_id: data.location_id || null,
      department_id: data.department_id || null,
      is_employee_vehicle: isEmployeeVehicle,
      employee_id: isEmployeeVehicle ? (data.employee_id || null) : null,
      auto_allow: isEmployeeVehicle,
      status: 'registered',
    }]);

    if (error) {
      setLoading(false);
      toast.error('Failed to register vehicle');
      return;
    }

    // Send WhatsApp badge if enabled and phone number provided
    if (sendWhatsApp && data.driver_phone) {
      try {
        const selectedGate = gates.find(g => g.id === data.gate_id);
        const selectedLocation = locations.find(l => l.id === data.location_id);

        const { error: whatsappError } = await supabase.functions.invoke('send-vehicle-whatsapp', {
          body: {
            vehicleNumber: data.vehicle_number.toUpperCase(),
            vehicleId: vehicleId,
            vehicleType: data.vehicle_type,
            driverName: data.driver_name,
            phone: data.driver_phone,
            company: data.company,
            purpose: data.purpose,
            gateName: selectedGate?.name,
            locationName: selectedLocation?.name,
          }
        });

        if (whatsappError) {
          console.error('WhatsApp error:', whatsappError);
          toast.warning('Vehicle registered but WhatsApp message failed to send');
        } else {
          toast.success('Vehicle registered & pass sent to WhatsApp! 📱');
        }
      } catch (err) {
        console.error('WhatsApp send error:', err);
        toast.warning('Vehicle registered but WhatsApp message failed');
      }
    } else {
      toast.success('Vehicle registered successfully');
    }

    setLoading(false);
    if (inline && onClose) {
      onClose();
    } else {
      navigate('/vehicles');
    }
  };

  return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        {!inline && (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Register Vehicle
              </h1>
              <p className="text-muted-foreground">
                Add a new commercial vehicle to the system
              </p>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
              <CardDescription>
                Basic details about the vehicle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                  <Input
                    id="vehicle_number"
                    placeholder="KA-01-AB-1234"
                    className="uppercase"
                    {...form.register('vehicle_number')}
                  />
                  {form.formState.errors.vehicle_number && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.vehicle_number.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Type *</Label>
                  <Select
                    defaultValue="Truck"
                    onValueChange={(value) => form.setValue('vehicle_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Driver Information
              </CardTitle>
              <CardDescription>
                Details about the driver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driver_name">Driver Name *</Label>
                  <Input
                    id="driver_name"
                    placeholder="John Doe"
                    {...form.register('driver_name')}
                  />
                  {form.formState.errors.driver_name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.driver_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver_phone">Driver Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="driver_phone"
                      placeholder="+91 98765 43210"
                      className="pl-10"
                      {...form.register('driver_phone')}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driver_license">Driving License No.</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="driver_license"
                      placeholder="DL-1234567890"
                      className="pl-10"
                      {...form.register('driver_license')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Transport Company Ltd."
                      className="pl-10"
                      {...form.register('company')}
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Badge Option */}
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-accent/50 border border-accent">
                <Checkbox 
                  id="send-whatsapp" 
                  checked={sendWhatsApp}
                  onCheckedChange={(checked) => setSendWhatsApp(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="send-whatsapp" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    Send vehicle pass via WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The driver will receive a digital pass with QR code on WhatsApp
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entry Details */}
          <Card>
            <CardHeader>
              <CardTitle>Entry Details</CardTitle>
              <CardDescription>
                Assign location and gate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select onValueChange={(value) => form.setValue('location_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gate</Label>
                  <Select onValueChange={(value) => form.setValue('gate_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gate" />
                    </SelectTrigger>
                    <SelectContent>
                      {gates.map((gate) => (
                        <SelectItem key={gate.id} value={gate.id}>
                          {gate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select onValueChange={(value) => form.setValue('department_id', value)}>
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Textarea
                  id="purpose"
                  placeholder="Delivery, pickup, service, etc."
                  {...form.register('purpose')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Employee Vehicle
              </CardTitle>
              <CardDescription>
                Mark as employee vehicle for auto-allow entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={form.watch('is_employee_vehicle')}
                  onCheckedChange={(checked) => {
                    form.setValue('is_employee_vehicle', checked);
                    if (!checked) form.setValue('employee_id', undefined);
                  }}
                />
                <Label>This is an employee vehicle (auto-allow at gate)</Label>
              </div>
              {form.watch('is_employee_vehicle') && (
                <div className="space-y-2">
                  <Label>Link to Employee</Label>
                  <Select onValueChange={(value) => form.setValue('employee_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} {emp.department ? `(${emp.department.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </div>
  );
}
