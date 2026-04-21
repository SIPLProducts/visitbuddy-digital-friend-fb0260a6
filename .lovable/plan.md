

## Always-visible Front/Back camera toggle on the QR scanner

`CameraCapture` (used by visitor check-in/out photo) already shows a Front/Back toggle that always works. The QR scanner doesn't — it only shows a camera picker when `Html5Qrcode.getCameras()` returns 2+ devices, and on many phones/PWAs that returns just one entry until a stream is opened, so users never see the back-camera option.

This change brings the QR scanner to parity with the photo capture component: a Front/Back pill is always visible, and the user picks before (and during) scanning.

### Changes

**`src/components/checkin/QrScanner.tsx`**

1. Add `facingMode` state (`'environment' | 'user'`), defaulting to `environment` (back), persisted to `localStorage` under `qr-scanner-facing-mode`.
2. Render a two-button Front/Back toggle (same visual style as `CameraCapture`) above the `#qr-reader` viewport, visible whenever the scanner is idle or running.
3. Rework `startScanning`:
   - Skip the "only show picker if 2+ devices" gate.
   - Start directly with `{ facingMode: { ideal: <chosen> } }`.
   - On failure, fall back to the opposite facingMode, then to enumerated `deviceId`, then surface the existing error messages.
4. Tapping the other facing pill while scanning → stop, persist the new mode, restart with the new constraint (no page reload).
5. Keep the existing fine-grained device picker as a secondary row only when `getCameras()` returns 3+ entries (covers tablets with multi-rear lenses); never block on it for the basic Front/Back choice.
6. Drop the `qr-scanner-camera-id` storage key (replaced by `qr-scanner-facing-mode`); clear stale value on first run.
7. Keep all current behaviour: `ensureVideoPlaying`, cleanup, scan-once guard, error toasts.

**No changes needed for photo capture.**
`CameraCapture.tsx` (used by `CheckInCaptureDialog` for check-in and by check-out flows) already shows the Front/Back toggle plus Retake. Verified — no edits required.

**No changes to the rest of the stack.**
`CheckInOut.tsx`, `CheckInCaptureDialog.tsx`, and `CameraFeed.tsx` consume these two components unchanged.

### Verification

```text
1. Open Check-In/Out → Scan tab on a phone (back camera works in
   browser).
   → Two pills "Back camera" / "Front camera" visible before tapping
     Start Scanning. Back is highlighted by default.
2. Tap Start Scanning → rear camera opens.
3. Tap "Front camera" pill → preview switches to selfie cam without
   reloading the page.
4. Reload the page → last chosen facing is remembered.
5. Open visitor check-in → photo capture dialog already shows the same
   toggle (no regression).
6. On a desktop with a single webcam, tapping "Back camera" still works
   (browser falls back to the available lens).
```

### Out of scope
- Changing the QR payload format or the `handleQrScan` lookup logic.
- Adding zoom / torch controls.
- Touching `CameraFeed.tsx` (live monitoring) — it has its own controls.

