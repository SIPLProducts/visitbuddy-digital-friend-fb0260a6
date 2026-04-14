import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorName: string;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  onConfirm: (govtIdNumber: string) => void;
  loading?: boolean;
}

interface WatchlistMatch {
  name: string;
  severity: string;
  reason: string;
}

export function CheckInDialog({
  open,
  onOpenChange,
  visitorName,
  visitorPhone,
  visitorEmail,
  onConfirm,
  loading = false,
}: CheckInDialogProps) {
  const [watchlistMatch, setWatchlistMatch] = useState<WatchlistMatch | null>(null);
  const [checkingWatchlist, setCheckingWatchlist] = useState(false);

  useEffect(() => {
    if (open && visitorName) {
      checkWatchlist();
    }
  }, [open, visitorName]);

  const checkWatchlist = async () => {
    setCheckingWatchlist(true);
    const { data } = await supabase.from('visitor_watchlist')
      .select('name, severity, reason, phone, email')
      .eq('is_active', true);
    
    if (data) {
      const match = (data as any[]).find((w: any) => {
        const nameMatch = w.name.toLowerCase() === visitorName.toLowerCase();
        const phoneMatch = visitorPhone && w.phone === visitorPhone;
        const emailMatch = visitorEmail && w.email === visitorEmail;
        return nameMatch || phoneMatch || emailMatch;
      });
      if (match) setWatchlistMatch(match);
    }
    setCheckingWatchlist(false);
  };

  const handleConfirm = () => {
    onConfirm('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setWatchlistMatch(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Visitor Check-In
          </DialogTitle>
          <DialogDescription>
            Confirm check-in for <strong>{visitorName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {watchlistMatch && (
          <div className={`p-3 rounded-lg border ${
            watchlistMatch.severity === 'blocked' 
              ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' 
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
          }`}>
            <div className="flex items-center gap-2">
              {watchlistMatch.severity === 'blocked' ? (
                <Ban className="h-4 w-4 text-red-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium text-sm">
                {watchlistMatch.severity === 'blocked' ? 'BLOCKED VISITOR' : 'WATCHLIST ALERT'}
              </span>
              <Badge variant="outline" className="text-[10px]">{watchlistMatch.severity}</Badge>
            </div>
            <p className="text-xs mt-1 text-muted-foreground">{watchlistMatch.reason}</p>
            {watchlistMatch.severity === 'blocked' && (
              <p className="text-xs mt-1 font-medium text-red-600">This visitor cannot be checked in. Contact security admin.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading || (watchlistMatch?.severity === 'blocked')}>
            {loading ? 'Checking In...' : 'Confirm Check-In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
