import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, MessageCircle, Power, QrCode, RefreshCw, Send, Zap, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type Provider = 'twilio' | 'whatsapp_web';
type BridgeState = 'disconnected' | 'qr' | 'authenticated' | 'ready' | 'unknown';

interface Props {
  provider: Provider;
  onProviderChange: (p: Provider) => void;
}

interface BridgeError {
  message: string;
  code?: string;
  upstreamStatus?: number;
  upstreamHost?: string;
  upstreamBody?: string;
  trailingSlash?: boolean;
  raw?: any;
}

async function callBridge(
  action: 'qr' | 'status' | 'send' | 'logout',
  body?: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke('whatsapp-bridge', {
    body: { action, ...(body ?? {}) },
  });
  // Edge function returned non-2xx — supabase-js puts the JSON body in error.context
  if (error) {
    let parsed: any = null;
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        parsed = await ctx.json();
      } else if (ctx && typeof ctx.text === 'function') {
        const t = await ctx.text();
        try { parsed = JSON.parse(t); } catch { parsed = { raw: t }; }
      }
    } catch {
      // ignore
    }
    const wrapped: BridgeError = {
      message: parsed?.error ?? error.message ?? 'Bridge call failed',
      code: parsed?.code,
      upstreamStatus: parsed?.upstreamStatus,
      upstreamHost: parsed?.upstreamHost,
      upstreamBody: parsed?.upstreamBody ?? parsed?.details,
      trailingSlash: parsed?.trailingSlash,
      raw: parsed ?? error,
    };
    throw wrapped;
  }
  return data as any;
}

