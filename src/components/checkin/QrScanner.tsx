import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Camera, StopCircle, AlertCircle, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  onScan: (data: { visitorId: string; name: string; timestamp: string; action?: string }) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

const FACING_KEY = 'qr-scanner-facing-mode';
type FacingMode = 'environment' | 'user';

function readStoredFacing(): FacingMode {
  try {
    const v = localStorage.getItem(FACING_KEY);
    if (v === 'user' || v === 'environment') return v;
  } catch {}
  return 'environment';
}

export function QrScanner({ onScan, isScanning, onToggleScanning }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const isMountedRef = useRef(true);
  const hasHandledScanRef = useRef(false);
  const startingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>(readStoredFacing);

  const stopStream = useCallback(() => {
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch {}
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopStream();
    };
  }, [stopStream]);

  const handleStartError = (err: any) => {
    const errStr = String(err?.message ?? err);
    console.error('[QrScanner] camera error:', errStr, err);
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
    if (isMountedRef.current) setError(message);
  };

  const startScanning = async (overrideFacing?: FacingMode) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    setIsInitializing(true);
    hasHandledScanRef.current = false;

    const chosen: FacingMode = overrideFacing ?? facingMode;

    try {
      // Tear down any prior stream
      stopStream();

      // Wait a frame so the <video> element is mounted
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const video = videoRef.current;
      if (!video) throw new Error('Video element not ready');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: chosen } },
          audio: false,
        });
      } catch (firstErr) {
        // Stricter exact match failed (often: requested lens not present).
        // Try the relaxed "ideal" form on the same side first.
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: chosen } },
            audio: false,
          });
          if (chosen === 'environment') {
            toast.message('Rear camera unavailable on this device — using available lens.');
          }
        } catch {
          // Final fallback: any video input.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { video.removeEventListener('loadedmetadata', onLoaded); resolve(); };
        const onErr = () => { video.removeEventListener('error', onErr); reject(new Error('Video load error')); };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onErr);
      });

      await video.play();

      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      controlsRef.current = await readerRef.current.decodeFromVideoElement(video, (result, _err, controls) => {
        if (!isMountedRef.current || hasHandledScanRef.current) return;
        if (!result) return;
        const text = result.getText();
        try {
          const data = JSON.parse(text);
          if (data.visitorId) {
            hasHandledScanRef.current = true;
            try { controls.stop(); } catch {}
            onScan(data);
            stopScanningInternal();
          } else {
            toast.error('Invalid QR code format');
          }
        } catch {
          toast.error('Could not parse QR code data');
        }
      });

      onToggleScanning(true);
    } catch (err: any) {
      handleStartError(err);
      stopStream();
      onToggleScanning(false);
    } finally {
      startingRef.current = false;
      if (isMountedRef.current) setIsInitializing(false);
    }
  };

  const stopScanningInternal = () => {
    stopStream();
    hasHandledScanRef.current = false;
    if (isMountedRef.current) onToggleScanning(false);
  };

  const stopScanning = async () => {
    stopScanningInternal();
  };

  const handleFacingChange = async (next: FacingMode) => {
    setFacingMode(next);
    try { localStorage.setItem(FACING_KEY, next); } catch {}
    if (!isScanning && !isInitializing) return;
    stopStream();
    onToggleScanning(false);
    await startScanning(next);
  };

  const checkAvailableCameras = async () => {
    try {
      // Some browsers hide labels (and even devices) until permission is granted.
      // Request a quick permission probe first so the count is accurate.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        probe.getTracks().forEach((t) => t.stop());
      } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      if (cams.length === 0) {
        toast.error('No video input devices detected. Check camera permissions.');
      } else if (cams.length === 1) {
        toast.message('Detected 1 video input — this device has only one camera, so both pills open the same lens.');
      } else {
        toast.success(`Detected ${cams.length} video inputs — front/back toggle should work.`);
      }
    } catch (e: any) {
      toast.error('Unable to list cameras: ' + (e?.message ?? 'unknown error'));
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 text-center">
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

      <p className="text-xs text-muted-foreground -mt-2 mb-3">
        If only one camera is available, both options open the same lens.{' '}
        <button
          type="button"
          onClick={checkAvailableCameras}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Camera not switching?
        </button>
      </p>

      <div className="mx-auto mb-4 overflow-hidden rounded-lg relative w-72 h-72 bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            'w-full h-full object-cover',
            !isScanning && !isInitializing && 'opacity-0'
          )}
        />
        {!isScanning && !isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Camera className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
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
        <div className="flex flex-col items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={stopScanning}>
            <StopCircle className="h-4 w-4" />
            Stop Scanning
          </Button>
        </div>
      ) : (
        <Button className="gap-2" onClick={() => startScanning()} disabled={isInitializing}>
          <Camera className="h-4 w-4" />
          {isInitializing ? 'Starting...' : 'Start Scanning'}
        </Button>
      )}
    </div>
  );
}
