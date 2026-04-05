import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { Video, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

export default function CameraMonitor() {
  const [gates, setGates] = useState<GateWithCamera[]>([]);
  const [recentEvents, setRecentEvents] = useState<AnprEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to ANPR events realtime
    const channel = supabase
      .channel('anpr-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'anpr_events',
      }, (payload) => {
        setRecentEvents(prev => [payload.new as AnprEvent, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Matched</Badge>;
      case 'auto_checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Auto In</Badge>;
      case 'auto_checked_out':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Auto Out</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Unknown</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="h-6 w-6" />
              Camera Monitor
            </h1>
            <p className="text-muted-foreground">Live CCTV feeds from all camera-enabled gates</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

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
                    {gate.location && (
                      <span className="text-[10px] text-muted-foreground">{(gate.location as any).name}</span>
                    )}
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
    </MainLayout>
  );
}
