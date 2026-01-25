import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QrCode, Search, UserCheck, UserX, Camera, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QrScanner } from '@/components/checkin/QrScanner';
import { CameraCapture } from '@/components/checkin/CameraCapture';
import { useNavigate } from 'react-router-dom';

export default function CheckInOut() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({
    checkedIn: 0,
    checkedOut: 0,
    scheduled: 0,
  });

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    const { data } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*)
      `)
      .in('status', ['checked_in', 'scheduled'])
      .order('created_at', { ascending: false });

    if (data) {
      const typedData = data as unknown as Visitor[];
      setVisitors(typedData);
      
      const checkedIn = typedData.filter((v) => v.status === 'checked_in').length;
      const scheduled = typedData.filter((v) => v.status === 'scheduled').length;
      
      setStats({
        checkedIn,
        scheduled,
        checkedOut: 0,
      });
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
      // Update visitor with photo URL
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

  const handleCheckIn = async (visitor: Visitor) => {
    const { error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to check in visitor');
    } else {
      toast.success(`${visitor.name} checked in successfully`);
      fetchVisitors();
      setSelectedVisitor(null);
    }
  };

  const handleCheckInWithPhoto = async () => {
    if (!selectedVisitor) return;
    setShowCameraDialog(true);
  };

  const handleCheckOut = async (visitor: Visitor) => {
    const { error } = await supabase
      .from('visitors')
      .update({
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
      })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to check out visitor');
    } else {
      toast.success(`${visitor.name} checked out successfully`);
      fetchVisitors();
      setSelectedVisitor(null);
    }
  };

  const handlePrintBadge = () => {
    if (selectedVisitor) {
      navigate(`/badge-printing?visitorId=${selectedVisitor.id}`);
    }
  };

  const handleQrScan = async (data: { visitorId: string; name: string; action?: string }) => {
    toast.info(`QR scanned: ${data.name}`);
    
    const { data: visitorData } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*, department:departments(*)),
        department:departments(*)
      `)
      .eq('visitor_id', data.visitorId)
      .single();

    if (visitorData) {
      const visitor = visitorData as unknown as Visitor;
      setSelectedVisitor(visitor);
      
      // Handle checkout action from badge QR code
      if (data.action === 'checkout') {
        if (visitor.status === 'checked_in') {
          // Auto check-out when QR with checkout action is scanned
          const { error } = await supabase
            .from('visitors')
            .update({
              status: 'checked_out',
              check_out_time: new Date().toISOString(),
            })
            .eq('id', visitor.id);

          if (error) {
            toast.error('Failed to check out visitor');
          } else {
            toast.success(`${visitor.name} checked out successfully via QR scan`);
            fetchVisitors();
            setSelectedVisitor(null);
          }
        } else if (visitor.status === 'checked_out') {
          toast.warning('Visitor has already checked out');
        } else {
          toast.warning('Visitor must check in first');
        }
        return;
      }
      
      // Handle regular check-in flow
      if (visitor.status === 'scheduled') {
        // Show camera dialog for photo capture
        setShowCameraDialog(true);
      } else if (visitor.status === 'checked_in') {
        toast.info('Visitor already checked in. Ready for check-out.');
      } else {
        toast.warning('Visitor has already checked out');
      }
    } else {
      toast.error('Visitor not found');
    }
  };

  const handlePhotoCaptureAndCheckIn = async (blob: Blob) => {
    if (!selectedVisitor) return;

    setIsUploading(true);
    const photoUrl = await uploadPhoto(blob, selectedVisitor.id);
    
    // Update visitor with photo and check in
    const { error } = await supabase
      .from('visitors')
      .update({
        photo_url: photoUrl,
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      })
      .eq('id', selectedVisitor.id);

    if (error) {
      toast.error('Failed to check in visitor');
    } else {
      toast.success(`${selectedVisitor.name} checked in with photo`);
      fetchVisitors();
      setSelectedVisitor(null);
    }

    setIsUploading(false);
    setShowCameraDialog(false);
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
      v.visitor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Check-in / Check-out</h1>
          <p className="text-muted-foreground">
            Scan QR code or search to manage visitor check-ins
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Scan / Search */}
          <div className="space-y-6">
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="scan" className="flex-1 gap-2">
                  <QrCode className="h-4 w-4" />
                  Scan QR Code
                </TabsTrigger>
                <TabsTrigger value="search" className="flex-1 gap-2">
                  <Search className="h-4 w-4" />
                  Search Visitor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="mt-4">
                <QrScanner 
                  onScan={handleQrScan}
                  isScanning={isScanning}
                  onToggleScanning={setIsScanning}
                />
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-border">
                    {filteredVisitors.map((visitor) => (
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
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(visitor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{visitor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {visitor.company || visitor.visitor_id}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            visitor.status === 'checked_in'
                              ? 'bg-success/20 text-success border-success/30'
                              : 'bg-info/20 text-info border-info/30'
                          )}
                        >
                          {visitor.status === 'checked_in' ? 'Checked In' : 'Scheduled'}
                        </Badge>
                      </button>
                    ))}
                    {filteredVisitors.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        No visitors found
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Visitor Details / Stats */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              {selectedVisitor ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      {selectedVisitor.photo_url ? (
                        <AvatarImage src={selectedVisitor.photo_url} alt={selectedVisitor.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                        {getInitials(selectedVisitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedVisitor.name}
                    </h3>
                    <p className="text-muted-foreground">{selectedVisitor.company}</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded mt-2 inline-block">
                      {selectedVisitor.visitor_id}
                    </code>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Host</span>
                      <span className="font-medium">{selectedVisitor.host?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">
                        {selectedVisitor.department?.name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Purpose</span>
                      <span className="font-medium">{selectedVisitor.purpose || '—'}</span>
                    </div>
                    {selectedVisitor.has_laptop && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Laptop</span>
                        <span className="font-medium">
                          {selectedVisitor.laptop_brand} ({selectedVisitor.laptop_serial})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Photo Capture Button */}
                  {selectedVisitor.status === 'checked_in' && !selectedVisitor.photo_url && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowCameraDialog(true)}
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {selectedVisitor.status === 'scheduled' ? (
                      <>
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => handleCheckIn(selectedVisitor)}
                        >
                          <UserCheck className="h-4 w-4" />
                          Check In
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={handleCheckInWithPhoto}
                        >
                          <Camera className="h-4 w-4" />
                          Check In with Photo
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleCheckOut(selectedVisitor)}
                        >
                          <UserX className="h-4 w-4" />
                          Check Out
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={handlePrintBadge}
                        >
                          <Printer className="h-4 w-4" />
                          Print Badge
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No Visitor Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan a QR code or search for a visitor to view their details and proceed
                    with check-in or check-out
                  </p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-success">{stats.checkedIn}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{stats.checkedOut}</p>
                <p className="text-sm text-muted-foreground">Checked Out</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-3xl font-bold text-info">{stats.scheduled}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Capture Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className="max-w-md" aria-describedby="camera-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture Visitor Photo
            </DialogTitle>
            <p id="camera-dialog-description" className="text-sm text-muted-foreground">
              Take a photo of the visitor for their badge
            </p>
          </DialogHeader>
          {showCameraDialog && (
            <CameraCapture
              onCapture={selectedVisitor?.status === 'scheduled' ? handlePhotoCaptureAndCheckIn : handlePhotoCapture}
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
