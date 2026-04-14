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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Ban, FileSignature } from 'lucide-react';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/auditLog';

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
  const [error, setError] = useState('');
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [watchlistMatch, setWatchlistMatch] = useState<WatchlistMatch | null>(null);
  const [checkingWatchlist, setCheckingWatchlist] = useState(false);
  const [enableNda, setEnableNda] = useState(true);
  const [enableWatchlist, setEnableWatchlist] = useState(true);
  const [ndaText, setNdaText] = useState('');

  useEffect(() => {
    if (open) {
      supabase.from('tenant_settings').select('enable_nda, enable_watchlist_check, nda_text').limit(1).single()
        .then(({ data }) => {
          if (data) {
            setEnableNda((data as any).enable_nda ?? true);
            setEnableWatchlist((data as any).enable_watchlist_check ?? true);
            setNdaText((data as any).nda_text || 'I agree to comply with all facility security policies and procedures.');
          }
        });
      if (visitorName) checkWatchlist();
    }
  }, [open, visitorName]);

  const checkWatchlist = async () => {
    if (!enableWatchlist) return;
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

  const handleConfirm = async () => {
    if (enableNda && !ndaAgreed) {
      setError('You must agree to the facility policies');
      return;
    }

    if (enableNda) {
      await supabase.from('visitor_agreements').insert({
        visitor_id: null,
        agreement_type: 'nda',
        agreement_text: ndaText,
        signature_data: signatureData,
      } as any);
      await logAudit({ action: 'visitor_check_in', entityType: 'visitor', entityName: visitorName, details: { nda_signed: true } });
    }

    onConfirm('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError('');
      setNdaAgreed(false);
      setSignatureData(null);
      setWatchlistMatch(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {enableNda ? (
              <><FileSignature className="h-5 w-5 text-primary" /> Policy Agreement</>
            ) : (
              <><ShieldCheck className="h-5 w-5 text-primary" /> Visitor Check-In</>
            )}
          </DialogTitle>
          <DialogDescription>
            {enableNda 
              ? <>Please review and sign the facility policy agreement for <strong>{visitorName}</strong>.</>
              : <>Confirm check-in for <strong>{visitorName}</strong>.</>
            }
          </DialogDescription>
        </DialogHeader>

        {/* Watchlist Alert */}
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

        {enableNda ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border text-sm max-h-32 overflow-y-auto">
              {ndaText}
            </div>
            
            <SignaturePad onSignatureChange={setSignatureData} />

            <div className="flex items-start gap-2">
              <Checkbox
                id="nda_agree"
                checked={ndaAgreed}
                onCheckedChange={(c) => { setNdaAgreed(!!c); if (error) setError(''); }}
              />
              <Label htmlFor="nda_agree" className="text-sm leading-tight cursor-pointer">
                I have read and agree to the facility policies and procedures outlined above.
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={loading || !ndaAgreed || (watchlistMatch?.severity === 'blocked')}>
                {loading ? 'Checking In...' : 'Sign & Check In'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading || (watchlistMatch?.severity === 'blocked')}>
              {loading ? 'Checking In...' : 'Confirm Check-In'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
