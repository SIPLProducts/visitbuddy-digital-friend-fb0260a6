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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Building2, Laptop, Phone, Mail, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Department, Employee, Gate } from '@/types/database';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const visitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  purpose: z.string().optional(),
  host_id: z.string().optional(),
  department_id: z.string().optional(),
  gate_id: z.string().optional(),
  has_laptop: z.boolean().default(false),
  laptop_brand: z.string().optional(),
  laptop_serial: z.string().optional(),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

export default function NewVisitor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);

  const form = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      purpose: '',
      has_laptop: false,
      laptop_brand: '',
      laptop_serial: '',
    },
  });

  const hasLaptop = form.watch('has_laptop');

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    const [deptRes, empRes, gateRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('employees').select('*, department:departments(*)').eq('is_host', true).order('name'),
      supabase.from('gates').select('*').eq('status', 'active').order('name'),
    ]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
    if (gateRes.data) setGates(gateRes.data as Gate[]);
  };

  // Generate visitor ID client-side (matches the DB trigger pattern)
  const generateVisitorId = () => {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return `VIS-${uuid1.substring(0, 8).toUpperCase()}-${uuid2.substring(0, 4).toUpperCase()}`;
  };

  const onSubmit = async (data: VisitorFormData) => {
    setLoading(true);
    const visitorId = generateVisitorId();
    
    const { error } = await supabase.from('visitors').insert([{
      visitor_id: visitorId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      purpose: data.purpose || null,
      host_id: data.host_id || null,
      department_id: data.department_id || null,
      gate_id: data.gate_id || null,
      has_laptop: data.has_laptop,
      laptop_brand: data.has_laptop ? data.laptop_brand : null,
      laptop_serial: data.has_laptop ? data.laptop_serial : null,
      status: 'scheduled' as const,
    }]);

    if (error) {
      setLoading(false);
      toast.error('Failed to register visitor');
      return;
    }

    // Send WhatsApp badge if enabled and phone number provided
    if (sendWhatsApp && data.phone) {
      try {
        // Get host and department names for the message
        const selectedHost = employees.find(e => e.id === data.host_id);
        const selectedDept = departments.find(d => d.id === data.department_id);
        const selectedGate = gates.find(g => g.id === data.gate_id);

        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-badge', {
          body: {
            visitorName: data.name,
            visitorId: visitorId,
            phone: data.phone,
            company: data.company,
            purpose: data.purpose,
            hostName: selectedHost?.name,
            departmentName: selectedDept?.name,
            gateName: selectedGate?.name,
          }
        });

        if (whatsappError) {
          console.error('WhatsApp error:', whatsappError);
          toast.warning('Visitor registered but WhatsApp message failed to send');
        } else {
          toast.success('Visitor registered & badge sent to WhatsApp! 📱');
        }
      } catch (err) {
        console.error('WhatsApp send error:', err);
        toast.warning('Visitor registered but WhatsApp message failed');
      }
    } else {
      toast.success('Visitor registered successfully');
    }

    setLoading(false);
    navigate('/visitors');
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Pre-Register Visitor
            </h1>
            <p className="text-muted-foreground">
              Add a new visitor to the system
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Basic information about the visitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      className="pl-10"
                      {...form.register('email')}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      className="pl-10"
                      {...form.register('phone')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="TechCorp Inc."
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
                    Send visitor badge via WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    The visitor will receive their digital badge on WhatsApp
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Visit Details
              </CardTitle>
              <CardDescription>
                Information about the visit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Host</Label>
                  <Select onValueChange={(value) => form.setValue('host_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select host" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} - {emp.department?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gate</Label>
                  <Select onValueChange={(value) => form.setValue('gate_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entry gate" />
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
                  placeholder="Meeting, Interview, Delivery, etc."
                  {...form.register('purpose')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Laptop Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5" />
                Laptop Information
              </CardTitle>
              <CardDescription>
                Register any laptops the visitor is carrying
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={hasLaptop}
                  onCheckedChange={(checked) => form.setValue('has_laptop', checked)}
                />
                <Label>Visitor has a laptop</Label>
              </div>
              {hasLaptop && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laptop_brand">Laptop Brand/Model</Label>
                    <Input
                      id="laptop_brand"
                      placeholder="Dell XPS 15"
                      {...form.register('laptop_brand')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laptop_serial">Serial Number</Label>
                    <Input
                      id="laptop_serial"
                      placeholder="DELL-XPS-2024-ABC123"
                      {...form.register('laptop_serial')}
                    />
                  </div>
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
              {loading ? 'Registering...' : 'Register Visitor'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
