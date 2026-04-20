

## Add front/back camera picker to visitor photo capture

Bring the same camera-selection UX from the QR scanner to the photo-capture flow used during check-in (and any other place that uses `CameraCapture`).

### Where this shows up
`CameraCapture` is used by:
- `src/components/visitors/CheckInCaptureDialog.tsx` — capturing the visitor photo at check-in.
- `src/components/checkin/CameraCapture.tsx` itself — the shared component.

Currently it calls `getUserMedia({ video: { facingMode: 'environment' } })` and falls back to `user`. On phones it usually lands on the back cam, but there's no way to switch to the front, and on devices with multiple back cameras you can't choose.

### Fix

Update `src/components/checkin/CameraCapture.tsx`:

1. On mount (once permission is granted), enumerate devices via `navigator.mediaDevices.enumerateDevices()` and keep only `videoinput` entries.
2. If **2 or more** video inputs are found, show small chips above the video preview labelled by `device.label` (e.g. "Back camera", "Front camera", "USB Webcam"). Tapping a chip stops the current stream and re-opens with `getUserMedia({ video: { deviceId: { exact: chosenId } } })`.
3. If only **1** input is found, just start it (no chips).
4. Persist the chosen `deviceId` in `localStorage` under key `camera-capture-device-id`. Next mount auto-uses it; if the device is gone, fall back to facingMode default.
5. Add a **"Switch camera"** text button next to Capture / Cancel that re-shows the picker.
6. Initial start prefers, in order: saved deviceId → `facingMode: environment` → `facingMode: user`. Keep the existing 300ms init delay and AbortError handling intact (camera-capture-resiliency rule).
7. Labels are empty until permission is granted, so enumerate **after** the first successful `getUserMedia` call, then re-render chips.

No prop or callback changes — `onCapture(blob)` and `onCancel()` stay identical, so `CheckInCaptureDialog` and any future caller (self-service portal, etc.) get the picker for free.

### Out of scope
- QR scanner picker (already done in previous change).
- Vehicle ANPR camera flow (uses IP camera proxy, not `getUserMedia`).
- Self-service portal photo step — already routes through `CameraCapture`, so it inherits the fix automatically; no separate edit needed.
- Changing capture resolution, mirroring, or filters.

### Verification

```text
1. Open Visitors → Check In on a phone with front + back cameras.
   → Above the live preview, two chips appear: "Back camera", "Front camera".
   → Tap "Front camera" → preview switches to selfie cam.
   → Capture → photo uploads, check-in completes as today.
   → Open Check In again later → it auto-starts on "Front camera" (remembered).
   → Tap "Switch camera" → picker reappears, pick "Back camera" → switches.

2. Open Check In on a laptop with one webcam.
   → No chips shown, camera starts directly, capture works.

3. Open Check In on a tablet with 3 cameras (front + 2 back).
   → Three chips, each labelled, switching works for all three.

4. Deny camera permission.
   → Existing error UI still shows; no chips render.

5. Self-service portal photo step on phone.
   → Same picker available; chosen camera persists separately is fine
     (same localStorage key is OK — kiosk usually stays on back cam).
```

