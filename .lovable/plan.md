

## Root cause (confirmed from console)

`Html5Qrcode.start()` validates the camera config and throws:
> `'facingMode' should be string or object with exact as key.`

Current code in `src/components/checkin/QrScanner.tsx`:
- Primary: `{ facingMode: { ideal: 'environment' } }` ❌ (`ideal` not allowed by html5-qrcode)
- Fallback: `{ facingMode: 'user' }` ✅ shape is fine, but it never runs because the catch only retries on specific error names — and even when it does, it fails on desktop laptops where the only camera is "environment-less" anyway.

So both attempts throw before `getUserMedia` is ever called.

## Fix (single file: `src/components/checkin/QrScanner.tsx`)

1. **Use the shape html5-qrcode actually accepts.** Try in this order:
   - `{ facingMode: "environment" }` (plain string — back camera on phones)
   - `{ facingMode: "user" }` (front camera fallback)
   - Enumerate cameras via `Html5Qrcode.getCameras()` and start with the first device's `deviceId` (works on desktops where `facingMode` isn't meaningful)

2. **Loop the fallbacks unconditionally** instead of branching on error name. If attempt 1 throws, try 2; if 2 throws, try 3. Only surface an error after all three fail.

3. **Improve error logging** — current `console.error` prints `undefined` for name/message because the thrown value from html5-qrcode is sometimes a plain string. Coerce with `String(err)` so the actual reason is visible.

4. **Better user-facing messages** — distinguish "permission denied" / "no camera found" / "in use" by inspecting the final error string (since `err.name` isn't reliable here).

### File touched
- `src/components/checkin/QrScanner.tsx` (only)

### Result
- Mobile: back camera starts immediately via `"environment"`.
- Desktop laptop (no rear camera): falls through to `"user"` or first enumerated `deviceId` → built-in webcam works.
- Real failures (denied, no hardware) show a precise reason instead of a generic "Could not start camera".

