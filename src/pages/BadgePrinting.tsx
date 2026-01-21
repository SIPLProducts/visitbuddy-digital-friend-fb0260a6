import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Printer, Laptop, UserCheck, Camera, Bell } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'checked_in' | 'scheduled' | 'all'>('all');
  const [visitors, setVisitors] = useState<VisitorWithLocation[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithLocation | null>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, [statusFilter]);

  useEffect(() => {
    // Auto-select visitor from URL params
    const visitorId = searchParams.get('visitorId');
    if (visitorId && visitors.length > 0) {
      const visitor = visitors.find((v) => v.id === visitorId);
      if (visitor) {
        setSelectedVisitor(visitor);
      }
    }
  }, [searchParams, visitors]);

  const fetchVisitors = async () => {
    let query = supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*), phone),
        department:departments(*),
        gate:gates(id, name, location_id, location:locations(*))
      `)
      .order('created_at', { ascending: false });

    if (statusFilter === 'checked_in') {
      query = query.eq('status', 'checked_in');
    } else if (statusFilter === 'scheduled') {
      query = query.eq('status', 'scheduled');
    } else {
      query = query.in('status', ['checked_in', 'scheduled']);
    }

    const { data } = await query;

    if (data) {
      setVisitors(data as unknown as VisitorWithLocation[]);
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
    // First check in the visitor
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

    // Then update badge_printed status
    const { error: badgeError } = await supabase
      .from('visitors')
      .update({ badge_printed: true })
      .eq('id', visitor.id);

    if (badgeError) {
      toast.error('Failed to update badge status');
      return;
    }

    toast.success(`${visitor.name} checked in successfully`);
    
    // Refresh visitors and then trigger print
    await fetchVisitors();
    
    // Small delay to ensure the badge is updated with new status
    setTimeout(() => {
      const badgeElement = document.getElementById('printable-badge');
      if (badgeElement) {
        printBadgeContent(badgeElement.innerHTML, visitor.name);
      }
    }, 300);
  };

  const printBadgeContent = (badgeHtml: string, visitorName: string) => {
    // Create a new window for printing - more reliable than iframe
    const printWindow = window.open('', '_blank', 'width=450,height=700,scrollbars=yes');
    
    if (!printWindow) {
      // Fallback: try iframe if popup is blocked
      toast.error('Please allow popups for printing, or use Ctrl+P');
      window.print();
      return;
    }

    // Write complete HTML with inline styles (no Tailwind dependency)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Safety Permit - ${visitorName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            background: white; 
            color: black;
            padding: 10px;
          }
          @page { 
            size: 100mm 150mm; 
            margin: 5mm; 
          }
          @media print {
            body { padding: 0; }
          }
          /* Badge container styles */
          .badge-container {
            background: white;
            border: 2px solid #1f2937;
            border-radius: 8px;
            overflow: hidden;
            width: 350px;
            margin: 0 auto;
          }
          /* Header styles */
          .badge-header {
            display: flex;
            align-items: center;
            border-bottom: 2px solid #1f2937;
          }
          .logo-section {
            width: 64px;
            padding: 8px;
            border-right: 2px solid #1f2937;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-section img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .company-name {
            flex: 1;
            text-align: center;
            padding: 4px 0;
            color: #dc2626;
            font-weight: 600;
            font-style: italic;
            font-size: 14px;
          }
          /* Title section */
          .title-section {
            display: flex;
            border-bottom: 2px solid #1f2937;
          }
          .title-text {
            flex: 1;
            background: #1f2937;
            color: white;
            padding: 8px;
          }
          .title-text h2 {
            font-size: 18px;
            font-weight: bold;
          }
          .title-text p {
            font-size: 14px;
            font-weight: 600;
          }
          .photo-section {
            width: 96px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
          }
          .photo-section img, .photo-placeholder {
            width: 80px;
            height: 80px;
            object-fit: cover;
          }
          .photo-placeholder {
            background: #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #374151;
            font-size: 24px;
            font-weight: bold;
          }
          /* Details grid */
          .details-grid {
            font-size: 11px;
          }
          .detail-row {
            display: flex;
            padding: 6px;
            border-bottom: 1px solid #d1d5db;
          }
          .detail-label {
            width: 96px;
            font-weight: 600;
          }
          .detail-value {
            flex: 1;
          }
          /* Signatures */
          .signatures-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            border-top: 2px solid #1f2937;
            text-align: center;
            font-size: 11px;
          }
          .signature-box {
            padding: 8px;
            border-right: 1px solid #d1d5db;
          }
          .signature-box:last-child {
            border-right: none;
          }
          .signature-line {
            height: 32px;
            border-bottom: 1px dashed #9ca3af;
            margin-bottom: 4px;
          }
          .signature-label {
            font-weight: 600;
            font-style: italic;
          }
          /* Safety guidelines */
          .guidelines-section {
            display: flex;
            border-top: 2px solid #1f2937;
            background: #f3f4f6;
          }
          .guidelines-text {
            flex: 1;
            padding: 8px;
            font-size: 10px;
            line-height: 1.3;
          }
          .guidelines-text p {
            margin-bottom: 2px;
          }
          .qr-section {
            width: 96px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-left: 1px solid #d1d5db;
          }
          .qr-section img {
            width: 80px;
            height: 80px;
          }
        </style>
      </head>
      <body>
        ${badgeHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Print dialog opening...');
  };

  const handlePrintBadge = async (visitor: VisitorWithLocation) => {
    console.log('Print badge clicked for:', visitor.name);
    
    const { error } = await supabase
      .from('visitors')
      .update({ badge_printed: true })
      .eq('id', visitor.id);

    if (error) {
      console.error('Failed to update badge status:', error);
      toast.error('Failed to update badge status');
      return;
    }
    
    // Get the badge HTML content
    const badgeElement = document.getElementById('printable-badge');
    console.log('Badge element found:', !!badgeElement);
    
    if (!badgeElement) {
      toast.error('Badge element not found - please select a visitor first');
      return;
    }

    printBadgeContent(badgeElement.innerHTML, visitor.name);
    fetchVisitors();
  };

  const handleNotifyHost = async (visitor: VisitorWithLocation) => {
    if (!visitor.host?.phone) {
      toast.error('Host phone number not available');
      return;
    }

    setIsNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-host', {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visitor_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Printer className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Badge Printing</h1>
          </div>
          <p className="text-muted-foreground">
            Print visitor badges with check-in option
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visitors List */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Visitors</h3>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as 'checked_in' | 'scheduled' | 'all')}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Active</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
              {filteredVisitors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No visitors found
                </div>
              ) : (
                filteredVisitors.map((visitor) => (
                  <button
                    key={visitor.id}
                    onClick={() => setSelectedVisitor(visitor)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-center gap-4',
                      selectedVisitor?.id === visitor.id && 'bg-accent'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      {visitor.photo_url ? (
                        <AvatarImage src={visitor.photo_url} alt={visitor.name} />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          'font-medium',
                          visitor.badge_printed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        {getInitials(visitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{visitor.name}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            visitor.status === 'checked_in'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-sky-100 text-sky-700 border-sky-200'
                          )}
                        >
                          {visitor.status === 'checked_in' ? 'Checked In' : 'Scheduled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {visitor.company || visitor.purpose}
                      </p>
                    </div>
                    {visitor.has_laptop && (
                      <Badge variant="outline" className="gap-1">
                        <Laptop className="h-3 w-3" />
                        Laptop
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Badge Preview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Safety Permit Preview
            </h3>

            {selectedVisitor ? (
              <div className="space-y-6">
                {/* Safety Permit Badge - Printable area */}
                <div id="printable-badge" ref={badgeRef}>
                  <SafetyPermitBadge visitor={selectedVisitor} />
                </div>

                {/* Photo Capture Button */}
                {!selectedVisitor.photo_url && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 no-print"
                    onClick={() => setShowCameraDialog(true)}
                  >
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </Button>
                )}

                {/* Notify Host Button */}
                {selectedVisitor.host?.phone && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 no-print"
                    onClick={() => handleNotifyHost(selectedVisitor)}
                    disabled={isNotifying}
                  >
                    <Bell className="h-4 w-4" />
                    {isNotifying ? 'Notifying...' : 'Notify Host via WhatsApp'}
                  </Button>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 no-print">
                  {selectedVisitor.status === 'scheduled' ? (
                    <>
                      <Button
                        className="w-full gap-2"
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
                      onClick={() => handlePrintBadge(selectedVisitor)}
                    >
                      <Printer className="h-4 w-4" />
                      {selectedVisitor.badge_printed ? 'Reprint Badge' : 'Print Badge'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-32 h-40 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-border">
                  <Printer className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select a visitor to preview their badge
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Capture Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture Visitor Photo
            </DialogTitle>
          </DialogHeader>
          <CameraCapture
            onCapture={handlePhotoCapture}
            onCancel={() => setShowCameraDialog(false)}
          />
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
