import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

// Unregister service workers in preview/iframe to prevent stale content
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// One-shot reload for installed PWAs that cached the pre-QR-rewrite bundle.
// Bump the key suffix to force another reload in the future.
if (!isPreviewHost && !isInIframe && typeof window !== "undefined") {
  const RELOAD_KEY = "qr-scanner-v2-reloaded";
  try {
    if (!localStorage.getItem(RELOAD_KEY)) {
      localStorage.setItem(RELOAD_KEY, "1");
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        if (regs.length > 0) {
          Promise.all(regs.map((r) => r.unregister())).then(() => {
            window.location.reload();
          });
        }
      });
    }
  } catch {}
}

createRoot(document.getElementById("root")!).render(<App />);
