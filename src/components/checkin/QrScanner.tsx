import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, StopCircle, AlertCircle, SwitchCamera, ChevronDown, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QrScannerProps {
  onScan: (data: { visitorId: string; name: string; timestamp: string; action?: string }) => void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
}

const FACING_KEY = 'qr-scanner-facing-mode';
type FacingMode = 'environment' | 'user';

type DiagnosticKind =
  | 'insecure'
  | 'unsupported'
  | 'permission_denied'
  | 'no_camera'
  | 'single_camera'
  | 'in_use'
  | 'rear_unavailable'
  | 'iframe_blocked'
  | null;

type DiagnosticSeverity = 'error' | 'warning';

interface DiagnosticInfo {
  kind: Exclude<DiagnosticKind, null>;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
}

const DIAGNOSTICS: Record<Exclude<DiagnosticKind, null>, Omit<DiagnosticInfo, 'kind'>> = {
  insecure: {
    severity: 'error',
    title: 'Camera blocked — insecure connection',
    message:
      'Cameras only work over HTTPS. Open this app from https://… (not http:// or an IP address) and try again.',
  },
  unsupported: {
    severity: 'error',
    title: 'This browser does not support camera access',
    message:
      'Use Chrome, Edge, Safari, or Firefox (latest version). In-app browsers (Instagram, LinkedIn, Gmail) often block cameras — open this link in your real browser.',
  },
  permission_denied: {
    severity: 'error',
    title: 'Camera permission was denied',
    message:
      'Tap the lock/camera icon in your browser address bar → set Camera to Allow → reload this page. On iOS: Settings → Safari → Camera → Allow.',
  },
  no_camera: {
    severity: 'error',
    title: 'No camera detected on this device',
    message: 'Connect a webcam or use a phone/tablet with a built-in camera.',
  },
  single_camera: {
    severity: 'warning',
    title: 'Only one camera detected',
    message:
      'This device has a single lens, so both Back and Front pills will open the same camera. The toggle is only useful on phones with two cameras.',
  },
  in_use: {
    severity: 'error',
    title: 'Camera is in use by another app',
    message:
      'Close Zoom, Teams, WhatsApp Web, or any other tab using the camera, then tap Start Scanning again.',
  },
  rear_unavailable: {
    severity: 'warning',
    title: 'Rear camera unavailable',
    message: 'Falling back to the front lens. (Common on laptops and tablets.)',
  },
  iframe_blocked: {
    severity: 'error',
    title: 'Embedded view is blocking the camera',
    message: 'Open the app in its own browser tab and try again.',
  },
};

