import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Truck, LogIn, LogOut, Clock, History, Loader2, Video, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, VehicleEntry } from '@/types/vehicle';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { QrScanner } from '@/components/checkin/QrScanner';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { cn, safeRandomId } from '@/lib/utils';

export default function VehicleGate() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeEntry, setActiveEntry] = useState<VehicleEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<VehicleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [gateCamera, setGateCamera] = useState<{ url: string; type: string; name: string } | null>(null);
  const [anprAlerts, setAnprAlerts] = useState<Array<{ id: string; plate_number: string; match_status: string; event_time: string }>>([]);

  // Fetch gate camera config
  useEffect(() => {
    const fetchGateCamera = async () => {
      const { data } = await supabase
        .from('gates')
        .select('name, camera_url, camera_type, camera_enabled')
        .eq('camera_enabled', true)
        .limit(1)
        .single();
      if (data && data.camera_url) {
        setGateCamera({ url: data.camera_url, type: data.camera_type || 'snapshot', name: data.name });
      }
    };
    fetchGateCamera();

    // Subscribe to ANPR events
    const channel = supabase
      .channel(`anpr-vehicle-gate-${safeRandomId()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'anpr_events',
      }, async (payload) => {
        const event = payload.new as any;
        setAnprAlerts(prev => [event, ...prev].slice(0, 5));
        
        if (event.match_status !== 'unmatched' && event.matched_vehicle_id) {
          // Auto-populate the matched vehicle
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('*, gate:gates(*), location:locations(*)')
            .eq('id', event.matched_vehicle_id)
            .single();
          if (vehicleData) {
            setSelectedVehicle(vehicleData as unknown as Vehicle);
            await fetchVehicleEntries(vehicleData.id);
            toast.success(`🚗 Plate detected: ${event.plate_number} - Vehicle matched!`);
          }
        } else {
          toast.error(`⚠️ Unknown vehicle detected: ${event.plate_number}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select(`*, gate:gates(*), location:locations(*)`)
      .or(`vehicle_number.ilike.%${searchTerm}%,vehicle_id.eq.${searchTerm}`)
      .limit(1)
      .single();

    if (error || !data) {
      toast.error('Vehicle not found');
      setSelectedVehicle(null);
      setActiveEntry(null);
      setRecentEntries([]);
    } else {
      setSelectedVehicle(data as unknown as Vehicle);
      await fetchVehicleEntries(data.id);
      
      // Auto-allow: automatically check in employee vehicles
      if ((data as any).auto_allow && !(await hasActiveEntry(data.id))) {
        await autoCheckIn(data as unknown as Vehicle);
      }
    }
    setLoading(false);
  };

  const hasActiveEntry = async (vehicleId: string) => {
    const { data } = await supabase
      .from('vehicle_entries')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .is('exit_time', null)
      .single();
    return !!data;
  };

  const autoCheckIn = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from('vehicle_entries')
      .insert({
        vehicle_id: vehicle.id,
        gate_id: vehicle.gate_id,
        location_id: vehicle.location_id,
        entry_time: new Date().toISOString(),
        purpose: 'Employee vehicle - auto entry',
      });

    if (!error) {
      await supabase
        .from('vehicles')
        .update({
          status: 'checked_in',
          check_in_time: new Date().toISOString(),
          check_out_time: null,
        })
        .eq('id', vehicle.id);

      toast.success(`✅ ${vehicle.vehicle_number} auto-checked in (employee vehicle)`);
      await fetchVehicleEntries(vehicle.id);
    }
  };

  const fetchVehicleEntries = async (vehicleId: string) => {
    // Fetch active entry
    const { data: active } = await supabase
      .from('vehicle_entries')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('exit_time', null)
      .single();

    setActiveEntry(active as VehicleEntry | null);

    // Fetch recent entries (last 5)
    const { data: recent } = await supabase
      .from('vehicle_entries')
      .select(`*, gate:gates(name), location:locations(name)`)
      .eq('vehicle_id', vehicleId)
      .order('entry_time', { ascending: false })
      .limit(5);

    setRecentEntries((recent as unknown as VehicleEntry[]) || []);
  };

  const handleQrScan = async (data: { visitorId: string; name: string; timestamp: string }) => {
    setIsScanning(false);
    const vehicleId = data.visitorId;
    
    if (!vehicleId?.startsWith('VEH-')) {
      toast.error('Invalid vehicle QR code');
      return;
    }

    setLoading(true);
    const { data: vehicleData, error } = await supabase
      .from('vehicles')
      .select(`*, gate:gates(*), location:locations(*)`)
      .eq('vehicle_id', vehicleId)
      .single();

    if (error || !vehicleData) {
      toast.error('Vehicle not found');
    } else {
      setSelectedVehicle(vehicleData as unknown as Vehicle);
      await fetchVehicleEntries(vehicleData.id);
      toast.success(`Found: ${vehicleData.vehicle_number}`);
      
      // Auto-allow for employee vehicles
      if ((vehicleData as any).auto_allow && !(await hasActiveEntry(vehicleData.id))) {
        await autoCheckIn(vehicleData as unknown as Vehicle);
      }
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedVehicle) return;

    setProcessing(true);
    
    // Create a new entry record
    const { error } = await supabase
      .from('vehicle_entries')
      .insert({
        vehicle_id: selectedVehicle.id,
        gate_id: selectedVehicle.gate_id,
        location_id: selectedVehicle.location_id,
        entry_time: new Date().toISOString(),
        purpose: purpose || selectedVehicle.purpose,
        remarks: remarks || null,
      });

    if (error) {
      toast.error('Failed to check in vehicle');
    } else {
      // Update vehicle status
      await supabase
        .from('vehicles')
        .update({
          status: 'checked_in',
          check_in_time: new Date().toISOString(),
          check_out_time: null,
        })
        .eq('id', selectedVehicle.id);

      toast.success(`${selectedVehicle.vehicle_number} checked in successfully!`);
      await fetchVehicleEntries(selectedVehicle.id);
      setPurpose('');
      setRemarks('');
    }
    setProcessing(false);
  };

  const handleCheckOut = async () => {
    if (!selectedVehicle || !activeEntry) return;

    setProcessing(true);

    // Update the active entry with exit time
    const { error } = await supabase
      .from('vehicle_entries')
      .update({
        exit_time: new Date().toISOString(),
        remarks: remarks || activeEntry.remarks,
      })
      .eq('id', activeEntry.id);

    if (error) {
      toast.error('Failed to check out vehicle');
    } else {
      // Update vehicle status
      await supabase
        .from('vehicles')
        .update({
          status: 'checked_out',
          check_out_time: new Date().toISOString(),
        })
        .eq('id', selectedVehicle.id);

      toast.success(`${selectedVehicle.vehicle_number} checked out successfully!`);
      await fetchVehicleEntries(selectedVehicle.id);
      setRemarks('');
    }
    setProcessing(false);
  };

  const formatDuration = (entryTime: string) => {
    return formatDistanceToNow(new Date(entryTime), { addSuffix: false });
  };

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Vehicle Gate Entry
            </h1>
            <p className="text-muted-foreground">
              Check-in/out vehicles - tracks multiple entries
            </p>
          </div>
        </div>

        {/* ANPR Alerts Banner */}
        {anprAlerts.length > 0 && (
          <div className="space-y-2">
            {anprAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg text-sm border',
                  alert.match_status === 'unmatched'
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-emerald-500/5 border-emerald-500/20'
                )}
              >
                <div className="flex items-center gap-2">
                  {alert.match_status === 'unmatched' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className="font-mono font-semibold">{alert.plate_number}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {alert.match_status === 'auto_checked_in' ? 'Auto In' : alert.match_status === 'auto_checked_out' ? 'Auto Out' : alert.match_status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(alert.event_time), 'hh:mm:ss a')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Camera Feed + Gate Controls */}
        {gateCamera && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Camera - {gateCamera.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CameraFeed
                cameraUrl={gateCamera.url}
                cameraType={gateCamera.type as 'snapshot' | 'mjpeg' | 'hls'}
                gateName={gateCamera.name}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search/Scan Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Find Vehicle</CardTitle>
                <CardDescription>
                  Search by vehicle number or scan QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter vehicle number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 uppercase"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading}>
                    Search
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or scan QR code</span>
                  </div>
                </div>

                <QrScanner 
                  onScan={handleQrScan} 
                  isScanning={isScanning}
                  onToggleScanning={setIsScanning}
                />
              </CardContent>
            </Card>

            {/* Recent Entries */}
            {selectedVehicle && recentEntries.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Entries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg text-sm ${
                        !entry.exit_time
                          ? 'border border-emerald-500/50 bg-emerald-500/5'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {format(new Date(entry.entry_time), 'dd MMM, hh:mm a')}
                        </span>
                        {!entry.exit_time ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
                            Inside
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.exit_time), 'hh:mm a')}
                          </span>
                        )}
                      </div>
                      {entry.purpose && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.purpose}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vehicle Details Section */}
          <div>
            {selectedVehicle ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {selectedVehicle.vehicle_number}
                    </CardTitle>
                    {activeEntry ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Inside Premises
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">
                        Outside
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="font-mono">
                    {selectedVehicle.vehicle_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vehicle Type</p>
                      <p className="font-medium">{selectedVehicle.vehicle_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Driver</p>
                      <p className="font-medium">{selectedVehicle.driver_name}</p>
                    </div>
                    {selectedVehicle.driver_phone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedVehicle.driver_phone}</p>
                      </div>
                    )}
                    {selectedVehicle.company && (
                      <div>
                        <p className="text-muted-foreground">Company</p>
                        <p className="font-medium">{selectedVehicle.company}</p>
                      </div>
                    )}
                  </div>

                  {activeEntry && (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">Inside for:</span>
                      <span className="font-medium text-emerald-700">
                        {formatDuration(activeEntry.entry_time)}
                      </span>
                      <span className="text-xs text-emerald-600 ml-auto">
                        Since {format(new Date(activeEntry.entry_time), 'hh:mm a')}
                      </span>
                    </div>
                  )}

                  {/* Entry Form */}
                  {!activeEntry && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="purpose">Purpose of Visit</Label>
                        <Input
                          id="purpose"
                          placeholder="e.g., Material delivery, Pickup"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                        <Textarea
                          id="remarks"
                          placeholder="Any additional notes..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  {/* Exit Remarks */}
                  {activeEntry && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="exitRemarks">Exit Remarks (Optional)</Label>
                        <Textarea
                          id="exitRemarks"
                          placeholder="Any notes for this exit..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {!activeEntry ? (
                      <Button className="flex-1" onClick={handleCheckIn} disabled={processing}>
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4 mr-2" />
                        )}
                        Check In
                      </Button>
                    ) : (
                      <Button className="flex-1" variant="outline" onClick={handleCheckOut} disabled={processing}>
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-2" />
                        )}
                        Check Out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Search or scan a vehicle to see details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}
