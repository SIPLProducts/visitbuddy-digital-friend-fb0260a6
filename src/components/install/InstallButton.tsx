import { useEffect, useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Share, Plus, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  getDeferredPrompt,
  subscribeToInstallPrompt,
  triggerNativeInstall,
  isStandaloneInstalled,
  isIOSDevice,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa';

interface InstallButtonProps {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  label?: string;
  showIcon?: boolean;
  /** Hide the button entirely on desktop devices that don't support installation. */
  hideWhenUnsupported?: boolean;
}

export function InstallButton({
  variant = 'default',
  size = 'default',
  className,
  label = 'Install App',
  showIcon = true,
  hideWhenUnsupported = false,
}: InstallButtonProps) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(getDeferredPrompt());
  const [installed, setInstalled] = useState(isStandaloneInstalled());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'ios' | 'desktop'>('ios');

  useEffect(() => {
    const unsub = subscribeToInstallPrompt((p) => {
      setPrompt(p);
      if (p === null && isStandaloneInstalled()) setInstalled(true);
    });
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      unsub();
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const ios = isIOSDevice();

  // Hide the button on desktop browsers that have no install support and we
  // were asked to hide in unsupported environments (e.g. compact header chip).
  if (hideWhenUnsupported && !prompt && !ios) return null;

  const handleClick = async () => {
    if (prompt) {
      const result = await triggerNativeInstall();
      if (result === 'accepted') {
        toast.success('Installing Re Sustainability…');
        setInstalled(true);
      }
      return;
    }
    setDialogMode(ios ? 'ios' : 'desktop');
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        {showIcon && <Download className="h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle>Install Re Sustainability</DialogTitle>
                <DialogDescription>
                  {dialogMode === 'ios'
                    ? 'Add to your iPhone or iPad home screen'
                    : 'Install on your device'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {dialogMode === 'ios' ? (
            <ol className="space-y-3 mt-2">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  1
                </span>
                <span className="text-sm pt-0.5">
                  Tap the <Share className="inline h-4 w-4 mx-1" />{' '}
                  <strong>Share</strong> button in Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  2
                </span>
                <span className="text-sm pt-0.5">
                  Scroll and tap <Plus className="inline h-4 w-4 mx-1" />{' '}
                  <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  3
                </span>
                <span className="text-sm pt-0.5">
                  Tap <strong>Add</strong> in the top-right corner
                </span>
              </li>
            </ol>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Your current browser does not expose a one-tap install. To install
                Re Sustainability:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Open this site in <strong>Chrome</strong>, <strong>Edge</strong>,
                  or another Chromium browser.
                </li>
                <li>
                  Tap the browser menu (⋮) and choose{' '}
                  <strong>Install app</strong> or{' '}
                  <strong>Add to Home screen</strong>.
                </li>
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