function readStoredFacing(): FacingMode {
  try {
    const v = localStorage.getItem(FACING_KEY);
    if (v === 'user' || v === 'environment') return v;
  } catch {}
  return 'environment';
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
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

  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [showDiagPanel, setShowDiagPanel] = useState(false);
  const [videoInputCount, setVideoInputCount] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [secureContext, setSecureContext] = useState<boolean>(true);
  const [getUserMediaAvailable, setGetUserMediaAvailable] = useState<boolean>(true);

  const setDiag = (kind: DiagnosticKind) => {
    if (kind === null) {
      setDiagnostic(null);
      return;
    }
    setDiagnostic({ kind, ...DIAGNOSTICS[kind] });
  };

  const probeEnvironment = useCallback(async (): Promise<DiagnosticKind> => {
    const secure = typeof window !== 'undefined' ? window.isSecureContext : true;
    setSecureContext(secure);

    const hasGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setGetUserMediaAvailable(hasGUM);

    if (!secure) return 'insecure';
    if (!hasGUM) return 'unsupported';

    // Permissions API (best-effort; not supported on Safari for camera)
    let permState = 'unknown';
    try {
      const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
      if (status?.state) permState = status.state;
    } catch {}
    setPermissionState(permState);
    if (permState === 'denied') return 'permission_denied';

    // Enumerate devices (labels may be empty until permission is granted)
    let count: number | null = null;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      count = devices.filter((d) => d.kind === 'videoinput').length;
    } catch {}
    setVideoInputCount(count);

    if (count === 0) return 'no_camera';
    if (count === 1) return 'single_camera';

    return null;
  }, []);

  // Initial probe on mount
  useEffect(() => {
    isMountedRef.current = true;
    probeEnvironment().then((kind) => {
      if (!isMountedRef.current) return;
      setDiag(kind);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [probeEnvironment]);

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
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleStartError = (err: any): DiagnosticKind => {
    const errStr = String(err?.message ?? err);
    console.error('[QrScanner] camera error:', errStr, err);
    let message = errStr || 'Could not start camera';
    let diagKind: DiagnosticKind = null;

    if (err?.name === 'NotAllowedError' || /permission|denied|notallowed/i.test(errStr)) {
      message = 'Camera permission denied. Please allow camera access in your browser settings.';
      diagKind = 'permission_denied';
    } else if (err?.name === 'NotFoundError' || /not\s*found|no camera|devices? found/i.test(errStr)) {
      message = 'No camera found on this device.';
      diagKind = 'no_camera';
    } else if (err?.name === 'NotReadableError' || /in use|notreadable|could not start video/i.test(errStr)) {
      message = 'Camera is in use by another app. Close other apps and retry.';
      diagKind = 'in_use';
    } else if (err?.name === 'SecurityError' || /https|secure/i.test(errStr)) {
      message = 'Camera blocked. The page must be served over HTTPS.';
      diagKind = isInIframe() ? 'iframe_blocked' : 'insecure';
    }
    if (isMountedRef.current) {
      setError(message);
      if (diagKind) setDiag(diagKind);
    }
    return diagKind;
  };

  const startScanning = async (overrideFacing?: FacingMode) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    setIsInitializing(true);
    hasHandledScanRef.current = false;

    const chosen: FacingMode = overrideFacing ?? facingMode;

    try {
      stopStream();

      // Re-probe so we surface the latest state
      const probeKind = await probeEnvironment();
      if (probeKind === 'insecure' || probeKind === 'unsupported' ||
          probeKind === 'permission_denied' || probeKind === 'no_camera') {
        setDiag(probeKind);
        throw new Error(DIAGNOSTICS[probeKind].title);
      }

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const video = videoRef.current;
      if (!video) throw new Error('Video element not ready');

      let stream: MediaStream;
      let usedFallback = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: chosen } },
          audio: false,
        });
      } catch (firstErr: any) {
        if (firstErr?.name === 'NotReadableError') throw firstErr;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: chosen } },
            audio: false,
          });
          if (chosen === 'environment') {
            usedFallback = true;
          }
        } catch (secondErr: any) {
          if (secondErr?.name === 'NotReadableError') throw secondErr;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (chosen === 'environment') usedFallback = true;
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

      // Re-enumerate after permission grant for accurate count
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const count = devices.filter((d) => d.kind === 'videoinput').length;
        setVideoInputCount(count);
        if (count === 1 && diagnostic?.kind !== 'rear_unavailable') {
          setDiag('single_camera');
        } else if (usedFallback) {
          setDiag('rear_unavailable');
        } else if (count > 1 && (diagnostic?.kind === 'single_camera' || diagnostic?.kind === 'no_camera')) {
          setDiag(null);
        }
      } catch {
        if (usedFallback) setDiag('rear_unavailable');
      }

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

  const copyDiagnostics = async () => {
    const lines = [
      `Secure context: ${secureContext ? 'yes' : 'no'}`,
      `getUserMedia available: ${getUserMediaAvailable ? 'yes' : 'no'}`,
      `Permission state: ${permissionState}`,
      `Video inputs detected: ${videoInputCount ?? 'unknown'}`,
      `In iframe: ${isInIframe() ? 'yes' : 'no'}`,
      `User-Agent: ${navigator.userAgent}`,
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Diagnostics copied to clipboard');
    } catch {
      toast.error('Could not copy. Please screenshot the panel.');
    }
  };

  // Disable controls when the environment fundamentally can't work
  const hardBlocked =
    diagnostic?.kind === 'insecure' ||
    diagnostic?.kind === 'unsupported' ||
    diagnostic?.kind === 'no_camera' ||
    diagnostic?.kind === 'iframe_blocked';
  const onlyOneCamera = videoInputCount === 1;
  const inactivePillTitle = onlyOneCamera ? 'Only one camera on this device.' : undefined;
  const startBlockedTitle = hardBlocked ? diagnostic?.title : undefined;

  return (
    <div className="bg-card rounded-xl border border-border p-6 text-center">
      {/* Diagnostic Banner */}
      {diagnostic && (
        <Alert
          className={cn(
            'mb-4 text-left',
            diagnostic.severity === 'error'
              ? 'border-destructive/50 text-destructive [&>svg]:text-destructive'
              : 'border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400'
          )}
        >
          {diagnostic.severity === 'error' ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          <AlertTitle>{diagnostic.title}</AlertTitle>
          <AlertDescription className="text-foreground/80">{diagnostic.message}</AlertDescription>
        </Alert>
      )}

      {/* Camera toggle pills */}
      <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full mb-4">
        <button
          type="button"
          onClick={() => handleFacingChange('environment')}
          disabled={isInitializing || hardBlocked}
          aria-disabled={onlyOneCamera && facingMode !== 'environment'}
          title={facingMode !== 'environment' ? inactivePillTitle : undefined}
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
          disabled={isInitializing || hardBlocked}
          aria-disabled={onlyOneCamera && facingMode !== 'user'}
          title={facingMode !== 'user' ? inactivePillTitle : undefined}
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

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowDiagPanel((v) => !v)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground inline-flex items-center gap-1"
        >
          Camera not switching?
          <ChevronDown className={cn('h-3 w-3 transition-transform', showDiagPanel && 'rotate-180')} />
        </button>
      </div>

      {showDiagPanel && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-left text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Secure context</span><span>{secureContext ? '✅' : '❌'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">getUserMedia available</span><span>{getUserMediaAvailable ? '✅' : '❌'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Permission state</span><span>{permissionState}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Video inputs detected</span><span>{videoInputCount ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">In iframe</span><span>{isInIframe() ? 'yes' : 'no'}</span></div>
          <div className="text-muted-foreground break-all pt-1 border-t border-border/50">
            <span className="block">User-Agent:</span>
            <span className="text-foreground/80">{navigator.userAgent.slice(0, 140)}{navigator.userAgent.length > 140 ? '…' : ''}</span>
          </div>
          <div className="pt-2">
            <Button size="sm" variant="outline" className="gap-2 h-8" onClick={copyDiagnostics}>
              <Copy className="h-3 w-3" />
              Copy diagnostics
            </Button>
          </div>
        </div>
      )}

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

      {error && !diagnostic && (
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
        <Button
          className="gap-2"
          onClick={() => startScanning()}
          disabled={isInitializing || hardBlocked}
          title={startBlockedTitle}
        >
          <Camera className="h-4 w-4" />
          {isInitializing ? 'Starting...' : 'Start Scanning'}
        </Button>
      )}
    </div>
  );
}
