import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, StopCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QrScannerProps {
  onScan: (data: { visitorId: string; name: string; timestamp: string }) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

export function QrScanner({ onScan, isScanning, onToggleScanning }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.visitorId) {
              onScan(data);
              stopScanning();
            } else {
              toast.error('Invalid QR code format');
            }
          } catch {
            toast.error('Could not parse QR code data');
          }
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      );

      onToggleScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Could not start camera');
      onToggleScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    onToggleScanning(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 text-center">
      <div 
        id="qr-reader" 
        className={`mx-auto mb-4 overflow-hidden rounded-lg ${isScanning ? 'w-72 h-72' : 'w-48 h-48 bg-muted flex items-center justify-center'}`}
      >
        {!isScanning && (
          <Camera className="h-16 w-16 text-muted-foreground" />
        )}
      </div>

      {error && (
        <div className="flex items-center justify-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <h3 className="font-semibold text-foreground mb-2">
        {isScanning ? 'Scanning...' : 'Ready to Scan'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isScanning 
          ? 'Point the camera at a visitor\'s WhatsApp badge QR code'
          : 'Click the button below to activate the camera and scan a visitor\'s QR code'
        }
      </p>

      {isScanning ? (
        <Button variant="outline" className="gap-2" onClick={stopScanning}>
          <StopCircle className="h-4 w-4" />
          Stop Scanning
        </Button>
      ) : (
        <Button className="gap-2" onClick={startScanning}>
          <Camera className="h-4 w-4" />
          Start Scanning
        </Button>
      )}
    </div>
  );
}
