// Shared PWA install helpers. Captures the beforeinstallprompt event at module
// load so it's available to any consumer regardless of mount order.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let capturedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(p: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    capturedPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(capturedPrompt));
  });

  window.addEventListener('appinstalled', () => {
    capturedPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return capturedPrompt;
}

export function subscribeToInstallPrompt(
  cb: (p: BeforeInstallPromptEvent | null) => void
): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!capturedPrompt) return 'unavailable';
  await capturedPrompt.prompt();
  const { outcome } = await capturedPrompt.userChoice;
  if (outcome === 'accepted') {
    capturedPrompt = null;
    listeners.forEach((cb) => cb(null));
  }
  return outcome;
}

export function isStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(ua))
  );
}

export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  const iPadDesktop = navigator.maxTouchPoints > 1 && /Mac/.test(ua);
  const smallViewport = window.innerWidth <= 1024;
  return mobileUA || iPadDesktop || smallViewport;
}
