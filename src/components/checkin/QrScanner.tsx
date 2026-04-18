import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, StopCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QrScannerProps {
  onScan: (data: { visitorId: string; name: string; timestamp: string; action?: string }) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

export function QrScanner({ onScan, isScanning, onToggleScanning }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isCleaningUpRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Safe cleanup function
  const cleanupScanner = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    } finally {
      isCleaningUpRef.current = false;
    }
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupScanner();
    };
  }, [cleanupScanner]);

  const startScanWithConstraints = async (
    scanner: Html5Qrcode,
    cameraConfig: MediaTrackConstraints | { facingMode: string }
  ) => {
    await scanner.start(
      cameraConfig as any,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      (decodedText) => {
        if (!isMountedRef.current) return;

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
  };

  const startScanning = async () => {
    if (isInitializing || isCleaningUpRef.current) return;

    setError(null);
    setIsInitializing(true);

    // Flip UI state FIRST so the container becomes visible before camera starts
    onToggleScanning(true);

    try {
      // Clean up any existing scanner first
      await cleanupScanner();

      // Wait for the container to actually be laid out (visible) in the DOM
      await new Promise(resolve => setTimeout(resolve, 150));

      if (!isMountedRef.current) return;

      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        throw new Error('Scanner container not found');
      }

      // Clear any leftover content
      readerElement.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader', { verbose: false } as any);
      scannerRef.current = scanner;

      // Try preferred environment-facing camera first; fall back to any camera
      try {
        await startScanWithConstraints(scanner, { facingMode: { ideal: 'environment' } } as any);
      } catch (innerErr: any) {
        console.warn('Primary camera constraint failed, retrying with fallback:', innerErr?.name || innerErr?.message);
        if (innerErr?.name === 'OverconstrainedError' || innerErr?.name === 'NotFoundError' || innerErr?.name === 'NotReadableError') {
          // Relax constraints
          await startScanWithConstraints(scanner, { facingMode: 'user' });
        } else {
          throw innerErr;
        }
      }
    } catch (err: any) {
      console.error('Scanner error:', err?.name, err?.message, err);
      if (isMountedRef.current) {
        let message = err?.message || 'Could not start camera';
        if (err?.name === 'NotAllowedError' || /permission/i.test(message)) {
          message = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err?.name === 'NotFoundError') {
          message = 'No camera found on this device.';
        } else if (err?.name === 'NotReadableError') {
          message = 'Camera is in use by another app. Close other apps and retry.';
        } else if (err?.name === 'SecurityError') {
          message = 'Camera blocked. The page must be served over HTTPS.';
        }
        setError(message);
        onToggleScanning(false);
        await cleanupScanner();
      }
    } finally {
      if (isMountedRef.current) {
        setIsInitializing(false);
      }
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error('Stop scanning error:', err);
    }

    if (isMountedRef.current) {
      onToggleScanning(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 text-center">
      {/* Scanner container - always rendered so html5-qrcode can attach video */}
      <div
        ref={containerRef}
        className={`mx-auto mb-4 overflow-hidden rounded-lg relative ${
          isScanning || isInitializing
            ? 'w-72 h-72'
            : 'w-48 h-48 bg-muted flex items-center justify-center'
        }`}
      >
        {/* Always-mounted target div for html5-qrcode */}
        <div
          id="qr-reader"
          style={{
            width: '100%',
            height: '100%',
            minHeight: isScanning || isInitializing ? '288px' : '0',
            visibility: isScanning || isInitializing ? 'visible' : 'hidden',
            position: isScanning || isInitializing ? 'relative' : 'absolute',
            inset: 0,
          }}
        />
        {!isScanning && !isInitializing && (
          <Camera className="h-16 w-16 text-muted-foreground relative z-10" />
        )}
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80 backdrop-blur-sm z-10">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Starting camera...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <h3 className="font-semibold text-foreground mb-2">
        {isScanning ? 'Scanning...' : isInitializing ? 'Initializing...' : 'Ready to Scan'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isScanning
          ? "Point the camera at a visitor's WhatsApp badge QR code"
          : "Click the button below to activate the camera and scan a visitor's QR code"
        }
      </p>

      {isScanning ? (
        <Button variant="outline" className="gap-2" onClick={stopScanning}>
          <StopCircle className="h-4 w-4" />
          Stop Scanning
        </Button>
      ) : (
        <Button className="gap-2" onClick={startScanning} disabled={isInitializing}>
          <Camera className="h-4 w-4" />
          {isInitializing ? 'Starting...' : 'Start Scanning'}
        </Button>
      )}
    </div>
  );
}
