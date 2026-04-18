import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Download, Share, Plus, Smartphone, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getDeferredPrompt,
  subscribeToInstallPrompt,
  triggerNativeInstall,
  isStandaloneInstalled,
  isMobileOrTablet,
  isIOSDevice,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa';

const DISMISS_KEY = 'install_prompt_dismissed_until';
const PERMANENT_DISMISS_KEY = 'install_prompt_never';
const SNOOZE_DAYS = 7;

function isDismissed(): boolean {
  if (localStorage.getItem(PERMANENT_DISMISS_KEY) === '1') return true;
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

export function InstallPromptBanner() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    capturedPrompt
  );
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isMobileOrTablet()) return;
    if (isStandaloneInstalled()) return;
    if (isDismissed()) return;

    const ua = navigator.userAgent;
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
    setIsIOS(iOS);

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      capturedPrompt = evt;
      setDeferredPrompt(evt);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setOpen(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    const t = setTimeout(() => setOpen(true), 1500);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [user]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      capturedPrompt = null;
      setOpen(false);
    }
  };

  const handleSnooze = () => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setOpen(false);
  };

  const handleNever = () => {
    localStorage.setItem(PERMANENT_DISMISS_KEY, '1');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle>Install VisiGuard</SheetTitle>
              <SheetDescription>Faster access, full-screen experience</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To install VisiGuard on your iPhone or iPad:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-sm pt-0.5">
                    Tap the <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> button
                    in Safari
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
                    Tap <strong>Add</strong> in the top-right
                  </span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Install the app for one-tap access from your home screen.
              </p>
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Install App
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Open this site in <strong>Chrome</strong> and tap the menu (⋮) →{' '}
                <strong>Install app</strong> / <strong>Add to Home screen</strong>.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleSnooze} className="flex-1">
              Maybe later
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNever} className="flex-1 text-muted-foreground">
              <X className="h-3 w-3 mr-1" /> Don't show again
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
