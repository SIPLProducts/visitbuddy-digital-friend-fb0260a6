
# Switch SMS link to `https://vms.resustainability.com/?qr<CODE>`

## Goal

SMS body should contain a tappable link in the exact form:
```
https://vms.resustainability.com/?qrVISXXXXXXXXXXXX
```
Tapping it opens the app and lands on the existing visitor QR page (`/visitor/<CODE>`).

Confirmed inputs:
- Format: `?qr<CODE>` (no `=` sign).
- Domain `vms.resustainability.com` is the on-prem server already serving this app.
- DLT QR Link variable length has been increased — full URL fits.

## Changes

### 1. New SMS base URL (env-driven, no hardcoding)
Add a new optional Supabase secret **`PUBLIC_SMS_LINK_BASE`** = `https://vms.resustainability.com`.
- If unset, code falls back to `PUBLIC_SITE_URL`, then to `https://vms.resustainability.com`.
- Keeps existing `PUBLIC_SITE_URL` untouched (still used for email / WhatsApp links and any non-SMS context).

### 2. `supabase/functions/approve-visitor/index.ts`
Replace the current SMS-link block:
```ts
const clickLink = `${SITE_URL}/click/${cleanUrlPart(visitor.visitor_id)}`;
const strikerMsg = `... Click: ${clickLink} ...`;
```
With:
```ts
const SMS_BASE = Deno.env.get("PUBLIC_SMS_LINK_BASE")
  || Deno.env.get("PUBLIC_SITE_URL")
  || "https://vms.resustainability.com";
const code = cleanUrlPart(visitor.visitor_id);
const qrLink = `${SMS_BASE.replace(/\/+$/, "")}/?qr${code}`;
const strikerMsg = `Dear ${visitorName}, Your visitor access for ${companyName} is confirmed on ${visitDate} at ${gateName}. QR Link: ${qrLink} Host: ${hostName} FROM ${fromName} Regards: RE SUSTAINABILITY LIMITED`;
```
Update `loggedPayload` and the `sms_logs.message` row to use the new `qrLink`.

### 3. `supabase/functions/send-sms-badge/index.ts`
Same change: read `PUBLIC_SMS_LINK_BASE`, emit `${base}/?qr${code}`, rebuild the body with `QR Link:` (matches the DLT template now in use).

### 4. Frontend redirect handler — `src/App.tsx`
Add a tiny top-of-router effect that runs once on mount:
```ts
// Handles SMS deep link: https://vms.resustainability.com/?qrVIS-XXXX
useEffect(() => {
  const search = window.location.search; // e.g. "?qrVIS12345678ABCD"
  if (search.startsWith("?qr") && search.length > 3) {
    const code = search.slice(3).split("&")[0].toUpperCase();
    if (code) {
      window.history.replaceState({}, "", `/visitor/${code}`);
      // Router will pick this up on first render.
    }
  }
}, []);
```
This is placed inside a small `<QrShortlinkHandler/>` component rendered before `<AppRoutes/>` so it runs before route matching.

Existing routes (`/visitor/:visitorCode`, `/click/:code`) stay untouched, so older WhatsApp/email links keep working.

### 5. Verification after deploy
1. Trigger an approval; check `approve-visitor` edge logs for `QR Link: https://vms.resustainability.com/?qrVIS-…`.
2. Query `sms_logs` to confirm the stored message uses the new format.
3. On phone, tap the SMS link → browser opens `…/?qrVIS-…` → app rewrites URL to `/visitor/VIS-…` → QR page renders.

## Out of scope
- DLT portal re-registration (already done by the user).
- Email / WhatsApp body changes (no length limit — leave as `/visitor/<code>`).
- Domain DNS / nginx config for `vms.resustainability.com` (handled on the on-prem server).
- `src/pages/ClickRedirect.tsx` (kept as-is for backward compatibility with already-sent SMS).

## Files touched
- `supabase/functions/approve-visitor/index.ts`
- `supabase/functions/send-sms-badge/index.ts`
- `src/App.tsx` (add `QrShortlinkHandler`)
- Secret added via the secrets tool: `PUBLIC_SMS_LINK_BASE`

No DB migration, no RLS changes, no other files modified.
