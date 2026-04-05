import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { Video, Scan, Power, PowerOff, CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GateWithCamera {
  id: string;
  name: string;
  camera_url: string;
  camera_type: string;
  camera_enabled: boolean;
  location_id: string | null;
}

interface ScanResult {
  plate_number: string;
  confidence?: string;
  status: string;
  vehicle?: { id: string; vehicle_number: string; driver_name: string } | null;
  message?: string;
}

interface AnprEvent {
  id: string;
  plate_number: string;
  match_status: string;
  event_time: string;
}

export function AnprPanel({ onVehicleAction }: { onVehicleAction?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gates, setGates] = useState<GateWithCamera[]>([]);
  const [selectedGate, setSelectedGate] = useState<GateWithCamera | null>(null);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [lastResults, setLastResults] = useState<ScanResult[]>([]);
  const [recentEvents, setRecentEvents] = useState<AnprEvent[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const autoScanRef = useRef(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchGates();
    fetchRecentEvents();

    const channel = supabase
      .channel('anpr-panel-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anpr_events' }, () => {
        fetchRecentEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  const fetchGates = async () => {
    const { data } = await supabase
      .from('gates')
      .select('id, name, camera_url, camera_type, camera_enabled, location_id')
      .eq('camera_enabled', true)
      .not('camera_url', 'is', null);

    if (data && data.length > 0) {
      setGates(data as GateWithCamera[]);
      setSelectedGate(data[0] as GateWithCamera);
    }
  };

  const fetchRecentEvents = async () => {
    const { data } = await supabase
      .from('anpr_events')
      .select('id, plate_number, match_status, event_time')
      .order('event_time', { ascending: false })
      .limit(5);

    if (data) setRecentEvents(data);
  };

  const performScan = useCallback(async () => {
    if (!selectedGate || scanning) return;
    setScanning(true);

    try {
      const { data, error } = await supabase.functions.invoke('anpr-scan', {
        body: { gate_id: selectedGate.id },
      });

      if (error) throw error;

      if (data?.plates?.length > 0) {
        setLastResults(data.plates);
        setScanCount(prev => prev + 1);

        for (const plate of data.plates) {
          if (plate.status === 'auto_checked_in') {
            toast.success(`🚗 ${plate.plate_number} — Auto Checked In`, {
              description: plate.vehicle?.driver_name || '',
            });
          } else if (plate.status === 'auto_checked_out') {
            toast.info(`🚗 ${plate.plate_number} — Auto Checked Out`, {
              description: plate.vehicle?.driver_name || '',
            });
          } else if (plate.status === 'unmatched') {
            toast.warning(`⚠️ Unknown plate: ${plate.plate_number}`);
          }
        }
        onVehicleAction?.();
      }
    } catch (err: any) {
      console.error('ANPR scan error:', err);
    } finally {
      setScanning(false);
      if (autoScanRef.current) {
        scanTimerRef.current = setTimeout(() => performScan(), 8000);
      }
    }
  }, [selectedGate, scanning, onVehicleAction]);

  const toggleAutoScan = () => {
    if (autoScan) {
      autoScanRef.current = false;
      setAutoScan(false);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    } else {
      autoScanRef.current = true;
      setAutoScan(true);
      performScan();
    }
  };

  if (gates.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                ANPR Camera Scanner
                {autoScan && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs animate-pulse">
                    Live
                  </Badge>
                )}
                {scanCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{scanCount} scans</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Camera Feed + Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Camera */}
              <div className="space-y-2">
                {selectedGate && (
                  <CameraFeed
                    cameraUrl={selectedGate.camera_url}
                    cameraType={selectedGate.camera_type as 'snapshot' | 'mjpeg' | 'hls'}
                    gateName={selectedGate.name}
                    className="h-48"
                  />
                )}
                {gates.length > 1 && (
                  <div className="flex gap-1 flex-wrap">
                    {gates.map(g => (
                      <Button
                        key={g.id}
                        variant={selectedGate?.id === g.id ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedGate(g); }}
                      >
                        {g.name}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => { e.stopPropagation(); performScan(); }}
                    disabled={scanning || !selectedGate}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Scan className={cn("h-3.5 w-3.5 mr-1", scanning && "animate-spin")} />
                    {scanning ? 'Scanning...' : 'Scan Now'}
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); toggleAutoScan(); }}
                    size="sm"
                    variant={autoScan ? 'destructive' : 'default'}
                    className="flex-1"
                  >
                    {autoScan ? <PowerOff className="h-3.5 w-3.5 mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                    {autoScan ? 'Stop Auto' : 'Auto Scan'}
                  </Button>
                </div>
              </div>

              {/* Detection Results */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Detection Results</h4>
                {lastResults.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {lastResults.map((r, i) => (
                      <div key={i} className={cn(
                        "p-2 rounded-lg border text-sm flex items-center justify-between",
                        r.status === 'auto_checked_in' && "border-emerald-500/30 bg-emerald-500/5",
                        r.status === 'auto_checked_out' && "border-blue-500/30 bg-blue-500/5",
                        r.status === 'unmatched' && "border-amber-500/30 bg-amber-500/5",
                        r.status === 'duplicate' && "border-muted bg-muted/30",
                      )}>
                        <div>
                          <p className="font-mono font-bold">{r.plate_number}</p>
                          {r.vehicle && <p className="text-xs text-muted-foreground">{r.vehicle.driver_name}</p>}
                        </div>
                        <Badge variant="secondary" className={cn("text-xs",
                          r.status === 'auto_checked_in' && "bg-emerald-500/10 text-emerald-600",
                          r.status === 'auto_checked_out' && "bg-blue-500/10 text-blue-600",
                          r.status === 'unmatched' && "bg-amber-500/10 text-amber-600",
                        )}>
                          {r.status === 'auto_checked_in' ? '✓ In' : 
                           r.status === 'auto_checked_out' ? '✓ Out' :
                           r.status === 'unmatched' ? 'Unknown' : r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-lg bg-muted/10">
                    <div className="text-center">
                      <Scan className="h-6 w-6 mx-auto mb-1 opacity-30" />
                      <p>Click "Scan Now" or start Auto Scan</p>
                    </div>
                  </div>
                )}

                {/* Recent Events */}
                {recentEvents.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Recent Detections</h4>
                    <div className="space-y-1">
                      {recentEvents.slice(0, 3).map(e => (
                        <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono">{e.plate_number}</span>
                          <div className="flex items-center gap-1">
                            {e.match_status.includes('checked_in') ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            ) : e.match_status.includes('checked_out') ? (
                              <CheckCircle2 className="h-3 w-3 text-blue-500" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            )}
                            <span>{format(new Date(e.event_time), 'HH:mm')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
