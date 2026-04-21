

## Diagnose & fix "client only sees front camera, no toggle"

The toggle pills are unconditionally rendered in `QrScanner.tsx` (no role, device, or feature gate). If the client doesn't see them, it's environmental — almost always one of these three:

### Likely causes

1. **Stale PWA / browser cache.** The client installed the app before the rewrite (when `html5-qrcode` had a different UI without pills). The service worker is serving the old bundle.
2. **Single-camera device.** The pills render fine, but tapping "Back camera" still opens the front lens because `getUserMedia` with `facingMode: { ideal: 'environment' }` falls back to the only available camera (typical on laptops, kiosks, some tablets).
3. **HTTP context / iframe.** Camera enumeration and `facingMode` selection require a secure context. Inside certain embedded views or over plain HTTP, the browser silently grants only the default lens.

### Fix plan

**1. Force pill visibility + add a clear hint (`src/components/checkin/QrScanner.tsx`)**
- Add a small caption under the pills: "If only one camera is available, both options open the same lens."
- Render a `Camera not switching?` link that on click does `await navigator.mediaDevices.enumerateDevices()` and toasts how many `videoinput` devices the browser actually exposes. This instantly tells support whether it's a single-camera device or a permissions issue.

**2. Use a stricter constraint when the user explicitly picks a side**
- Today: `facingMode: { ideal: chosen }` → browser is free to ignore.
- Change to: try `{ exact: chosen }` first. On `OverconstrainedError`, fall back to `{ ideal: chosen }`, then to `video: true`. This makes "Back camera" actually open the rear lens on phones that have one, and surfaces a clean error on devices that don't.

**3. Bust the PWA cache for old installs**
- Bump the service-worker / manifest version string in `src/lib/pwa.ts` (or wherever the SW is registered) so installed clients pick up the new bundle on next launch.
- Add a one-time `window.location.reload()` guarded by a `localStorage` flag (`qr-scanner-v2-reloaded`) so PWAs that cached the pre-rewrite scanner force a refresh exactly once.

**4. Ask the client for two facts** (handled in chat after deploy, not in code)
- Device + browser (e.g. "Samsung A14 / Chrome", "iPad / Safari", "Windows laptop / Edge").
- Whether the app is opened as an installed PWA or in a browser tab.
   With the new "Camera not switching?" diagnostic toast, they can self-report the `videoinput` count.

### Files touched
- `src/components/checkin/QrScanner.tsx` — diagnostic link, stricter `getUserMedia` constraint, helper caption.
- `src/lib/pwa.ts` — bump cache version string.
- No other files. Visitor lookup, RLS fallback, photo capture, ANPR all unchanged.

### Verification
```text
1. Reload preview → pills still visible, new caption underneath.
2. Tap "Camera not switching?" → toast: "Detected N video input(s)".
   - On a phone with 2 cams → toggling actually swaps lens.
   - On a laptop with 1 cam → toast says "1 video input"; back-pill
     toasts "Rear camera unavailable on this device" (from the
     OverconstrainedError fallback path) but still opens the front lens.
3. Existing scan flow / dual-column lookup unchanged.
4. Client reopens PWA → one-shot reload pulls the latest bundle, pills
   appear.
```

### Out of scope
- Changing visitor lookup or RLS.
- Photo capture component.
- ANPR.

