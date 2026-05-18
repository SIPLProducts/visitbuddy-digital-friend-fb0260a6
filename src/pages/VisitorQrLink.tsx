import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2, QrCode } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';

interface VisitorQrData {
  visitor_id: string;
  name: string;
  company: string | null;
  purpose: string | null;
  status: string | null;
  gate?: { name: string | null } | null;
  host?: { name: string | null } | null;
}

export default function VisitorQrLink() {
  const { visitorCode } = useParams<{ visitorCode: string }>();
  const [visitor, setVisitor] = useState<VisitorQrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisitor = async () => {
      if (!visitorCode) {
        setError('Invalid visitor link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const { data, error: queryError } = await supabase
          .from('visitors')
          .select(`
            visitor_id, name, company, purpose, status,
            gate:gates(name),
            host:employees(name)
          `)
          .eq('visitor_id', visitorCode.toUpperCase())
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) {
          setError('Visitor QR link was not found.');
          return;
        }

        setVisitor(data as VisitorQrData);
      } catch (err: any) {
        setError(err.message || 'Could not open visitor QR.');
      } finally {
        setLoading(false);
      }
    };

    void fetchVisitor();
  }, [visitorCode]);

  const qrCodeUrl = useMemo(() => {
    if (!visitor) return '';
    const qrCodeData = encodeURIComponent(JSON.stringify({
      visitorId: visitor.visitor_id,
      name: visitor.name,
      action: 'checkin',
      timestamp: new Date().toISOString(),
    }));
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${qrCodeData}&format=png`;
  }, [visitor]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={reslLogo} alt="Re Sustainability logo" className="h-10 w-10 object-contain" />
            <CardTitle className="text-lg">Re Sustainability</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Visitor QR Access</p>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Opening QR code...</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-destructive">QR Link Error</h1>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          )}

          {!loading && visitor && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{visitor.name}</h1>
                <p className="font-mono text-sm text-muted-foreground mt-1">{visitor.visitor_id}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-left">
                {visitor.company && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium text-right">{visitor.company}</span>
                  </div>
                )}
                {visitor.host?.name && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Host</span>
                    <span className="font-medium text-right">{visitor.host.name}</span>
                  </div>
                )}
                {visitor.gate?.name && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Gate</span>
                    <span className="font-medium text-right">{visitor.gate.name}</span>
                  </div>
                )}
              </div>
              <img
                src={qrCodeUrl}
                alt={`Check-in QR code for ${visitor.name}`}
                className="w-72 h-72 max-w-full mx-auto rounded-lg border bg-background p-3"
              />
              <Button asChild className="w-full">
                <a href={qrCodeUrl} target="_blank" rel="noreferrer">Open QR Code</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}