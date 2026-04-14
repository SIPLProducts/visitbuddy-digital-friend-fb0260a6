import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CameraCapture } from '@/components/checkin/CameraCapture';
import { Visitor } from '@/types/database';
import { toast } from 'sonner';

interface CheckInCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor: Visitor | null;
  onComplete: () => void;
  autoPrint?: boolean;
}

interface WatchlistMatch {
  name: string;
  severity: string;
  reason: string;
}

export function CheckInCaptureDialog({
  open,
  onOpenChange,
  visitor,
  onComplete,
  autoPrint = true,
}: CheckInCaptureDialogProps) {
  const [watchlistMatch, setWatchlistMatch] = useState<WatchlistMatch | null>(null);
  const [checkingWatchlist, setCheckingWatchlist] = useState(false);
  const [watchlistChecked, setWatchlistChecked] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open && visitor) {
      setWatchlistMatch(null);
      setWatchlistChecked(false);
      setProcessing(false);
      checkWatchlist();
    }
  }, [open, visitor?.id]);

  const checkWatchlist = async () => {
    if (!visitor) return;
    setCheckingWatchlist(true);
    const { data } = await supabase
      .from('visitor_watchlist')
      .select('name, severity, reason, phone, email')
      .eq('is_active', true);

    if (data) {
      const match = (data as any[]).find((w: any) => {
        const nameMatch = w.name.toLowerCase() === visitor.name.toLowerCase();
        const phoneMatch = visitor.phone && w.phone === visitor.phone;
        const emailMatch = visitor.email && w.email === visitor.email;
        return nameMatch || phoneMatch || emailMatch;
      });
      if (match) setWatchlistMatch(match);
    }
    setCheckingWatchlist(false);
    setWatchlistChecked(true);
  };

  const handleCapture = useCallback(async (photoBlob: Blob) => {
    if (!visitor) return;
    setProcessing(true);

    try {
      // Upload photo
      const filePath = `${visitor.id}/checkin.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('visitor-photos')
        .upload(filePath, photoBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // Update visitor record
      const { error: updateError } = await supabase
        .from('visitors')
        .update({
          status: 'checked_in' as const,
          check_in_time: new Date().toISOString(),
          photo_url: photoUrl,
        })
        .eq('id', visitor.id);

      if (updateError) throw updateError;

      toast.success(`${visitor.name} checked in successfully`);
      onOpenChange(false);

      if (autoPrint) {
        window.open(`/print-badge?id=${visitor.id}`, '_blank');
      }

      onComplete();
    } catch (err: any) {
      console.error('Check-in error:', err);
      toast.error('Failed to check in visitor: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }, [visitor, autoPrint, onComplete, onOpenChange]);

  const isBlocked = watchlistMatch?.severity === 'blocked';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Check-In: {visitor?.name}
          </DialogTitle>
          <DialogDescription>
            Capture visitor photo to complete check-in and print badge.
          </DialogDescription>
        </DialogHeader>

        {/* Watchlist Alert */}
        {watchlistMatch && (
          <div
            className={`p-3 rounded-lg border ${
              isBlocked
                ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {isBlocked ? (
                <Ban className="h-4 w-4 text-red-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium text-sm">
                {isBlocked ? 'BLOCKED VISITOR' : 'WATCHLIST ALERT'}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {watchlistMatch.severity}
              </Badge>
            </div>
            <p className="text-xs mt-1 text-muted-foreground">{watchlistMatch.reason}</p>
            {isBlocked && (
              <p className="text-xs mt-1 font-medium text-red-600">
                This visitor cannot be checked in. Contact security admin.
              </p>
            )}
          </div>
        )}

        {/* Loading watchlist */}
        {checkingWatchlist && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Checking watchlist...</span>
          </div>
        )}

        {/* Camera - show only after watchlist check passes and not blocked */}
        {watchlistChecked && !isBlocked && !processing && (
          <CameraCapture
            onCapture={handleCapture}
            onCancel={() => onOpenChange(false)}
            autoStart={true}
          />
        )}

        {/* Processing state */}
        {processing && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Uploading photo & checking in...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
