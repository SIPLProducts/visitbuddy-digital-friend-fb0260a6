import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X, AlertCircle, Upload, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onCancel?: () => void;
  className?: string;
  autoStart?: boolean;
}

const DEVICE_STORAGE_KEY = 'camera-capture-device-id';
const FACING_STORAGE_KEY = 'camera-capture-facing-mode';

type FacingMode = 'environment' | 'user';

function labelForDevice(device: MediaDeviceInfo, index: number): string {
  if (device.label) {
    // Shorten common verbose labels
    return device.label
      .replace(/\s*\(.*?\)\s*$/, '')
      .replace(/camera\s*2,?\s*facing\s*back/i, 'Back camera')
      .replace(/camera\s*2,?\s*facing\s*front/i, 'Front camera')
      .trim() || `Camera ${index + 1}`;
  }
  return `Camera ${index + 1}`;
}

export function CameraCapture({ onCapture, onCancel, className, autoStart = true }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DEVICE_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [facingMode, setFacingMode] = useState<FacingMode>(() => {
    try {
      const saved = localStorage.getItem(FACING_STORAGE_KEY);
      return saved === 'user' ? 'user' : 'environment';
    } catch {
      return 'environment';
    }
  });
  const [activeFacing, setActiveFacing] = useState<FacingMode>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsVideoReady(false);
  }, []);

  const enumerateVideoDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setVideoDevices(videoInputs);
      }
    } catch (e) {
      console.warn('enumerateDevices failed:', e);
    }
  }, []);

  const startCamera = useCallback(async (deviceIdOverride?: string, facingOverride?: FacingMode) => {
    if (isStarting) return;

    setIsStarting(true);
    setError(null);
    setIsVideoReady(false);

    // Stop any existing stream first
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device/browser');
      }

      const targetDeviceId = deviceIdOverride !== undefined ? deviceIdOverride : selectedDeviceId;
      const targetFacing: FacingMode = facingOverride ?? facingMode;

      // Build constraint chain: explicit deviceId -> requested facingMode -> opposite -> any
      const constraintChain: MediaStreamConstraints[] = [];
      // Only honor saved deviceId when caller didn't ask for a specific facingMode
      if (targetDeviceId && !facingOverride) {
        constraintChain.push({
          video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }
      constraintChain.push({
        video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      constraintChain.push({
        video: { facingMode: targetFacing === 'environment' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      constraintChain.push({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      let mediaStream: MediaStream | null = null;
      let lastErr: any = null;
      for (const constraints of constraintChain) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err;
          console.warn('getUserMedia attempt failed:', err);
        }
      }
      if (!mediaStream) throw lastErr || new Error('Unable to start camera');

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;

      // Determine which deviceId we actually got
      const activeTrack = mediaStream.getVideoTracks()[0];
      const settings = activeTrack?.getSettings?.();
      const activeDeviceId = settings?.deviceId;
      const settingsFacing = (settings as any)?.facingMode as FacingMode | undefined;
      // Trust the actual facingMode from the track, fall back to what we asked for
      const resolvedFacing: FacingMode = settingsFacing === 'user' || settingsFacing === 'environment'
        ? settingsFacing
        : targetFacing;
      if (isMountedRef.current) {
        setActiveFacing(resolvedFacing);
      }
      if (activeDeviceId && isMountedRef.current) {
        setSelectedDeviceId(activeDeviceId);
        try {
          localStorage.setItem(DEVICE_STORAGE_KEY, activeDeviceId);
        } catch {
          /* ignore */
        }
      }

      // Wait a tick for the video element to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Enumerate devices now that permission is granted (labels will be populated)
      enumerateVideoDevices();
    } catch (err: any) {
      console.error('Camera error:', err);
      if (!isMountedRef.current) return;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Try uploading a photo instead.');
        setActiveTab('upload');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Try uploading a photo instead.');
        setActiveTab('upload');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is in use. Try uploading a photo instead.');
        setActiveTab('upload');
      } else if (err.name === 'OverconstrainedError') {
        // Saved deviceId / facingMode no longer valid — clear and retry with default
        try {
          localStorage.removeItem(DEVICE_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setSelectedDeviceId(null);
        setError('Selected camera unavailable. Tap "Try Again" to use the default.');
      } else {
        setError(err.message || 'Unable to access camera.');
        setActiveTab('upload');
      }
    } finally {
      if (isMountedRef.current) {
        setIsStarting(false);
      }
    }
  }, [isStarting, stopCamera, selectedDeviceId, facingMode, enumerateVideoDevices]);

  // Handle video element events
  const handleVideoCanPlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          if (isMountedRef.current) {
            setIsVideoReady(true);
          }
        })
        .catch((err) => {
          console.error('Video play failed:', err);
        });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (autoStart && activeTab === 'camera') {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startCamera();
        }
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [autoStart, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      try {
        localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
      } catch {
        /* ignore */
      }
      startCamera(deviceId);
    },
    [startCamera]
  );

  const handleSwitchCamera = useCallback(() => {
    if (videoDevices.length < 2) return;
    const currentIdx = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = (currentIdx + 1) % videoDevices.length;
    handleSelectDevice(videoDevices[nextIdx].deviceId);
  }, [videoDevices, selectedDeviceId, handleSelectDevice]);

  const handleSelectFacing = useCallback(
    (mode: FacingMode) => {
      setFacingMode(mode);
      try {
        localStorage.setItem(FACING_STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
      // Clear deviceId pin so the browser picks the right lens for this facingMode
      setSelectedDeviceId(null);
      try {
        localStorage.removeItem(DEVICE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      startCamera(undefined, mode);
    },
    [startCamera]
  );

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror capture only for the front camera (preview is mirrored to feel like a selfie).
        // Back camera is not mirrored, so capture as-is.
        if (activeFacing === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        canvas.toBlob(
          (blob) => {
            if (blob) setCapturedBlob(blob);
          },
          'image/jpeg',
          0.8
        );
        stopCamera();
      }
    }
  }, [stopCamera, activeFacing]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCapturedImage(dataUrl);
        setCapturedBlob(file);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    if (activeTab === 'camera') {
      startCamera();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [startCamera, activeTab]);

  const confirmPhoto = useCallback(() => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  }, [capturedBlob, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setCapturedBlob(null);
    onCancel?.();
  }, [stopCamera, onCancel]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      setCapturedImage(null);
      setCapturedBlob(null);
      setError(null);
      if (value === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    },
    [startCamera, stopCamera]
  );

  // Show per-lens chips only when user has 3+ cameras (e.g. wide + ultra-wide back).
  // Front/Back toggle is always shown when on the camera tab.
  const showDevicePicker = videoDevices.length >= 3 && !capturedImage && activeTab === 'camera' && !error;
  const showFacingToggle = !capturedImage && activeTab === 'camera' && !error;
  const isMirrored = activeFacing === 'user';

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera" className="gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="mt-4 space-y-3">
          {showFacingToggle && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => handleSelectFacing('environment')}
                disabled={isStarting}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  activeFacing === 'environment'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-transparent text-foreground hover:bg-background'
                )}
              >
                <Camera className="h-4 w-4" />
                Back camera
              </button>
              <button
                type="button"
                onClick={() => handleSelectFacing('user')}
                disabled={isStarting}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  activeFacing === 'user'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-transparent text-foreground hover:bg-background'
                )}
              >
                <Camera className="h-4 w-4" />
                Front camera
              </button>
            </div>
          )}

          {showDevicePicker && (
            <div className="flex flex-wrap gap-2">
              {videoDevices.map((device, idx) => {
                const isActive = device.deviceId === selectedDeviceId;
                return (
                  <button
                    key={device.deviceId || idx}
                    type="button"
                    onClick={() => handleSelectDevice(device.deviceId)}
                    disabled={isStarting}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-accent'
                    )}
                  >
                    {labelForDevice(device, idx)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {error && activeTab === 'camera' ? (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                <div className="space-y-4">
                  <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Camera Access Issue</p>
                    <p className="text-xs text-muted-foreground max-w-[250px]">{error}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startCamera()} disabled={isStarting}>
                    {isStarting ? 'Starting...' : 'Try Again'}
                  </Button>
                </div>
              </div>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : streamRef.current || isStarting ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  onCanPlay={handleVideoCanPlay}
                  onLoadedMetadata={handleVideoCanPlay}
                />
                {!isVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <div className="text-center space-y-2">
                      <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto animate-pulse">
                        <Camera className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Starting camera...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto animate-pulse">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Camera not started</p>
                    <p className="text-xs text-muted-foreground">Click below to start</p>
                  </div>
                  <Button onClick={() => startCamera()} size="sm">
                    Start Camera
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Uploaded"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <ImageIcon className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Click to upload photo</p>
                    <p className="text-xs text-muted-foreground">or drag and drop</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </label>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <canvas ref={canvasRef} className="hidden" />

      {/* Help alert for camera issues */}
      {error && activeTab === 'camera' && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800">
            <strong>Tip:</strong> If camera doesn't work, switch to the "Upload" tab to select a photo from your device.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={retake} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {activeTab === 'camera' ? 'Retake' : 'Choose Another'}
            </Button>
            <Button onClick={confirmPhoto} className="gap-2">
              <Check className="h-4 w-4" />
              Use Photo
            </Button>
          </>
        ) : activeTab === 'camera' && (streamRef.current || isVideoReady) ? (
          <>
            {onCancel && (
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {videoDevices.length >= 2 && (
              <Button variant="outline" onClick={handleSwitchCamera} className="gap-2" disabled={isStarting}>
                <SwitchCamera className="h-4 w-4" />
                Switch
              </Button>
            )}
            <Button onClick={capturePhoto} className="gap-2" size="lg">
              <Camera className="h-4 w-4" />
              Capture Photo
            </Button>
          </>
        ) : onCancel ? (
          <Button variant="outline" onClick={handleCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
