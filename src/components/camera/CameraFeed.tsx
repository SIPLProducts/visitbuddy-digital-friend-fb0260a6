import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Minimize2, RefreshCw, WifiOff, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraFeedProps {
  cameraUrl: string;
  cameraType: 'snapshot' | 'mjpeg' | 'hls';
  gateName: string;
  className?: string;
  compact?: boolean;
}

export function CameraFeed({ cameraUrl, cameraType, gateName, className, compact = false }: CameraFeedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Snapshot polling
  useEffect(() => {
    if (cameraType !== 'snapshot') return;

    const interval = setInterval(() => {
      setLastRefresh(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [cameraType]);

  const handleImageError = () => {
    setIsConnected(false);
    setRetryCount(prev => prev + 1);
  };

  const handleImageLoad = () => {
    setIsConnected(true);
    setRetryCount(0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getProxyUrl = (url: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/camera-proxy?url=${encodeURIComponent(url)}`;
  };

  const getImageSrc = () => {
    const proxied = getProxyUrl(cameraUrl);
    if (cameraType === 'snapshot') {
      return `${proxied}&t=${lastRefresh}`;
    }
    return proxied;
  };

  if (!cameraUrl) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border', compact ? 'h-32' : 'h-48', className)}>
        <div className="text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No camera configured</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative rounded-lg overflow-hidden bg-black group', className)}>
      {/* Status overlay */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <Badge variant="secondary" className="bg-black/60 text-white border-none text-[10px] backdrop-blur-sm">
          {gateName}
        </Badge>
        <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
      </div>

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-black/50 text-white hover:bg-black/70"
          onClick={() => { setLastRefresh(Date.now()); setRetryCount(0); setIsConnected(true); }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-black/50 text-white hover:bg-black/70"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {!isConnected ? (
        <div className={cn('flex items-center justify-center bg-muted/10', compact ? 'h-32' : 'h-48')}>
          <div className="text-center text-muted-foreground">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50 text-red-400" />
            <p className="text-xs text-red-400">Camera offline</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => { setRetryCount(0); setIsConnected(true); setLastRefresh(Date.now()); }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          {(cameraType === 'snapshot' || cameraType === 'mjpeg') && (
            <img
              ref={imgRef}
              src={getImageSrc()}
              alt={`${gateName} camera feed`}
              className={cn('w-full object-cover', compact ? 'h-32' : 'h-48')}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
          {cameraType === 'hls' && (
            <video
              className={cn('w-full object-cover', compact ? 'h-32' : 'h-48')}
              autoPlay
              muted
              playsInline
            >
              <source src={cameraUrl} type="application/x-mpegURL" />
            </video>
          )}
        </>
      )}

      {/* Timestamp */}
      <div className="absolute bottom-1 right-2 z-10">
        <span className="text-[9px] text-white/60 font-mono">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
