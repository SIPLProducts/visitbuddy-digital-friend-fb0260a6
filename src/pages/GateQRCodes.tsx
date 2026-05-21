import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Printer, Download, MapPin, Clock, Users, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { useUserRoles } from '@/hooks/useUserRoles';
interface Gate {
  id: string;
  name: string;
  building: string | null;
  operating_hours: string | null;
  current_visitors: number | null;
  status: string | null;
  location?: {
    name: string;
  } | null;
}

export default function GateQRCodes() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { selectedLocationId, isAllLocations, rolesLoading } = useSelectedLocation();
  const { userRoles, isHoAdmin } = useUserRoles();
  const [currentLocationName, setCurrentLocationName] = useState<string>('');

  // Encode QR with the current origin so on-prem deployments stay on their own
  // domain. Operators can still override via VITE_PUBLIC_URL when the admin UI
  // and visitor self-service portal live on different hosts.
  const baseUrl =
    import.meta.env.VITE_PUBLIC_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    if (rolesLoading) return;
    fetchGates();
  }, [selectedLocationId, isAllLocations, rolesLoading]);

  const fetchGates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('gates')
        .select('id, name, building, operating_hours, current_visitors, status, location:locations(name)')
        .eq('status', 'active')
        .order('name');

      if (!isAllLocations && selectedLocationId) {
        query = query.eq('location_id', selectedLocationId);
      } else if (!isHoAdmin) {
        const accessibleIds = userRoles.map(r => r.location_id).filter(Boolean);
        if (accessibleIds.length === 0) {
          setGates([]);
          setCurrentLocationName('');
          return;
        }
        query = query.in('location_id', accessibleIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGates(data || []);
      if (!isAllLocations && data && data.length > 0) {
        setCurrentLocationName(data[0].location?.name || '');
      } else {
        setCurrentLocationName('');
      }
    } catch (error: any) {
      console.error('Error fetching gates:', error);
      toast.error('Failed to load gates');
    } finally {
      setLoading(false);
    }
  };

  const getSelfServiceUrl = (gateId: string) => {
    return `${baseUrl}/self-service?gate=${gateId}`;
  };

  const getQRCodeUrl = (gateId: string, size: number = 200) => {
    const selfServiceUrl = getSelfServiceUrl(gateId);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(selfServiceUrl)}&format=png`;
  };

  const handleCopyLink = async (gateId: string) => {
    const url = getSelfServiceUrl(gateId);
    await navigator.clipboard.writeText(url);
    setCopiedId(gateId);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQR = (gate: Gate) => {
    const qrUrl = getQRCodeUrl(gate.id, 500);
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR-${gate.name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded');
  };

  const handlePrintQR = (gate: Gate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      return;
    }

    const qrUrl = getQRCodeUrl(gate.id, 400);
    const selfServiceUrl = getSelfServiceUrl(gate.id);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${gate.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
            background: white;
          }
          .container {
            text-align: center;
            max-width: 500px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #0891b2;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 24px;
          }
          .qr-container {
            padding: 24px;
            border: 3px solid #0891b2;
            border-radius: 16px;
            display: inline-block;
            margin-bottom: 24px;
          }
          .qr-code {
            width: 300px;
            height: 300px;
          }
          .gate-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 8px;
          }
          .gate-info {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 16px;
          }
          .instructions {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
            color: #475569;
          }
          .instructions h4 {
            color: #1e293b;
            margin-bottom: 8px;
          }
          .url {
            font-size: 11px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 16px;
          }
          @media print {
            body { padding: 20px; }
            .qr-code { width: 250px; height: 250px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">Re Sustainability</div>
          <div class="subtitle">Visitor Self Check-in</div>
          
          <div class="qr-container">
            <img src="${qrUrl}" alt="QR Code" class="qr-code" />
          </div>
          
          <div class="gate-name">${gate.name}</div>
          ${gate.building ? `<div class="gate-info">${gate.building}</div>` : ''}
          ${gate.operating_hours ? `<div class="gate-info">Hours: ${gate.operating_hours}</div>` : ''}
          
          <div class="instructions">
            <h4>How to Check-in</h4>
            <p>1. Scan this QR code with your phone camera</p>
            <p>2. Fill in your visitor details</p>
            <p>3. Your host will be notified automatically</p>
          </div>
          
          <div class="url">${selfServiceUrl}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenSelfService = (gateId: string) => {
    window.open(getSelfServiceUrl(gateId), '_blank');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gate QR Codes</h1>
            <p className="text-muted-foreground">
              {currentLocationName
                ? `Showing gates for ${currentLocationName}`
                : isAllLocations
                ? 'Showing gates across all locations'
                : 'Generate and print QR codes for visitor self check-in at each gate'}
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">How Gate QR Codes Work</h3>
                <p className="text-sm text-muted-foreground">
                  Print and display these QR codes at each entry gate. Visitors can scan with their phone 
                  to access the self check-in form with the gate pre-selected. Their host will receive a 
                  WhatsApp notification upon check-in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gates Grid */}
        {gates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-2">No Active Gates Found</h3>
              <p className="text-muted-foreground text-sm">
                Add active gates in the Gates management page to generate QR codes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gates.map((gate) => (
              <Card key={gate.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {gate.name}
                  </CardTitle>
                  {(gate.building || gate.location?.name) && (
                    <CardDescription>
                      {gate.building && gate.building}
                      {gate.building && gate.location?.name && ' • '}
                      {gate.location?.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code Preview */}
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-lg border shadow-sm">
                      <img
                        src={getQRCodeUrl(gate.id)}
                        alt={`QR Code for ${gate.name}`}
                        className="w-40 h-40"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Gate Info */}
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    {gate.operating_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{gate.operating_hours}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{gate.current_visitors || 0} visitors</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintQR(gate)}
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadQR(gate)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(gate.id)}
                      className="w-full"
                    >
                      {copiedId === gate.id ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSelfService(gate.id)}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
