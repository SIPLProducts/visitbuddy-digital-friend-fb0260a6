import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { Video, AlertTriangle, CheckCircle2, Clock, RefreshCw, Scan, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn, safeRandomId } from '@/lib/utils';
import { toast } from 'sonner';

interface GateWithCamera {
  id: string;
  name: string;
  camera_url: string;
  camera_type: string;
  camera_enabled: boolean;
  location_id: string | null;
  location?: { name: string } | null;
}

interface AnprEvent {
  id: string;
  plate_number: string;
  match_status: string;
  event_time: string;
  gate_id: string | null;
  matched_vehicle_id: string | null;
}

interface ScanResult {
  plate_number: string;
  confidence?: string;
  status: string;
  vehicle?: { id: string; vehicle_number: string; driver_name: string } | null;
  message?: string;
}

export default function CameraMonitor() {
  const [gates, setGates] = useState<GateWithCamera[]>([]);
  const [recentEvents, setRecentEvents] = useState<AnprEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult[] | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const autoScanRef = useRef(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`anpr-monitor-${safeRandomId()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'anpr_events',
      }, (payload) => {
        setRecentEvents(prev => [payload.new as AnprEvent, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [gatesRes, eventsRes] = await Promise.all([
      supabase
        .from('gates')
        .select('id, name, camera_url, camera_type, camera_enabled, location_id, location:locations(name)')
        .eq('camera_enabled', true)
        .order('name'),
      supabase
        .from('anpr_events')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(20),
    ]);

    if (gatesRes.data) setGates(gatesRes.data as unknown as GateWithCamera[]);
    if (eventsRes.data) setRecentEvents(eventsRes.data as AnprEvent[]);
    setLoading(false);
  };

  const scanGate = useCallback(async (gateId: string) => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('anpr-scan', {
        body: { gate_id: gateId },
      });

      if (error) throw error;

      if (data?.status === 'camera_unavailable') {
        if (!autoScanRef.current) {
          toast.warning(data.error || 'Camera temporarily unavailable, please retry.');
        }
        return;
      }

      if (data?.status === 'camera_error') {
        toast.error(data.error || 'Camera error');
        return;
      }

      if (data?.plates && data.plates.length > 0) {
        setLastScanResult(data.plates);
        setScanCount(prev => prev + 1);

        for (const plate of data.plates) {
          if (plate.status === 'auto_checked_in') {
            toast.success(`🚗 ${plate.plate_number} — Auto Checked IN`, {
              description: plate.vehicle?.driver_name || 'Registered vehicle',
            });
          } else if (plate.status === 'auto_checked_out') {
            toast.info(`🚗 ${plate.plate_number} — Auto Checked OUT`, {
              description: plate.vehicle?.driver_name || 'Registered vehicle',
            });
          } else if (plate.status === 'unmatched') {
            toast.warning(`⚠️ Unknown plate: ${plate.plate_number}`, {
              description: 'Not in vehicle register',
            });
          } else if (plate.status === 'duplicate') {
            // Skip notification for duplicates
          } else if (plate.status === 'matched') {
            toast(`✅ ${plate.plate_number} — Matched`, {
              description: plate.vehicle?.driver_name,
            });
          }
        }
      } else {
        setLastScanResult(null);
      }
    } catch (err: any) {
      console.error('ANPR scan error:', err);
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('AI rate limited. Pausing auto-scan...');
        setAutoScan(false);
        autoScanRef.current = false;
      }
    } finally {
      setScanning(false);
    }
  }, []);

  // Auto-scan loop
  useEffect(() => {
    autoScanRef.current = autoScan;

    if (!autoScan || gates.length === 0) {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      return;
    }

    const runAutoScan = async () => {
      if (!autoScanRef.current) return;
      
      // Scan each gate sequentially
      for (const gate of gates) {
        if (!autoScanRef.current) break;
        await scanGate(gate.id);
      }

      // Schedule next scan after 8 seconds
      if (autoScanRef.current) {
        scanTimerRef.current = setTimeout(runAutoScan, 8000);
      }
    };

    runAutoScan();

    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [autoScan, gates, scanGate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Matched</Badge>;
      case 'auto_checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Auto In</Badge>;
      case 'auto_checked_out':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Auto Out</Badge>;
      case 'unmatched':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Unknown</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground text-[10px]">{status}</Badge>;
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="h-6 w-6" />
              Camera Monitor
            </h1>
            <p className="text-muted-foreground">Live CCTV feeds with AI-powered plate detection</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoScan ? 'destructive' : 'default'}
              size="sm"
              onClick={() => setAutoScan(!autoScan)}
              className="gap-2"
            >
              {autoScan ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              {autoScan ? 'Stop Auto-Scan' : 'Start Auto-Scan'}
            </Button>
            {gates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => scanGate(gates[0].id)}
                disabled={scanning}
                className="gap-2"
              >
                <Scan className={cn("h-4 w-4", scanning && "animate-spin")} />
                Scan Now
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Auto-scan status bar */}
        {autoScan && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Auto-scanning active — {scanCount} scans completed
            </span>
            {scanning && <span className="text-xs text-muted-foreground">(scanning...)</span>}
          </div>
        )}

        {/* Last scan result */}
        {lastScanResult && lastScanResult.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <Scan className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Last Detection</span>
              </div>
              <div className="space-y-2">
                {lastScanResult.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg">{result.plate_number}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.vehicle && (
                      <span className="text-muted-foreground">{result.vehicle.driver_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera Grid */}
        {gates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No cameras configured</p>
              <p className="text-sm text-muted-foreground mt-1">Enable cameras in Gates configuration to see live feeds here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gates.map((gate) => (
              <Card key={gate.id} className="overflow-hidden">
                <CameraFeed
                  cameraUrl={gate.camera_url}
                  cameraType={gate.camera_type as 'snapshot' | 'mjpeg' | 'hls'}
                  gateName={gate.name}
                />
                <CardContent className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{gate.name}</span>
                    <div className="flex items-center gap-2">
                      {gate.location && (
                        <span className="text-[10px] text-muted-foreground">{(gate.location as any).name}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => scanGate(gate.id)}
                        disabled={scanning}
                      >
                        <Scan className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent ANPR Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Plate Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No plate detections yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg text-sm',
                      event.match_status === 'unmatched'
                        ? 'bg-red-500/5 border border-red-500/20'
                        : 'bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {event.match_status === 'unmatched' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="font-mono font-semibold">{event.plate_number}</span>
                      {getStatusBadge(event.match_status)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{format(new Date(event.event_time), 'hh:mm:ss a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
