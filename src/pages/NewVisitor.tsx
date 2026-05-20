import { useState, useEffect } from 'react';
import { startOfToday } from 'date-fns';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Building2, Laptop, Phone, Mail, MessageCircle, Users, Plus, Trash2, Smartphone, Car, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, safeRandomId } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { Department, Employee, Gate } from '@/types/database';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HostCombobox } from '@/components/visitors/HostCombobox';

const visitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  company: z.string().optional(),
  purpose: z.string().optional(),
  host_id: z.string().optional(),
  department_id: z.string().optional(),
  gate_id: z.string().optional(),
  vehicle_type: z.string().default('by_walk'),
  vehicle_number: z.string().optional(),
  has_laptop: z.boolean().default(false),
  laptop_brand: z.string().optional(),
  laptop_serial: z.string().optional(),
  has_mobile: z.boolean().default(false),
  mobile_brand: z.string().optional(),
  mobile_serial: z.string().optional(),
  accompanying_count: z.number().min(0).max(50).default(0),
  scheduled_date: z.date({ required_error: 'Date of visit is required' }).refine(
    (date) => date >= startOfToday(),
    { message: 'Date of visit cannot be in the past' }
  ),
  govt_id_number: z.string().trim().min(1, "Government ID is required"),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

interface AccompanyingPerson {
  name: string;
  phone: string;
  has_laptop: boolean;
  laptop_brand: string;
  laptop_serial: string;
  has_mobile: boolean;
  mobile_brand: string;
  mobile_serial: string;
}

interface NewVisitorProps {
  inline?: boolean;
  onClose?: () => void;
}

