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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsVideoReady(false);
  }, []);

  const startCamera = useCallback(async () => {
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

      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        },
        audio: false,
      });
      
      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = mediaStream;
      console.log('Camera stream obtained:', mediaStream.active);
      
      // Wait a tick for the video element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Stream attached to video element');
      }
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
      } else {
        setError(err.message || 'Unable to access camera.');
        setActiveTab('upload');
      }
    } finally {
      if (isMountedRef.current) {
        setIsStarting(false);
      }
    }
  }, [isStarting, stopCamera]);

  // Handle video element events
  const handleVideoCanPlay = useCallback(() => {
    console.log('Video can play, attempting to play...');
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          console.log('Video playing successfully');
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

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally since video is mirrored
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        canvas.toBlob((blob) => {
          if (blob) setCapturedBlob(blob);
        }, 'image/jpeg', 0.8);
        stopCamera();
      }
    }
  }, [stopCamera]);

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

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setCapturedImage(null);
    setCapturedBlob(null);
    setError(null);
    if (value === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [startCamera, stopCamera]);

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

        <TabsContent value="camera" className="mt-4">
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
                  <Button variant="outline" size="sm" onClick={startCamera} disabled={isStarting}>
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
                    <p className="text-sm font-medium text-foreground">
                      Camera not started
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click below to start
                    </p>
                  </div>
                  <Button onClick={startCamera} size="sm">
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

      <div className="flex gap-2 justify-center">
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
