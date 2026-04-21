

## Surface a clear, actionable message when the camera/toggle misbehaves

Today the QR scanner silently falls back when something is off — the user just sees a blank viewport or a single lens with no explanation. We'll add explicit, human-readable banners that tell the client exactly **why** and **what to do**.

### What we'll change

**`src/components/checkin/QrScanner.tsx`** — add a visible "diagnostic banner" above the camera viewport that renders one of the following messages based on detected state. Banner uses the existing `Alert` component (amber for warnings, red for errors, blue for info).

#### Detection + messages

On mount (and on Start Scanning) run a quick environment probe and pick the first matching state:

| Condition | Banner colour | Message shown to client |
|---|---|---|
| `window.isSecureContext === false` | red | **Camera blocked — insecure connection.** Cameras only work over HTTPS. Open this app from `https://…` (not `http://` or an IP address) and try again. |
| `navigator.mediaDevices?.getUserMedia` missing | red | **This browser does not support camera access.** Use Chrome, Edge, Safari, or Firefox (latest version). In-app browsers (Instagram, LinkedIn, Gmail) often block cameras — open in your real browser. |
| Permissions API reports `denied` | red | **Camera permission was denied.** Tap the lock/camera icon in your browser address bar → set Camera to **Allow** → reload this page. On iOS: Settings → Safari → Camera → Allow. |
| `enumerateDevices()` returns 0 video inputs | red | **No camera detected on this device.** Connect a webcam or use a phone/tablet with a built-in camera. |
| `enumerateDevices()` returns exactly 1 video input | amber | **Only one camera detected.** This device has a single lens, so both Back and Front pills will open the same camera. The toggle is normal on phones with two cameras. |
| `getUserMedia` threw `NotReadableError` | red | **Camera is in use by another app.** Close Zoom, Teams, WhatsApp Web, or any other tab using the camera, then tap Start Scanning again. |
| `getUserMedia` threw `OverconstrainedError` for the requested side | amber | **Rear camera unavailable.** Falling back to the front lens. (Common on laptops and tablets.) |
| Inside an iframe with no camera permission policy | red | **Embedded view is blocking the camera.** Open the app in its own browser tab using this link: `<copy URL>`. |
| All good, scanning fine | (no banner) | — |

The current single-line caption ("If only one camera is available…") is replaced by these context-specific banners so the message matches the actual problem.

#### Toggle pill behaviour

- Pills stay rendered always (no regression), but when only 1 camera is detected the **inactive** pill gets `aria-disabled` styling + a tooltip: *"Only one camera on this device."*
- When `isSecureContext` is false or no devices exist, both pills go disabled and the Start Scanning button is disabled with a tooltip explaining why.

#### Diagnostic toast → upgraded to inline panel

The existing "Camera not switching?" link stays, but tapping it now expands a small details panel under the banner showing:
- Secure context: ✅/❌
- `getUserMedia` available: ✅/❌
- Permission state: granted / denied / prompt / unknown
- Video inputs detected: N
- User-Agent (truncated, for support copy/paste)
- A "Copy diagnostics" button that copies the above as plain text so the client can paste into chat/WhatsApp for support.

### Files touched

- `src/components/checkin/QrScanner.tsx` — banner state, environment probe on mount, message map, expanded diagnostics panel, pill disable logic.

No other files. No DB, no edge function, no RLS, no auth changes. Visitor lookup, photo capture, ANPR, badge printing all unchanged.

### Verification

```text
1. Desktop Chrome over https → no banner, both pills enabled, scan works.
2. Desktop Chrome with 1 webcam → amber banner: "Only one camera detected…",
   front pill highlighted with tooltip on back pill.
3. Block camera in browser settings, reload → red banner with step-by-step
   re-enable instructions; Start button disabled.
4. Open over http:// (or file://) → red banner: "Camera blocked — insecure
   connection."; Start button disabled.
5. Open Zoom in another window, tap Start → red banner: "Camera in use by
   another app."
6. Open inside Instagram in-app browser → red banner: "This browser does
   not support camera access. Open in Chrome/Safari."
7. Tap "Camera not switching?" → diagnostics panel expands with the 5
   environment facts + Copy diagnostics button.
8. Phone with 2 cameras → no banner, toggle swaps lens as before.
```

### Out of scope
- Visitor lookup / RLS fallback.
- Photo capture component.
- ANPR scanner.
- Service-worker cache reload (already shipped).

