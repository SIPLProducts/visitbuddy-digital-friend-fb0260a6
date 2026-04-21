

## Replace `html5-qrcode` with native `getUserMedia` + `@zxing/browser` decoder

### Why "Start Scanning" never opens the camera

The `CameraCapture` component (used for the visitor photo) opens the camera fine because it uses **native `navigator.mediaDevices.getUserMedia` + a real `<video ref>`** that React owns. Permissions and stream are not the problem.

The QR scanner uses **`html5-qrcode`**, which:
- Constructs its own `<video>` and injects it into a div by id (`#qr-reader`).
- Manages an internal state machine ("transitioning", "starting", "scanning") that is the source of every prior bug in this thread (`Cannot transition to a new state…`, blank video while `isScanning=true`, double-mount issues with React 18 strict mode, etc.).
- In the current code, `onToggleScanning(true)` is fired **before** `start()` resolves, so the UI flips to "Scanning…" even when `start()` silently swallows an error in the fallback chain and no `<video>` ever attaches. That's exactly what you're seeing: the label says "Scanning…" but the viewport stays blank.

We've patched around this twice. The library is the wrong tool for our setup. Photo capture proves the platform/permissions are healthy.

### The fix: rewrite `QrScanner.tsx` using the photo-capture pattern

**Library choice:** `@zxing/browser` (mature, MIT, ~30KB gz, works on iOS Safari/Chrome/Firefox, decodes from a video element we control). Add it; remove `html5-qrcode`.

**`src/components/checkin/QrScanner.tsx`** — rewrite to mirror `CameraCapture.tsx`:

1. Own the `<video ref={videoRef} playsInline muted autoPlay>` element directly inside the 288×288 viewport.
2. `startScanning()`:
   - Call `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } })` exactly like `CameraCapture`.
   - Assign stream to `videoRef.current.srcObject`, await `loadedmetadata`, call `video.play()`.
   - **Only then** call `onToggleScanning(true)` and surface "Scanning…" — fixes the "says scanning, no camera" symptom.
   - Start a `BrowserMultiFormatReader.decodeFromVideoElement(videoRef.current, callback)` loop from `@zxing/browser`. On a successful decode, parse the JSON payload, call `onScan`, and stop.
3. `stopScanning()`: stop the zxing reader, stop all tracks on the stream, clear `srcObject`, set `isScanning=false`.
4. Front/Back pill: same UX as today; on change, stop tracks and re-call `getUserMedia` with the new `facingMode`. No state-machine race because we own everything.
5. Errors: re-use the existing `handleStartError` mapping (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `SecurityError`).
6. Cleanup on unmount: stop tracks + reader; no `clear()`/`stop()` race.
7. Keep the existing props (`onScan`, `isScanning`, `onToggleScanning`) so `CheckInOut.tsx` is untouched.
8. Keep the scan-once guard (`hasHandledScanRef`) and the `localStorage` facing-mode persistence key (`qr-scanner-facing-mode`).

**`package.json`**
- Add `@zxing/browser` (and its peer `@zxing/library`).
- Remove `html5-qrcode` (no other consumer in the repo).

**No other files change.** `CheckInOut.tsx`, `CheckInCaptureDialog.tsx`, `CameraFeed.tsx`, the dual-column visitor lookup, the cross-location RLS fallback, and the `approve-visitor` edge function all stay as-is.

### Verification

```text
1. Check-In/Out → Scan QR Code tab → tap Start Scanning.
   → Browser permission prompt (first time) → live rear-camera feed
     fills the 288×288 viewport. Header reads "Scanning…" only after
     the video is actually playing.
2. Tap "Front camera" pill → preview swaps to selfie cam, no error,
   no "Cannot transition…" toast.
3. Point at a printed VIS- badge or WhatsApp QR → check-in dialog opens
   (existing dual-column lookup unchanged).
4. Spam-tap Start / Stop / pill swaps → no console errors, video either
   plays or shows the mapped permission/in-use error toast.
5. Switch tab to Search and back → camera releases on stop, restarts
   cleanly on Start.
6. iPhone Safari (PWA) and Android Chrome both show the live feed —
   parity with the photo capture component.
```

### Out of scope
- Any change to visitor lookup, RLS fallback, or the `approve-visitor` edge function.
- Photo capture component (already works).
- ANPR camera flow.
- Torch / zoom controls.