export default function NewVisitor({ inline = false, onClose }: NewVisitorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedLocationId, isAllLocations } = useSelectedLocation();
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [accompanyingPersons, setAccompanyingPersons] = useState<AccompanyingPerson[]>([]);

  const form = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      purpose: '',
      vehicle_type: 'by_walk',
      vehicle_number: '',
      has_laptop: false,
      laptop_brand: '',
      laptop_serial: '',
      has_mobile: false,
      mobile_brand: '',
      mobile_serial: '',
      accompanying_count: 0,
      scheduled_date: new Date(),
    },
  });

  const hasLaptop = form.watch('has_laptop');
  const hasMobile = form.watch('has_mobile');
  const vehicleType = form.watch('vehicle_type');
  const phoneValue = form.watch('phone');
  const [returningInfo, setReturningInfo] = useState<{ visit_count: number } | null>(null);

  // Auto-fill from frequent_visitors table when phone is entered
  useEffect(() => {
    const digits = (phoneValue || '').replace(/\D/g, '');
    if (digits.length < 10) {
      setReturningInfo(null);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('frequent_visitors')
        .select('name, email, company, govt_id_number, visit_count, phone')
        .eq('phone', phoneValue)
        .maybeSingle();
      if (!data) {
        setReturningInfo(null);
        return;
      }
      const fillIfEmpty = (field: 'name' | 'email' | 'company' | 'govt_id_number', value: string | null) => {
        if (!value) return;
        const current = (form.getValues(field) || '').toString().trim();
        if (!current) form.setValue(field, value, { shouldValidate: true, shouldDirty: true });
      };
      fillIfEmpty('name', data.name);
      fillIfEmpty('email', data.email);
      fillIfEmpty('company', data.company);
      fillIfEmpty('govt_id_number', data.govt_id_number);
      setReturningInfo({ visit_count: data.visit_count });
      toast.success(`Returning visitor — details auto-filled (${data.visit_count} previous visits)`);
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneValue]);

  useEffect(() => {
    fetchFormData();
    // Reset location-scoped selections when location changes
    form.setValue('host_id', '');
    form.setValue('department_id', '');
    form.setValue('gate_id', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, isAllLocations]);

  const fetchFormData = async () => {
    let deptQuery: any = supabase.from('departments').select('*').order('name');
    let empQuery: any = supabase.from('employees').select('*, department:departments(*)').eq('is_host', true).order('name');
    let gateQuery: any = supabase.from('gates').select('*').eq('status', 'active').order('name');

    if (!isAllLocations && selectedLocationId) {
      deptQuery = deptQuery.eq('location_id', selectedLocationId);
      empQuery = empQuery.eq('location_id', selectedLocationId);
      gateQuery = gateQuery.eq('location_id', selectedLocationId);
    }

    const [deptRes, empRes, gateRes] = await Promise.all([deptQuery, empQuery, gateQuery]);

    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (empRes.data) setEmployees(empRes.data as unknown as Employee[]);
    if (gateRes.data) setGates(gateRes.data as Gate[]);
  };

  const onSubmit = async (data: VisitorFormData) => {
    setLoading(true);

    const { data: insertedVisitor, error } = await supabase.from('visitors').insert([{
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      purpose: data.purpose || null,
      host_id: data.host_id || null,
      department_id: data.department_id || null,
      gate_id: data.gate_id || null,
      vehicle_type: data.vehicle_type || 'by_walk',
      vehicle_number: (data.vehicle_type && data.vehicle_type !== 'by_walk') ? data.vehicle_number || null : null,
      has_laptop: data.has_laptop,
      laptop_brand: data.has_laptop ? data.laptop_brand : null,
      laptop_serial: data.has_laptop ? data.laptop_serial : null,
      has_mobile: data.has_mobile,
      mobile_brand: data.has_mobile ? data.mobile_brand : null,
      mobile_serial: data.has_mobile ? data.mobile_serial : null,
      accompanying_count: data.accompanying_count || 0,
      scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      govt_id_number: data.govt_id_number || null,
      status: 'pending_approval' as const,
      created_by_user_id: user?.id || null,
    }] as any).select('id, visitor_id').single();

    if (error) {
      setLoading(false);
      toast.error('Failed to register visitor');
      return;
    }

    // Save accompanying visitors
    if (accompanyingPersons.length > 0 && insertedVisitor) {
      const accompanyingData = accompanyingPersons
        .filter(p => p.name.trim())
        .map(p => ({
          visitor_id: insertedVisitor.id,
          name: p.name,
          phone: p.phone || null,
          has_laptop: p.has_laptop,
          laptop_brand: p.has_laptop ? p.laptop_brand || null : null,
          laptop_serial: p.has_laptop ? p.laptop_serial || null : null,
          has_mobile: p.has_mobile,
          mobile_brand: p.has_mobile ? p.mobile_brand || null : null,
          mobile_serial: p.has_mobile ? p.mobile_serial || null : null,
        }));

      if (accompanyingData.length > 0) {
        await supabase.from('accompanying_visitors').insert(accompanyingData);
      }
    }

    // Notify host for approval via WhatsApp (same flow as self-service)
    if (insertedVisitor && data.host_id) {
      try {
        const { error: notifyError } = await supabase.functions.invoke('notify-host', {
          body: { visitorId: insertedVisitor.id }
        });
        if (notifyError) {
          console.error('Host notification error:', notifyError);
          toast.warning('Visitor registered but host notification failed');
        } else {
          toast.success('Visitor registered — pending host approval. Host has been notified! 📱');
        }
      } catch (err) {
        console.error('Host notify error:', err);
        toast.warning('Visitor registered but host notification failed');
      }
    } else {
      toast.success('Visitor registered — pending host approval');
    }

    setLoading(false);
    if (inline && onClose) {
      onClose();
    } else {
      navigate('/visitors');
    }
  };

  return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        {!inline && (
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
        )}

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
              <div className="space-y-2">
                <Label>Date of Visit *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('scheduled_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('scheduled_date') ? format(form.watch('scheduled_date')!, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('scheduled_date')}
                      onSelect={(date) => form.setValue('scheduled_date', date || new Date(), { shouldValidate: true })}
                      disabled={(date) => date < startOfToday()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.scheduled_date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.scheduled_date.message}
                  </p>
                )}
              </div>
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
                  <Label htmlFor="email">Email *</Label>
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
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      className="pl-10"
                      {...form.register('phone')}
                    />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                  {returningInfo && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ Returning visitor ({returningInfo.visit_count} previous visits) — details auto-filled
                    </p>
                  )}
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
              <div className="space-y-2">
                <Label htmlFor="govt_id_number">Government Photo ID *</Label>
                <Input
                  id="govt_id_number"
                  placeholder="Enter ID number"
                  {...form.register('govt_id_number')}
                />
                {form.formState.errors.govt_id_number && (
                  <p className="text-sm text-destructive">{form.formState.errors.govt_id_number.message}</p>
                )}
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

              {/* Accompanying Visitors */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium">Accompanying Visitors</Label>
                      <p className="text-xs text-muted-foreground">
                        Additional people with the main visitor
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccompanyingPersons([...accompanyingPersons, { name: '', phone: '', has_laptop: false, laptop_brand: '', laptop_serial: '', has_mobile: false, mobile_brand: '', mobile_serial: '' }]);
                      form.setValue('accompanying_count', accompanyingPersons.length + 1);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Person
                  </Button>
                </div>
                
                {accompanyingPersons.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {accompanyingPersons.map((person, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Person {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const updated = accompanyingPersons.filter((_, i) => i !== index);
                              setAccompanyingPersons(updated);
                              form.setValue('accompanying_count', updated.length);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name *</Label>
                            <Input
                              placeholder="Full name"
                              value={person.name}
                              onChange={(e) => {
                                const updated = [...accompanyingPersons];
                                updated[index].name = e.target.value;
                                setAccompanyingPersons(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input
                              placeholder="+91 98765 43210"
                              value={person.phone}
                              onChange={(e) => {
                                const updated = [...accompanyingPersons];
                                updated[index].phone = e.target.value;
                                setAccompanyingPersons(updated);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={person.has_laptop}
                            onCheckedChange={(checked) => {
                              const updated = [...accompanyingPersons];
                              updated[index].has_laptop = checked;
                              setAccompanyingPersons(updated);
                            }}
                          />
                          <Label className="text-xs">Has Laptop</Label>
                        </div>
                        {person.has_laptop && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Laptop Brand</Label>
                              <Input
                                placeholder="Dell XPS 15"
                                value={person.laptop_brand}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  updated[index].laptop_brand = e.target.value;
                                  setAccompanyingPersons(updated);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Serial Number</Label>
                              <Input
                                placeholder="SN-12345"
                                value={person.laptop_serial}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  updated[index].laptop_serial = e.target.value;
                                  setAccompanyingPersons(updated);
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Mobile for accompanying person */}
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={person.has_mobile}
                            onCheckedChange={(checked) => {
                              const updated = [...accompanyingPersons];
                              updated[index].has_mobile = checked;
                              setAccompanyingPersons(updated);
                            }}
                          />
                          <Label className="text-xs">Has Mobile</Label>
                        </div>
                        {person.has_mobile && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Mobile Brand</Label>
                              <Input
                                placeholder="iPhone 15"
                                value={person.mobile_brand}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  updated[index].mobile_brand = e.target.value;
                                  setAccompanyingPersons(updated);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">IMEI / Serial</Label>
                              <Input
                                placeholder="35-123456-789012-3"
                                value={person.mobile_serial}
                                onChange={(e) => {
                                  const updated = [...accompanyingPersons];
                                  updated[index].mobile_serial = e.target.value;
                                  setAccompanyingPersons(updated);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {accompanyingPersons.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">
                      Total: {1 + accompanyingPersons.length}
                    </span>
                    {' '}visitor(s)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
              <CardDescription>
                How is the visitor arriving?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode of Transport *</Label>
                  <Select
                    value={vehicleType}
                    onValueChange={(value) => form.setValue('vehicle_type', value)}
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
                {vehicleType && vehicleType !== 'by_walk' && (
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_number">Vehicle Number</Label>
                    <Input
                      id="vehicle_number"
                      placeholder="e.g. KA-01-AB-1234"
                      {...form.register('vehicle_number')}
                    />
                  </div>
                )}
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
                  <HostCombobox
                    value={form.watch('host_id') || ''}
                    options={employees as any}
                    onChange={(id, opt) => {
                      form.setValue('host_id', id);
                      if (opt?.department?.id) {
                        form.setValue('department_id', opt.department.id);
                      }
                    }}
                    onClear={() => {
                      form.setValue('host_id', '');
                      form.setValue('department_id', '');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={form.watch('department_id')}
                    onValueChange={(value) => form.setValue('department_id', value)}
                    disabled={!!form.watch('host_id')}
                  >
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
                          {gate.name}{gate.building ? ` — ${gate.building}` : ''}
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

          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5" />
                Device Information
              </CardTitle>
              <CardDescription>
                Register laptops and mobile devices the visitor is carrying
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Laptop */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={hasLaptop}
                    onCheckedChange={(checked) => form.setValue('has_laptop', checked)}
                  />
                  <Label className="flex items-center gap-2">
                    <Laptop className="h-4 w-4" /> Visitor has a laptop
                  </Label>
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
              </div>

              <div className="border-t" />

              {/* Mobile */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={hasMobile}
                    onCheckedChange={(checked) => form.setValue('has_mobile', checked)}
                  />
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Visitor has a mobile device
                  </Label>
                </div>
                {hasMobile && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile_brand">Mobile Brand/Model</Label>
                      <Input
                        id="mobile_brand"
                        placeholder="iPhone 15 Pro"
                        {...form.register('mobile_brand')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile_serial">IMEI / Serial Number</Label>
                      <Input
                        id="mobile_serial"
                        placeholder="35-123456-789012-3"
                        {...form.register('mobile_serial')}
                      />
                    </div>
                  </div>
                )}
              </div>
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
  );
}
