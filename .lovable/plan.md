

## Restore "Re Sustainability" red header + add camera picker for QR scanner

Two targeted fixes — no other surfaces touched.

### 1. Restore the red "Re Sustainability" header text everywhere it was removed

The previous edit accidentally stripped the **"Re Sustainability"** header text. Bring it back exactly as before, in red (`#dc2626`), bold. The only thing that should NOT appear is the grey **"Sustainability"** wordmark that lived *inside the logo image* — that part stays gone (the new cropped logo `re-logo-mark.png` already handles that).

So the result is:
- Logo image = red "re" circle only (no grey wordmark under it). ✅ already done.
- Text next to / under logo = **"Re Sustainability"** in red. ⬅ restore this.

**Files to update**

- `src/pages/PrintBadge.tsx` — re-add the `<div class="company-text">Re Sustainability</div>` element next to the logo inside the `.header` block, using the existing `.company-text` CSS rule (red, bold, centered) that's still defined in the stylesheet.
- `src/components/badge/SafetyPermitBadge.tsx` — restore the `companyName` default prop back to `"Re Sustainability"` (or `"Resustainability"` to match the prior look — confirm which you want; plan assumes `"Re Sustainability"` per your message). The dark band under the logo will once again render that text in white.
- Email edge functions — set `DEFAULT_COMPANY = "Re Sustainability"` in:
  - `supabase/functions/send-email/index.ts`
  - `supabase/functions/send-email-badge/index.ts`
  - `supabase/functions/notify-host/index.ts`
  - `supabase/functions/approve-visitor/index.ts`

  These already render the company name in red inside `brandedHeader(...)`. Only the constant changes.

The cropped logo asset (`re-logo-mark.png`) stays — that's what removes the grey "Sustainability" wordmark *from inside the image*.

### 2. Let the user pick the camera (back vs front) in the QR scanner

Currently `src/components/checkin/QrScanner.tsx` tries `environment` first then falls back to `user`. On laptops/tablets the back camera doesn't exist, so it ends up on the front cam silently with no way to switch.

Change the scanner so the user can choose:

- After clicking **Start Scanning**, call `Html5Qrcode.getCameras()` to enumerate.
- **One camera** → start it directly.
- **Two or more cameras** → render small chips/buttons listing each camera by label (e.g. "Back camera", "Front camera", "USB Webcam"). Clicking one starts that camera.
- Persist the chosen `deviceId` in `localStorage` (key `qr-scanner-camera-id`) so next time it auto-starts on the same camera without asking.
- Show a small **"Switch camera"** link below the scanner once running so the user can change it any time.
- Keep current `environment`-first fallback only when enumeration fails or labels are empty (older browsers / permissions denied path).
- Preserve the existing duplicate-scan guard (`hasHandledScanRef`) and `onScan` contract — no behaviour change there.

Affected file:
- `src/components/checkin/QrScanner.tsx`

### Deploy

Redeploy these four edge functions (only the `DEFAULT_COMPANY` constant changes):
- `send-email`
- `send-email-badge`
- `notify-host`
- `approve-visitor`

### Verification

```text
1. Print a badge.
   → Logo = red "re" circle, NO grey "Sustainability" wordmark under the image.
   → Header text next to logo = "Re Sustainability" in red.

2. Open Safety Permit badge.
   → Logo on top, dark band reads "Re Sustainability" in white.

3. Trigger any visitor email (host notify, approval, badge, checkout).
   → Header shows red "re" logo image + "Re Sustainability" text in red.

4. Open Check-In/Out → Start Scanning on a phone with front + back cameras.
   → Camera picker appears: "Back camera", "Front camera".
   → Select "Back camera" → scanner starts on rear lens.
   → Stop, Start again → it auto-picks "Back camera" (remembered).
   → Click "Switch camera" → picker reappears.

5. Open Check-In/Out → Start Scanning on a laptop with one webcam.
   → Starts directly, no picker shown.

6. Scan a QR.
   → Same as today: lookup runs, no duplicate toasts.
```

### Out of scope
- WhatsApp message bodies (Sharvi line already removed previously, staying removed).
- "Powered by Sharvi Infotech" footers (already removed, staying removed).
- Vehicle gate scanner (separate flow, untouched).
- Long legal consent paragraph that mentions "Re Sustainability" (legal copy, untouched).

