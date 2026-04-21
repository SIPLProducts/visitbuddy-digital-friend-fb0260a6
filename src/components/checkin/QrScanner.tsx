import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, StopCircle, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  onScan: (data: { visitorId: string; name: string; timestamp: string; action?: string }) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

const FACING_KEY = 'qr-scanner-facing-mode';
const LEGACY_DEVICE_KEY = 'qr-scanner-camera-id';

type FacingMode = 'environment' | 'user';

function readStoredFacing(): FacingMode {
  try {
    const v = localStorage.getItem(FACING_KEY);
    if (v === 'user' || v === 'environment') return v;
  } catch {}
  return 'environment';
}

function describeCamera(label: string, index: number): string {
  if (!label) return `Camera ${index + 1}`;
  const lower = label.toLowerCase();
  if (/back|rear|environment/.test(lower)) return 'Back camera';
  if (/front|user|face/.test(lower)) return 'Front camera';
  return label;
}

export function QrScanner({ onScan, isScanning, onToggleScanning }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isCleaningUpRef = useRef(false);
  const hasHandledScanRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [facingMode, setFacingMode] = useState<FacingMode>(readStoredFacing);

  // Clear legacy storage key on mount
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_DEVICE_KEY); } catch {}
  }, []);

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
        // Ignore further decodes once we've accepted one for this session
        if (hasHandledScanRef.current) return;

        try {
          const data = JSON.parse(decodedText);
          if (data.visitorId) {
            hasHandledScanRef.current = true;
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

  const handleStartError = (err: any) => {
    const errStr = String(err?.message ?? err);
    console.error('[QrScanner] All camera attempts failed:', errStr, err);
    if (!isMountedRef.current) return;
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
  };

  const startWithConfig = async (config: any) => {
    setError(null);
    setIsInitializing(true);
    hasHandledScanRef.current = false;
    onToggleScanning(true);

    try {
      await cleanupScanner();
      await new Promise(resolve => setTimeout(resolve, 150));
      if (!isMountedRef.current) return;

      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) throw new Error('Scanner container not found');
      readerElement.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader', { verbose: false } as any);
      scannerRef.current = scanner;

      await startScanWithConstraints(scanner, config);
    } catch (err: any) {
      handleStartError(err);
      onToggleScanning(false);
      await cleanupScanner();
    } finally {
      if (isMountedRef.current) setIsInitializing(false);
    }
  };

  const startScanning = async (overrideFacing?: FacingMode) => {
    if (isInitializing || isCleaningUpRef.current) return;

    setError(null);
    const chosen: FacingMode = overrideFacing ?? facingMode;

    // Best-effort enumeration so we can populate the secondary picker
    // and fall back to a deviceId if facingMode constraints fail.
    let cams: Array<{ id: string; label: string }> = [];
    try {
      const result = await Html5Qrcode.getCameras();
      cams = (result || []).map((c) => ({ id: c.id, label: c.label || '' }));
      setCameras(cams);
    } catch (enumErr) {
      console.warn('[QrScanner] getCameras() failed:', String(enumErr));
    }

    setIsInitializing(true);
    hasHandledScanRef.current = false;
    onToggleScanning(true);

    try {
      await cleanupScanner();
      await new Promise(resolve => setTimeout(resolve, 150));
      if (!isMountedRef.current) return;

      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) throw new Error('Scanner container not found');
      readerElement.innerHTML = '';

      const scanner = new Html5Qrcode('qr-reader', { verbose: false } as any);
      scannerRef.current = scanner;

      const opposite: FacingMode = chosen === 'environment' ? 'user' : 'environment';
      const attempts: Array<{ label: string; config: any }> = [
        { label: `${chosen} (preferred)`, config: { facingMode: { ideal: chosen } } },
        { label: `${opposite} (fallback)`, config: { facingMode: { ideal: opposite } } },
      ];
      for (const c of cams) {
        attempts.push({ label: `deviceId ${c.label || c.id}`, config: c.id });
      }
      let lastErr: unknown = null;
      let started = false;
      for (const attempt of attempts) {
        try {
          await startScanWithConstraints(scanner, attempt.config);
          started = true;
          break;
        } catch (attemptErr) {
          console.warn('[QrScanner] attempt failed:', attempt.label, String(attemptErr));
          lastErr = attemptErr;
        }
      }
      if (!started) throw lastErr ?? new Error('Could not start camera');
    } catch (err: any) {
      handleStartError(err);
      onToggleScanning(false);
      await cleanupScanner();
    } finally {
      if (isMountedRef.current) setIsInitializing(false);
    }
  };

  const selectCamera = async (deviceId: string) => {
    await startWithConfig(deviceId);
  };

  const handleFacingChange = async (next: FacingMode) => {
    if (next === facingMode && (isScanning || isInitializing)) return;
    setFacingMode(next);
    try { localStorage.setItem(FACING_KEY, next); } catch {}
    if (isScanning || isInitializing) {
      await stopScanning();
      await new Promise((r) => setTimeout(r, 150));
      await startScanning(next);
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
      {/* Always-visible Front/Back camera toggle */}
      <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full mb-4">
        <button
          type="button"
          onClick={() => handleFacingChange('environment')}
          disabled={isInitializing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
            facingMode === 'environment'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Camera className="h-3.5 w-3.5" />
          Back camera
        </button>
        <button
          type="button"
          onClick={() => handleFacingChange('user')}
          disabled={isInitializing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
            facingMode === 'user'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <SwitchCamera className="h-3.5 w-3.5" />
          Front camera
        </button>
      </div>

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

      {showPicker && cameras.length > 1 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground mb-2">Choose a camera</p>
          <div className="flex flex-wrap justify-center gap-2">
            {cameras.map((cam, idx) => (
              <Button
                key={cam.id}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => selectCamera(cam.id)}
              >
                <Camera className="h-3.5 w-3.5" />
                {describeCamera(cam.label, idx)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-semibold text-foreground mb-2">
        {isScanning ? 'Scanning...' : isInitializing ? 'Initializing...' : showPicker ? 'Select Camera' : 'Ready to Scan'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isScanning
          ? "Point the camera at a visitor's WhatsApp badge QR code"
          : showPicker
          ? "Pick which camera to use for scanning"
          : "Click the button below to activate the camera and scan a visitor's QR code"
        }
      </p>

      {isScanning ? (
        <div className="flex flex-col items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={stopScanning}>
            <StopCircle className="h-4 w-4" />
            Stop Scanning
          </Button>
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Switch camera
            </button>
          )}
        </div>
      ) : (
        <Button className="gap-2" onClick={startScanning} disabled={isInitializing}>
          <Camera className="h-4 w-4" />
          {isInitializing ? 'Starting...' : 'Start Scanning'}
        </Button>
      )}
    </div>
  );
}
