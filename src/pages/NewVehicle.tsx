import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
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
import { ArrowLeft, Truck, User, Phone, Building2, MessageCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Gate, Location } from '@/types/database';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const vehicleSchema = z.object({
  vehicle_number: z.string().min(4, 'Vehicle number must be at least 4 characters'),
  vehicle_type: z.string().min(1, 'Please select a vehicle type'),
  driver_name: z.string().min(2, 'Driver name must be at least 2 characters'),
  driver_phone: z.string().optional(),
  company: z.string().optional(),
  purpose: z.string().optional(),
  gate_id: z.string().optional(),
  location_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const vehicleTypes = ['Truck', 'Van', 'Pickup', 'Trailer', 'Container', 'Tanker', 'Other'];

export default function NewVehicle() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [gates, setGates] = useState<Gate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_number: '',
      vehicle_type: 'Truck',
      driver_name: '',
      driver_phone: '',
      company: '',
      purpose: '',
    },
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    const [gateRes, locRes] = await Promise.all([
      supabase.from('gates').select('*').eq('status', 'active').order('name'),
      supabase.from('locations').select('*').eq('status', 'active').order('name'),
    ]);

    if (gateRes.data) setGates(gateRes.data as Gate[]);
    if (locRes.data) setLocations(locRes.data as Location[]);
  };

  const generateVehicleId = () => {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return `VEH-${uuid1.substring(0, 8).toUpperCase()}-${uuid2.substring(0, 4).toUpperCase()}`;
  };

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    const vehicleId = generateVehicleId();

    const { error } = await supabase.from('vehicles').insert([{
      vehicle_id: vehicleId,
      vehicle_number: data.vehicle_number.toUpperCase(),
      vehicle_type: data.vehicle_type,
      driver_name: data.driver_name,
      driver_phone: data.driver_phone || null,
      company: data.company || null,
      purpose: data.purpose || null,
      gate_id: data.gate_id || null,
      location_id: data.location_id || null,
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
    navigate('/vehicles');
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
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
                        <SelectItem key={type} value={type}>
                          {type}
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
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Textarea
                  id="purpose"
                  placeholder="Delivery, pickup, service, etc."
                  {...form.register('purpose')}
                />
              </div>
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
    </MainLayout>
  );
}
