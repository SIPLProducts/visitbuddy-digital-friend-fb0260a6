
## Issue

Looking at the session replay, the camera DID start in the recorded session ("Scanning..." appeared, video element played). But the user reports it not working — likely failing intermittently or on a specific device (mobile/another browser) due to a timing/visibility bug in `QrScanner.tsx`.

## Root cause

In `src/components/checkin/QrScanner.tsx`, the `<div id="qr-reader">` has `style={{ display: 'none' }}` whenever `isScanning` is false. The flow is:

1. User clicks **Start Scanning** → `isScanning` is still `false` → `qr-reader` div is `display: none`
2. Code calls `scanner.start(...)` against the **hidden** div
3. `html5-qrcode` injects a `<video>` element into that hidden container and calls `play()`
4. On many browsers (especially mobile Safari/Chrome and some desktop configs), `play()` on a `<video>` inside a `display:none` container fails silently or gets stuck → camera never appears
5. Only AFTER `start()` resolves do we call `onToggleScanning(true)` → div becomes visible, but the video has already failed/stalled

There's also an `error.message` from `Html5Qrcode` that `getUserMedia` returned a stream but the video can't render → user sees spinner forever.

## Fix

In `src/components/checkin/QrScanner.tsx`:

1. **Stop hiding the scanner container with `display:none`.** Instead, keep `qr-reader` always mounted at proper size; toggle visual placeholder vs. live view via opacity / positioning so the video element can autoplay properly.
2. **Set `isScanning` (and thus container visibility) BEFORE calling `scanner.start()`** — flip UI state first, wait one tick for layout, then start. Roll back state if start fails.
3. Add explicit `videoConstraints` with reasonable fallback and use `disableFlip: false`. Keep environment camera but also catch `OverconstrainedError` and retry with a relaxed `{ video: true }` constraint.
4. Improve error surfacing: log specific error name to console and show readable message in the existing red error band instead of leaving the user on the perpetual "Initializing..." text.
5. On mobile, html5-qrcode sometimes needs a `verbose: false` and a slightly larger qrbox — keep `{ width: 250, height: 250 }` but ensure container has a minimum 288px height (already there, just enforce when visible).

### Files to edit
- `src/components/checkin/QrScanner.tsx` (only file changed)

### Result
- Click **Start Scanning** → container becomes visible immediately with "Starting camera…" overlay → camera permission prompt → live video appears → QR scanned. Works reliably across desktop Chrome, mobile Chrome/Safari, and PWA-installed mode.
- Failures (denied permission, no camera, browser unsupported) show a clear error message instead of a silent spinner.