export function WhatsAppSettingsPanel({ provider, onProviderChange }: Props) {
  const [bridgeState, setBridgeState] = useState<BridgeState>('unknown');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const [waking, setWaking] = useState(false);
  const [lastError, setLastError] = useState<BridgeError | null>(null);
  const [testPhone, setTestPhone] = useState('9182686448');
  const [testMessage, setTestMessage] = useState(
    '✅ Re Sustainability test — WhatsApp Web bridge is connected and sending from your scanned number.',
  );
  const [sending, setSending] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const refreshOnce = async (opts?: { timeoutMs?: number }) => {
    try {
      const data = await callBridge('qr', opts ? { timeoutMs: opts.timeoutMs } : undefined);
      setUnconfigured(false);
      setLastError(null);
      setBridgeState((data?.state ?? 'unknown') as BridgeState);
      setQrDataUrl(data?.qr ?? null);
      if (data?.state === 'ready' || data?.state === 'authenticated') {
        stopPolling();
      }
    } catch (e: any) {
      const err = e as BridgeError;
      setLastError(err);
      if (err.code === 'unconfigured') setUnconfigured(true);
      setBridgeState('unknown');
      stopPolling();
    }
  };

  const wakeBridge = async () => {
    setWaking(true);
    setLastError(null);
    try {
      // 75s gives Render free tier room for a full cold start
      const data = await callBridge('status', { timeoutMs: 75_000 });
      setUnconfigured(false);
      setBridgeState((data?.state ?? 'unknown') as BridgeState);
      toast.success(`Bridge awake — state: ${data?.state ?? 'unknown'}`);
      if (data?.state !== 'ready' && data?.state !== 'authenticated') {
        // Kick off QR polling so the UI can grab the QR/state next
        startConnect();
      }
    } catch (e: any) {
      const err = e as BridgeError;
      setLastError(err);
      if (err.code === 'unconfigured') setUnconfigured(true);
      toast.error(err.message ?? 'Failed to wake bridge');
    } finally {
      setWaking(false);
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
      const err = e as BridgeError;
      setLastError(err);
      toast.error(err.message ?? 'Failed to disconnect');
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

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.trim().startsWith('+')) return `+${digits}`;
    // Default to India country code if 10-digit local number
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  };

  const sendTest = async () => {
    const phone = normalizePhone(testPhone);
    if (!phone || !testMessage.trim()) {
      toast.error('Phone number and message are required');
      return;
    }
    if (bridgeState !== 'ready') {
      toast.error('WhatsApp is not ready yet. Wait for status: Connected.');
      return;
    }
    setSending(true);
    try {
      const data = await callBridge('send', { phone, message: testMessage });
      const id = data?.id ?? data?.messageId ?? '';
      toast.success(`Test message sent to ${phone}${id ? ` (id: ${id})` : ''}`);
    } catch (e: any) {
      const err = e as BridgeError;
      setLastError(err);
      toast.error(err.message ?? 'Failed to send test message');
    } finally {
      setSending(false);
    }
  };

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

          {lastError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                Bridge call failed
                {lastError.code ? ` — ${lastError.code}` : ''}
                {typeof lastError.upstreamStatus === 'number' ? ` (HTTP ${lastError.upstreamStatus})` : ''}
              </AlertTitle>
              <AlertDescription>
                <p className="text-sm">{lastError.message}</p>
                {lastError.code === 'timeout' && (
                  <p className="mt-1 text-xs">
                    Render free tier sleeps after 15 min idle and takes 30–60 s to wake. Click{' '}
                    <strong>Wake bridge</strong> below — it waits up to 75 s for the cold start.
                  </p>
                )}
                {lastError.code === 'unauthorized' && (
                  <p className="mt-1 text-xs">
                    The Lovable secret <code>WHATSAPP_BRIDGE_API_KEY</code> doesn't match the
                    Render env var <code>BRIDGE_API_KEY</code>. Make them identical.
                  </p>
                )}
                {lastError.code === 'unreachable' && (
                  <p className="mt-1 text-xs">
                    Edge function couldn't reach <code>{lastError.upstreamHost ?? 'the bridge'}</code>.
                    Check that <code>WHATSAPP_BRIDGE_URL</code> is correct (https://… no trailing slash).
                  </p>
                )}
                {lastError.trailingSlash && (
                  <p className="mt-1 text-xs">
                    ⚠️ <code>WHATSAPP_BRIDGE_URL</code> has a trailing <code>/</code> — strip it for cleanliness.
                  </p>
                )}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="mt-2 h-7 gap-1 px-2 text-xs">
                      <Bug className="h-3 w-3" /> Show diagnostics
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/50 p-2 text-[10px] leading-tight">
                      {JSON.stringify(
                        {
                          code: lastError.code,
                          upstreamStatus: lastError.upstreamStatus,
                          upstreamHost: lastError.upstreamHost,
                          trailingSlash: lastError.trailingSlash,
                          upstreamBody: lastError.upstreamBody,
                          message: lastError.message,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </AlertDescription>
            </Alert>
          )}

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
            <Button
              variant="secondary"
              onClick={wakeBridge}
              disabled={waking || unconfigured}
              className="gap-2"
            >
              {waking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {waking ? 'Waking (up to 75s)…' : 'Wake bridge'}
            </Button>
            <Button variant="outline" onClick={() => refreshOnce()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh status
            </Button>
            {polling && (
              <Button variant="ghost" onClick={stopPolling}>Stop polling</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Send Test Message
          </CardTitle>
          <CardDescription>
            Fire a one-off WhatsApp message through the scanned number to verify end-to-end delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Recipient phone</Label>
            <Input
              id="test-phone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="9182686448"
            />
            <p className="text-xs text-muted-foreground">
              10-digit numbers default to +91 (India). Include + and country code for others.
              Will send to: <span className="font-mono">{normalizePhone(testPhone) || '—'}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message">Message</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={sendTest}
            disabled={sending || bridgeState !== 'ready'}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send Test'}
          </Button>
          {bridgeState !== 'ready' && (
            <p className="text-xs text-muted-foreground">
              Connect WhatsApp first — the Send Test button activates when status is{' '}
              <strong>Connected</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
