import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Printer, Laptop, UserCheck, Camera, Bell, Users, CheckCircle2, Clock, RefreshCw, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Location, Employee } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CameraCapture } from '@/components/checkin/CameraCapture';
import { SafetyPermitBadge } from '@/components/badge/SafetyPermitBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface VisitorWithLocation extends Omit<Visitor, 'gate' | 'host'> {
  host?: (Employee & { phone?: string | null }) | null;
  gate?: {
    id: string;
    name?: string;
    location_id: string | null;
    location?: Location;
  } | null;
}

export default function BadgePrinting() {
  const [searchParams] = useSearchParams();
  const badgeRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'checked_in' | 'scheduled' | 'checked_out' | 'all'>('all');
  const [visitors, setVisitors] = useState<VisitorWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithLocation | null>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, [statusFilter]);

  useEffect(() => {
    const visitorId = searchParams.get('visitorId');
    if (visitorId && visitors.length > 0) {
      const visitor = visitors.find((v) => v.id === visitorId);
      if (visitor) {
        setSelectedVisitor(visitor);
      }
    }
  }, [searchParams, visitors]);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('visitors')
        .select(`
          *,
          host:employees(*, department:departments(*)),
          department:departments(*, location:locations!departments_location_id_fkey(*)),
          gate:gates(id, name, location_id, location:locations!gates_location_id_fkey(*))
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching visitors:', error);
        toast.error('Failed to load visitors');
      } else {
        setVisitors((data || []) as unknown as VisitorWithLocation[]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (blob: Blob, visitorId: string): Promise<string | null> => {
    const fileName = `${visitorId}-${Date.now()}.jpg`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('visitor-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('visitor-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handlePhotoCapture = async (blob: Blob) => {
    if (!selectedVisitor) return;

    setIsUploading(true);
    const photoUrl = await uploadPhoto(blob, selectedVisitor.id);
    
    if (photoUrl) {
      const { error } = await supabase
        .from('visitors')
        .update({ photo_url: photoUrl })
        .eq('id', selectedVisitor.id);

      if (error) {
        toast.error('Failed to save photo');
      } else {
        toast.success('Photo captured successfully');
        setSelectedVisitor({ ...selectedVisitor, photo_url: photoUrl });
        fetchVisitors();
      }
    } else {
      toast.error('Failed to upload photo');
    }

    setIsUploading(false);
    setShowCameraDialog(false);
  };

  const handleCheckInAndPrint = async (visitor: VisitorWithLocation) => {
    const { error: checkInError } = await supabase
      .from('visitors')
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      })
      .eq('id', visitor.id);

    if (checkInError) {
      toast.error('Failed to check in visitor');
      return;
    }

    toast.success(`${visitor.name} checked in successfully`);
    window.open(`/print-badge?id=${visitor.id}`, '_blank');
    fetchVisitors();
  };

  const handlePrintBadge = (visitor: VisitorWithLocation) => {
    window.open(`/print-badge?id=${visitor.id}`, '_blank');
    fetchVisitors();
  };

  const handleNotifyHost = async (visitor: VisitorWithLocation) => {
    if (!visitor.host?.phone) {
      toast.error('Host phone number not available');
      return;
    }

    setIsNotifying(true);
    try {
      const { error } = await supabase.functions.invoke('notify-host', {
        body: {
          visitorName: visitor.name,
          visitorId: visitor.visitor_id,
          visitorPhone: visitor.phone,
          visitorCompany: visitor.company,
          purpose: visitor.purpose,
          hostName: visitor.host?.name || 'Host',
          hostPhone: visitor.host?.phone,
          departmentName: visitor.host?.department?.name || visitor.department?.name,
          gateName: visitor.gate?.name,
          photoUrl: visitor.photo_url,
        },
      });

      if (error) throw error;
      toast.success('Host notified via WhatsApp');
    } catch (error: any) {
      console.error('Notify host error:', error);
      toast.error(error.message || 'Failed to notify host');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleSendEmail = async (visitor: VisitorWithLocation) => {
    if (!visitor.email) {
      toast.error('Visitor email not available');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Generate QR code URL
      const qrData = encodeURIComponent(JSON.stringify({
        visitorId: visitor.visitor_id,
        name: visitor.name,
        action: 'checkout',
      }));
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&format=png`;

      const { error } = await supabase.functions.invoke('send-email-badge', {
        body: {
          email: visitor.email,
          visitorName: visitor.name,
          visitorId: visitor.visitor_id,
          company: visitor.company,
          purpose: visitor.purpose,
          hostName: visitor.host?.name,
          departmentName: visitor.host?.department?.name || visitor.department?.name,
          checkInTime: visitor.check_in_time,
          qrCodeUrl,
        },
      });

      if (error) throw error;
      toast.success('Badge sent to email successfully');
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async (visitor: VisitorWithLocation) => {
    if (!visitor.phone) {
      toast.error('Visitor phone number not available');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-badge', {
        body: {
          visitorName: visitor.name,
          visitorId: visitor.visitor_id,
          phone: visitor.phone,
          company: visitor.company,
          purpose: visitor.purpose,
          hostName: visitor.host?.name,
          departmentName: visitor.host?.department?.name || visitor.department?.name,
          gateName: visitor.gate?.name,
        },
      });

      if (error) throw error;
      toast.success('Badge sent via WhatsApp successfully');
    } catch (error: any) {
      console.error('Send WhatsApp error:', error);
      toast.error(error.message || 'Failed to send WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSendSms = async (visitor: VisitorWithLocation) => {
    if (!visitor.phone) {
      toast.error('Visitor phone number not available');
      return;
    }

    setIsSendingSms(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms-badge', {
        body: {
          visitorName: visitor.name,
          visitorId: visitor.visitor_id,
          phone: visitor.phone,
          company: visitor.company,
          purpose: visitor.purpose,
          hostName: visitor.host?.name,
          departmentName: visitor.host?.department?.name || visitor.department?.name,
          gateName: visitor.gate?.name,
        },
      });

      if (error) throw error;
      toast.success('Badge sent via SMS successfully');
    } catch (error: any) {
      console.error('Send SMS error:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setIsSendingSms(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: 'Checked In', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'scheduled':
        return { label: 'Scheduled', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: Clock };
      case 'checked_out':
        return { label: 'Checked Out', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: Users };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Users };
    }
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visitor_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const checkedInCount = visitors.filter(v => v.status === 'checked_in').length;
  const scheduledCount = visitors.filter(v => v.status === 'scheduled').length;
  const printedCount = visitors.filter(v => v.badge_printed).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Printer className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Badge Printing</h1>
            </div>
            <p className="text-muted-foreground">
              Select a visitor to preview and print their safety permit badge
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchVisitors} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{checkedInCount}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-sky-100">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{scheduledCount}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{printedCount}</p>
                <p className="text-sm text-muted-foreground">Badges Printed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visitors List */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Visitors ({filteredVisitors.length})
                </CardTitle>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as 'checked_in' | 'scheduled' | 'checked_out' | 'all')}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visitors</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[150px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredVisitors.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-foreground mb-1">No visitors found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search' : 'No visitors match the current filter'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredVisitors.map((visitor) => {
                      const statusConfig = getStatusConfig(visitor.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <button
                          key={visitor.id}
                          onClick={() => setSelectedVisitor(visitor)}
                          className={cn(
                            'w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-center gap-4',
                            selectedVisitor?.id === visitor.id && 'bg-accent border-l-4 border-l-primary'
                          )}
                        >
                          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                            {visitor.photo_url ? (
                              <AvatarImage src={visitor.photo_url} alt={visitor.name} />
                            ) : null}
                            <AvatarFallback
                              className={cn(
                                'font-semibold text-sm',
                                visitor.badge_printed
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-primary/10 text-primary'
                              )}
                            >
                              {getInitials(visitor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate">{visitor.name}</p>
                              {visitor.badge_printed && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
                                  Printed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {visitor.company || visitor.purpose || 'No details'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {visitor.visitor_id}
                              </span>
                            </div>
                          </div>
                          {visitor.has_laptop && (
                            <Badge variant="secondary" className="gap-1 shrink-0">
                              <Laptop className="h-3 w-3" />
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Badge Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Printer className="h-5 w-5 text-muted-foreground" />
                Safety Permit Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedVisitor ? (
                <div className="space-y-6">
                  {/* Safety Permit Badge */}
                  <div id="printable-badge" ref={badgeRef} className="flex justify-center">
                    <SafetyPermitBadge 
                      visitor={{
                        visitor_id: selectedVisitor.visitor_id,
                        name: selectedVisitor.name,
                        phone: selectedVisitor.phone,
                        company: selectedVisitor.company,
                        purpose: selectedVisitor.purpose,
                        has_laptop: selectedVisitor.has_laptop,
                        photo_url: selectedVisitor.photo_url,
                        check_in_time: selectedVisitor.check_in_time,
                        host: selectedVisitor.host ? {
                          name: selectedVisitor.host.name,
                          department: selectedVisitor.host.department
                        } : null,
                        department: selectedVisitor.department,
                        gate: selectedVisitor.gate ? {
                          location: selectedVisitor.gate.location
                        } : null
                      }} 
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t">
                    {/* Photo Capture */}
                    {!selectedVisitor.photo_url && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setShowCameraDialog(true)}
                      >
                        <Camera className="h-4 w-4" />
                        Capture Photo
                      </Button>
                    )}

                    {/* Share Badge */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleSendEmail(selectedVisitor)}
                        disabled={isSendingEmail || !selectedVisitor.email}
                        title={!selectedVisitor.email ? 'No email available' : 'Send badge via email'}
                      >
                        <Mail className="h-4 w-4" />
                        {isSendingEmail ? 'Sending...' : 'Email'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleSendWhatsApp(selectedVisitor)}
                        disabled={isSendingWhatsApp || !selectedVisitor.phone}
                        title={!selectedVisitor.phone ? 'No phone available' : 'Send badge via WhatsApp'}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {isSendingWhatsApp ? 'Sending...' : 'WhatsApp'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleSendSms(selectedVisitor)}
                        disabled={isSendingSms || !selectedVisitor.phone}
                        title={!selectedVisitor.phone ? 'No phone available' : 'Send badge via SMS'}
                      >
                        <Smartphone className="h-4 w-4" />
                        {isSendingSms ? 'Sending...' : 'SMS'}
                      </Button>
                    </div>

                    {/* Notify Host */}
                    {selectedVisitor.host && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => handleNotifyHost(selectedVisitor)}
                        disabled={isNotifying}
                      >
                        <Bell className="h-4 w-4" />
                        {isNotifying ? 'Notifying...' : 'Notify Host via WhatsApp'}
                      </Button>
                    )}

                    {/* Print Actions */}
                    {selectedVisitor.status === 'scheduled' ? (
                      <>
                        <Button
                          className="w-full gap-2"
                          size="lg"
                          onClick={() => handleCheckInAndPrint(selectedVisitor)}
                        >
                          <UserCheck className="h-4 w-4" />
                          <Printer className="h-4 w-4" />
                          Check In & Print Badge
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => handlePrintBadge(selectedVisitor)}
                        >
                          <Printer className="h-4 w-4" />
                          Print Badge Only
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full gap-2"
                        size="lg"
                        onClick={() => handlePrintBadge(selectedVisitor)}
                      >
                        <Printer className="h-4 w-4" />
                        {selectedVisitor.badge_printed ? 'Reprint Badge' : 'Print Badge'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-32 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-border">
                    <Printer className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">No visitor selected</p>
                  <p className="text-sm text-muted-foreground">
                    Select a visitor from the list to preview their badge
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Camera Capture Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className="max-w-md" aria-describedby="badge-camera-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture Visitor Photo
            </DialogTitle>
            <p id="badge-camera-dialog-description" className="text-sm text-muted-foreground">
              Take a photo of the visitor for their badge
            </p>
          </DialogHeader>
          {showCameraDialog && (
            <CameraCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setShowCameraDialog(false)}
            />
          )}
          {isUploading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Uploading photo...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
