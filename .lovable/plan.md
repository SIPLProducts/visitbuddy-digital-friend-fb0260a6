

## Make front/back camera choice obvious in visitor photo capture

### Why you're still seeing only one camera
The previous change does enumerate cameras and add chips, but it has three usability gaps that explain "I am getting only front camera":

1. **The chips only appear when the browser reports 2+ devices.** On many phones the browser reports a single "logical" camera until you actually request the back one — so no chips ever appear and the user is stuck on whatever facingMode came up first.
2. **The video is always mirrored** (`transform: scaleX(-1)`). Even when it's the back camera, it looks like a selfie cam, so the user thinks it's the front camera.
3. **The chips are small grey pills above the preview** — easy to miss, and they don't appear at all until after the stream starts and labels populate.

### Fix — always show a Front / Back toggle

Update `src/components/checkin/CameraCapture.tsx`:

1. **Always-visible Front / Back segmented toggle** above the preview (not conditional on enumerating ≥2 devices). Two buttons: **"Back camera"** (default, environment) and **"Front camera"** (user). Active button highlighted in primary color.

2. **Toggle drives `facingMode` directly.** Tapping a button stops the current stream and re-opens with `getUserMedia({ video: { facingMode: 'environment' | 'user' } })`. This works on every phone, even when `enumerateDevices()` returns generic/empty labels.

3. **If 3+ cameras exist** (e.g. tablet with wide + ultra-wide back cams), keep the existing per-device chips as a secondary row underneath the Front/Back toggle, so power users can still pick a specific lens.

4. **Mirror only the front camera.** Track which mode is active in state; when `facingMode === 'environment'`, render the `<video>` with no transform and capture without flipping the canvas. When `facingMode === 'user'`, keep the current mirrored preview + flipped capture (so selfies feel natural). This makes it visually obvious which camera is live.

5. **Persist the user's choice** in `localStorage` (`camera-capture-facing-mode`: `'environment' | 'user'`). On next mount, auto-start with the saved mode. Default for first-time use stays `environment` (back).

6. **Active-camera indicator** — small badge in the corner of the preview ("Back" or "Front") so the operator always knows which lens is recording, regardless of mirroring.

7. Keep the existing 300 ms init delay, AbortError handling, error fallbacks, Upload tab, and Capture/Cancel buttons untouched (camera-capture-resiliency rule).

### Files to edit
- `src/components/checkin/CameraCapture.tsx` — only file. `CheckInCaptureDialog` and any other caller (self-service portal, check-out flow) inherit the change automatically.

### Verification

```text
1. Open Visitors → Check In on a phone.
   → Above the preview: two big buttons "Back camera" / "Front camera",
     "Back camera" highlighted by default, preview shows back lens
     (NOT mirrored), small "Back" badge in corner of preview.
   → Tap "Front camera" → preview flips to selfie cam, mirrored,
     badge says "Front".
   → Capture → photo uploads, check-in completes.
   → Re-open Check In → it auto-starts on Front (remembered).

2. Open Check In on a laptop with one webcam.
   → Toggle still shows both buttons. Front works, Back falls back to
     the only available camera with a small toast "Back camera not
     available — using default". No crash.

3. Open on a tablet with 3 cameras.
   → Front/Back toggle on top, secondary row shows per-lens chips
     ("Back wide", "Back ultra-wide"). Switching works at both levels.

4. Deny camera permission.
   → Existing error UI renders, falls back to Upload tab. No regressions.

5. Self-service portal photo step.
   → Same Front/Back toggle inherited, same mirroring rule.
```

### Out of scope
- QR scanner camera picker (separate flow, already done).
- Vehicle ANPR camera (uses IP camera proxy, not getUserMedia).
- Capture resolution, filters, or zoom controls.
- Per-location default-camera setting (always per-device localStorage).

