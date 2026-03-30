import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Building2, Phone, Mail, Briefcase, Users, Laptop, Camera, CheckCircle2, ArrowRight, ArrowLeft, Shield, Car } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';
import { CameraCapture } from '@/components/checkin/CameraCapture';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  department_id: string | null;
}

interface Gate {
  id: string;
  name: string;
}

export default function SelfService() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    purpose: '',
    departmentId: '',
    hostId: '',
    vehicleType: 'by_walk',
    vehicleNumber: '',
    hasLaptop: false,
    laptopBrand: '',
    laptopSerial: '',
    accompanyingCount: 0,
    photoUrl: '',
  });
  
  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>('');

  useEffect(() => {
    fetchDepartments();
    fetchGates();
    
    // Check for gate ID in URL params
    const gateId = searchParams.get('gate');
    if (gateId) {
      setSelectedGateId(gateId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (formData.departmentId) {
      fetchEmployees(formData.departmentId);
    }
  }, [formData.departmentId]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const fetchEmployees = async (deptId: string) => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, department_id')
      .eq('department_id', deptId)
      .eq('is_host', true)
      .order('name');
    if (data) setEmployees(data);
  };

  const fetchGates = async () => {
    const { data } = await supabase.from('gates').select('id, name').eq('status', 'active').order('name');
    if (data) setGates(data);
  };

  const uploadPhoto = async (blob: Blob): Promise<string | null> => {
    try {
      const fileName = `visitor-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      return null;
    }
  };

  const handlePhotoCapture = async (blob: Blob) => {
    const url = await uploadPhoto(blob);
    if (url) {
      setFormData(prev => ({ ...prev, photoUrl: url }));
      toast.success('Photo captured successfully');
    } else {
      toast.error('Failed to upload photo');
    }
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const insertData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        company: formData.company || null,
        purpose: formData.purpose || null,
        department_id: formData.departmentId || null,
        host_id: formData.hostId || null,
        gate_id: selectedGateId || null,
        vehicle_type: formData.vehicleType || 'by_walk',
        vehicle_number: (formData.vehicleType && formData.vehicleType !== 'by_walk') ? formData.vehicleNumber || null : null,
        has_laptop: formData.hasLaptop,
        laptop_brand: formData.hasLaptop ? formData.laptopBrand : null,
        laptop_serial: formData.hasLaptop ? formData.laptopSerial : null,
        accompanying_count: formData.accompanyingCount,
        photo_url: formData.photoUrl || null,
        status: 'pending_approval',
      };

      const { data, error } = await supabase
        .from('visitors')
        .insert(insertData)
        .select('id, visitor_id')
        .single();

      if (error) throw error;

      setVisitorId(data.visitor_id);
      setIsSuccess(true);
      toast.success('Check-in request submitted! Awaiting host approval.');

      // Notify host if selected
      if (formData.hostId) {
        try {
          await supabase.functions.invoke('notify-host', {
            body: { visitorId: data.id }
          });
        } catch (notifyError) {
          console.log('Host notification skipped:', notifyError);
        }
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit check-in request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-6">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Request Submitted!</h2>
              <p className="text-muted-foreground">Your visitor ID is:</p>
              <p className="text-xl font-mono font-bold text-primary">{visitorId}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <p className="font-medium">⏳ Awaiting Host Approval</p>
              <p className="mt-1">Your host will receive a notification and must approve your visit.</p>
              <p className="mt-1">Once approved, you'll receive your badge via WhatsApp & SMS.</p>
            </div>
            <Button 
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setFormData({
                  name: '', phone: '', email: '', company: '', purpose: '',
                  departmentId: '', hostId: '', hasLaptop: false, laptopBrand: '',
                  laptopSerial: '', accompanyingCount: 0, photoUrl: '',
                });
              }}
              className="w-full"
            >
              Register Another Visitor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={reslLogo} alt="Logo" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="font-semibold text-foreground">VisiGuard</h1>
            <p className="text-xs text-muted-foreground">Visitor Self Check-in</p>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "h-1 w-12 sm:w-16 mx-1",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Enter your details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="Your company name"
                    value={formData.company}
                    onChange={(e) => updateField('company', e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={nextStep}
                disabled={!formData.name || !formData.phone}
                className="w-full h-12 mt-4"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Visit Details */}
        {step === 2 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Visit Details
              </CardTitle>
              <CardDescription>Who are you visiting?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.departmentId} onValueChange={(v) => updateField('departmentId', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.departmentId && (
                <div className="space-y-2">
                  <Label>Host / Person to Meet</Label>
                  <Select value={formData.hostId} onValueChange={(v) => updateField('hostId', v)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select host" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe the purpose of your visit"
                  value={formData.purpose}
                  onChange={(e) => updateField('purpose', e.target.value)}
                  rows={3}
                />
              </div>

              {gates.length > 0 && !selectedGateId && (
                <div className="space-y-2">
                  <Label>Entry Gate</Label>
                  <Select value={selectedGateId} onValueChange={setSelectedGateId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select gate" />
                    </SelectTrigger>
                    <SelectContent>
                      {gates.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-12">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1 h-12">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Additional Info */}
        {step === 3 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Additional Information
              </CardTitle>
              <CardDescription>Optional details for security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30">
                <Checkbox
                  id="hasLaptop"
                  checked={formData.hasLaptop}
                  onCheckedChange={(checked) => updateField('hasLaptop', checked)}
                />
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="hasLaptop" className="cursor-pointer">
                    Carrying a laptop/IT asset
                  </Label>
                </div>
              </div>

              {formData.hasLaptop && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                  <div className="space-y-2">
                    <Label htmlFor="laptopBrand">Laptop Brand</Label>
                    <Input
                      id="laptopBrand"
                      placeholder="e.g., Dell, HP, Lenovo"
                      value={formData.laptopBrand}
                      onChange={(e) => updateField('laptopBrand', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laptopSerial">Serial Number</Label>
                    <Input
                      id="laptopSerial"
                      placeholder="Device serial number"
                      value={formData.laptopSerial}
                      onChange={(e) => updateField('laptopSerial', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="accompanying">Accompanying Persons</Label>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="accompanying"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.accompanyingCount}
                    onChange={(e) => updateField('accompanyingCount', parseInt(e.target.value) || 0)}
                    className="h-12 w-24"
                  />
                  <span className="text-sm text-muted-foreground">person(s)</span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-12">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1 h-12">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Photo & Submit */}
        {step === 4 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" />
                Photo & Confirm
              </CardTitle>
              <CardDescription>Take a photo and submit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo Section */}
              <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg">
                {formData.photoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.photoUrl}
                      alt="Visitor"
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCamera(true)}
                      className="mt-3"
                    >
                      Retake Photo
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <Button onClick={() => setShowCamera(true)} variant="outline">
                      <Camera className="mr-2 h-4 w-4" /> Take Photo
                    </Button>
                  </>
                )}
              </div>

              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <h4 className="font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>Name:</span>
                  <span className="text-foreground font-medium">{formData.name}</span>
                  <span>Phone:</span>
                  <span className="text-foreground">{formData.phone}</span>
                  {formData.company && (
                    <>
                      <span>Company:</span>
                      <span className="text-foreground">{formData.company}</span>
                    </>
                  )}
                  {formData.hasLaptop && (
                    <>
                      <span>Laptop:</span>
                      <span className="text-foreground">{formData.laptopBrand || 'Yes'}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-12">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="flex-1 h-12"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Check-in'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <CameraCapture onCapture={handlePhotoCapture} onCancel={() => setShowCamera(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
