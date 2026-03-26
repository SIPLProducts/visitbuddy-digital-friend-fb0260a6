import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorName: string;
  onConfirm: (govtIdNumber: string) => void;
  loading?: boolean;
}

export function CheckInDialog({
  open,
  onOpenChange,
  visitorName,
  onConfirm,
  loading = false,
}: CheckInDialogProps) {
  const [govtIdNumber, setGovtIdNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = govtIdNumber.trim();
    if (!trimmed) {
      setError('Government ID number is required for check-in');
      return;
    }
    if (trimmed.length < 3) {
      setError('Please enter a valid ID number');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setGovtIdNumber('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Visitor Check-In
          </DialogTitle>
          <DialogDescription>
            Please enter the Government ID number for <strong>{visitorName}</strong> to proceed with check-in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="govt_id">Government ID Number *</Label>
            <Input
              id="govt_id"
              placeholder="e.g. Aadhaar, PAN, Driving License number"
              value={govtIdNumber}
              onChange={(e) => {
                setGovtIdNumber(e.target.value);
                if (error) setError('');
              }}
              className="mt-1.5"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Checking In...' : 'Confirm Check-In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
