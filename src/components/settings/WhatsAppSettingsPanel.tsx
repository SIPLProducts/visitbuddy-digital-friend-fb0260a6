import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, MessageCircle, Power, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Provider = 'twilio' | 'whatsapp_web';
type BridgeState = 'disconnected' | 'qr' | 'authenticated' | 'ready' | 'unknown';

interface Props {
  provider: Provider;
  onProviderChange: (p: Provider) => void;
}

async function callBridge(action: 'qr' | 'status' | 'send' | 'logout', body?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('whatsapp-bridge', {
    body: { action, ...(body ?? {}) },
  });
  if (error) throw error;
  return data as any;
}

export function WhatsAppSettingsPanel({ provider, onProviderChange }: Props) {
  const [bridgeState, setBridgeState] = useState<BridgeState>('unknown');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const refreshOnce = async () => {
    try {
      const data = await callBridge('qr');
      setUnconfigured(false);
      setBridgeState((data?.state ?? 'unknown') as BridgeState);
      setQrDataUrl(data?.qr ?? null);
      if (data?.state === 'ready' || data?.state === 'authenticated') {
        stopPolling();
      }
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('not configured') || msg.includes('503')) setUnconfigured(true);
      setBridgeState('unknown');
      stopPolling();
    }
  };

  const startConnect = () => {
    setPolling(true);
    refreshOnce();
    pollRef.current = window.setInterval(refreshOnce, 3000);
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await callBridge('logout');
      toast.success('WhatsApp disconnected');
      setBridgeState('disconnected');
      setQrDataUrl(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  // Initial status check
  useEffect(() => {
    refreshOnce();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel: Record<BridgeState, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ready: { label: 'Connected', variant: 'default' },
    authenticated: { label: 'Connecting…', variant: 'secondary' },
    qr: { label: 'Awaiting Scan', variant: 'secondary' },
    disconnected: { label: 'Disconnected', variant: 'outline' },
    unknown: { label: 'Unknown', variant: 'outline' },
  };

  const status = statusLabel[bridgeState];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> WhatsApp Delivery Provider
          </CardTitle>
          <CardDescription>
            Choose which channel sends visitor approval messages on WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label className="text-base font-medium">Use WhatsApp Web (Demo)</Label>
              <p className="text-sm text-muted-foreground">
                When OFF, messages are sent through Twilio (production). When ON, messages
                are sent from your scanned WhatsApp number via the bridge.
              </p>
            </div>
            <Switch
              checked={provider === 'whatsapp_web'}
              onCheckedChange={(v) => onProviderChange(v ? 'whatsapp_web' : 'twilio')}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active provider:</span>
            <Badge variant={provider === 'twilio' ? 'default' : 'secondary'}>
              {provider === 'twilio' ? 'Twilio (Production)' : 'WhatsApp Web (Demo)'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Demo only — not for production</AlertTitle>
        <AlertDescription>
          WhatsApp Web automation violates WhatsApp's Terms of Service and the connected
          number may be banned without notice. Use a dedicated demo SIM, never your
          personal or business number. For production, switch back to Twilio.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" /> WhatsApp Web Connection
              </CardTitle>
              <CardDescription>
                Scan the QR with WhatsApp → Settings → Linked Devices → Link a Device.
              </CardDescription>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {unconfigured && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Bridge server not configured</AlertTitle>
              <AlertDescription>
                Set the <code>WHATSAPP_BRIDGE_URL</code> and <code>WHATSAPP_BRIDGE_API_KEY</code>{' '}
                secrets in Lovable, then deploy the bridge from the <code>whatsapp-bridge/</code>{' '}
                folder (see its README). For a quick demo, run it locally and expose it with ngrok.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6 min-h-[280px]">
            {bridgeState === 'ready' || bridgeState === 'authenticated' ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="font-medium">WhatsApp is connected</p>
                <p className="text-sm text-muted-foreground">
                  Approval messages will be sent from your scanned number when the
                  provider toggle is set to WhatsApp Web (Demo).
                </p>
              </div>
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={qrDataUrl}
                  alt="WhatsApp Web QR"
                  className="h-64 w-64 rounded-md bg-white p-2"
                />
                <p className="text-sm text-muted-foreground">
                  Open WhatsApp on your phone → Linked Devices → Link a Device.
                </p>
              </div>
            ) : polling ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Waiting for bridge to generate QR…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <QrCode className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No active session. Click <strong>Connect WhatsApp</strong> to generate a QR.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {bridgeState === 'ready' || bridgeState === 'authenticated' ? (
              <Button variant="destructive" onClick={disconnect} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Disconnect
              </Button>
            ) : (
              <Button onClick={startConnect} disabled={polling || unconfigured} className="gap-2">
                {polling ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {polling ? 'Polling…' : 'Connect WhatsApp'}
              </Button>
            )}
            <Button variant="outline" onClick={refreshOnce} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh status
            </Button>
            {polling && (
              <Button variant="ghost" onClick={stopPolling}>Stop polling</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
