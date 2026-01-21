import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { Search, Printer, Laptop, MapPin, UserCheck, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Visitor, Location } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CameraCapture } from '@/components/checkin/CameraCapture';

interface VisitorWithLocation extends Omit<Visitor, 'gate'> {
  gate?: {
    id: string;
    location_id: string | null;
    location?: Location;
  } | null;
}

export default function BadgePrinting() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'checked_in' | 'scheduled' | 'all'>('all');
  const [visitors, setVisitors] = useState<VisitorWithLocation[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithLocation | null>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
        host:employees(*, department:departments(*)),
        department:departments(*),
        gate:gates(id, location_id, location:locations(*))
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

    // Then print badge
    const { error: badgeError } = await supabase
      .from('visitors')
      .update({ badge_printed: true })
      .eq('id', visitor.id);

    if (badgeError) {
      toast.error('Failed to update badge status');
    } else {
      toast.success(`${visitor.name} checked in and badge printed`);
      fetchVisitors();
    }
  };

  const handlePrintBadge = async (visitor: VisitorWithLocation) => {
    const { error } = await supabase
      .from('visitors')
      .update({ badge_printed: true })
      .eq('id', visitor.id);

    if (error) {
      toast.error('Failed to update badge status');
    } else {
      toast.success(`Badge printed for ${visitor.name}`);
      fetchVisitors();
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
              Badge Preview
            </h3>

            {selectedVisitor ? (
              <div className="space-y-6">
                {/* Badge Card */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-border rounded-xl p-6 aspect-[3/4] max-w-xs mx-auto flex flex-col">
                  <div className="text-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary mx-auto flex items-center justify-center mb-2">
                      <span className="text-primary-foreground font-bold text-sm">V</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">VisiGuard</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                      {selectedVisitor.photo_url ? (
                        <AvatarImage src={selectedVisitor.photo_url} alt={selectedVisitor.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {getInitials(selectedVisitor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {selectedVisitor.name}
                    </h3>
                    {selectedVisitor.company && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedVisitor.company}
                      </p>
                    )}
                    <Badge className="mb-4">VISITOR</Badge>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedVisitor.visitor_id}
                    </code>
                  </div>

                  <div className="text-center space-y-1">
                    {selectedVisitor.gate?.location?.geo_address && (
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedVisitor.gate.location.geo_address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Host: {selectedVisitor.host?.name || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Photo Capture Button */}
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

                {/* Action Buttons */}
                <div className="space-y-2">
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
