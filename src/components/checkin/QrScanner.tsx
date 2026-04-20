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
  const hasHandledScanRef = useRef(false);
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

  const ensureVideoPlaying = async () => {
    // Wait one frame for html5-qrcode to inject the <video>
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const videoEl = document.querySelector<HTMLVideoElement>('#qr-reader video');
    if (!videoEl) {
      console.warn('[QrScanner] No video element found after start');
      return;
    }
    // Re-apply autoplay-required attributes (in case re-parenting stripped them)
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.setAttribute('autoplay', 'true');
    videoEl.muted = true;
    if (videoEl.paused) {
      try {
        await videoEl.play();
        console.log('[QrScanner] Forced video.play() succeeded');
      } catch (e) {
        console.error('[QrScanner] Forced video.play() failed:', String(e));
      }
    }
  };

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
    // Force playback after stream attaches (critical for iPad/tablet Safari)
    await ensureVideoPlaying();
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

      // Build ordered list of camera configs to try.
      // html5-qrcode only accepts: a string facingMode, { exact: ... }, or a deviceId string.
      const attempts: Array<{ label: string; config: any }> = [
        { label: 'environment (back)', config: { facingMode: 'environment' } },
        { label: 'user (front)', config: { facingMode: 'user' } },
      ];

      // Try to enumerate cameras for desktop fallback (devices without facingMode).
      try {
        const cams = await Html5Qrcode.getCameras();
        if (cams && cams.length > 0) {
          attempts.push({ label: `deviceId ${cams[0].label || cams[0].id}`, config: cams[0].id });
        }
      } catch (enumErr) {
        console.warn('getCameras() failed:', String(enumErr));
      }

      let lastErr: unknown = null;
      let started = false;
      for (const attempt of attempts) {
        try {
          console.log('[QrScanner] Trying camera:', attempt.label);
          await startScanWithConstraints(scanner, attempt.config);
          started = true;
          console.log('[QrScanner] Camera started:', attempt.label);
          break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          console.warn('[QrScanner] Attempt failed:', attempt.label, String(attemptErr));
        }
      }

      if (!started) {
        throw lastErr ?? new Error('Could not start camera');
      }
    } catch (err: any) {
      const errStr = String(err?.message ?? err);
      console.error('[QrScanner] All camera attempts failed:', errStr, err);
      if (isMountedRef.current) {
        let message = errStr || 'Could not start camera';
        if (err?.name === 'NotAllowedError' || /permission|denied|notallowed/i.test(errStr)) {
          message = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err?.name === 'NotFoundError' || /not\s*found|no camera|devices? found/i.test(errStr)) {
          message = 'No camera found on this device.';
        } else if (err?.name === 'NotReadableError' || /in use|notreadable|could not start video/i.test(errStr)) {
          message = 'Camera is in use by another app. Close other apps and retry.';
        } else if (err?.name === 'SecurityError' || /https|secure/i.test(errStr)) {
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
      {/* Stable scanner container - never changes size or visibility to keep video painting */}
      <div
        ref={containerRef}
        className="mx-auto mb-4 overflow-hidden rounded-lg relative w-72 h-72 bg-muted"
      >
        {/* Always-mounted, always-visible target div for html5-qrcode */}
        <div
          id="qr-reader"
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        />
        {/* Placeholder icon shown only when idle - sibling, not overlay */}
        {!isScanning && !isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Camera className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {/* Small corner spinner during init - does NOT cover the video */}
        {isInitializing && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/90 rounded-full px-3 py-1 shadow-sm">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Starting…</span>
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
