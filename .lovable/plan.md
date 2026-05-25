## Problem

When a visitor is approved, they receive an SMS like:

```
... QR Link: https://vms.resustainability.com/?a1cb059d ...
```

Clicking it opens the app shell (dashboard / login) instead of the visitor QR page.

## Root cause

The redirect logic in `src/App.tsx`, the `/s/:code` route, the `get_visitor_id_by_short_code` RPC, and the anon read on `visitors` all work correctly when the URL is opened verbatim — verified end-to-end against the deployed `vms.resustainability.com` backend.

The failure is in the URL **format itself**: `https://host.tld/?xxxxxxxx`.

Many SMS / WhatsApp / native message previewers tokenize auto-linked URLs and stop at the `?` when it isn't followed by `key=value`. The user's device opens just `https://vms.resustainability.com/`, which lands on `/` (Dashboard → auth gate) — exactly the "routing to application" behavior the user reports. The cloud short code `?a1cb059d` was originally chosen to keep the URL tail ≤ 10 chars for an SMS Striker DLT template, but that constraint can be satisfied with a path segment too.

## Fix

Send a **path-based** short link (`/s/<code>`) instead of a query-only link (`/?<code>`). That's the route `ShortLinkRedirect` already handles. The `?`-form rewrite in `App.tsx` stays as a backwards-compatibility fallback for SMSes already in flight.

### Changes

1. **`supabase/functions/approve-visitor/index.ts`** (around line 527–529)
   - Change `qrLink` from `${smsBase}/?${shortCode}` to `${smsBase}/s/${shortCode}`.
   - Same for the visitor-id fallback branch (`${smsBase}/s/${visitorIdTail}`).
   - Remove the now-irrelevant "qr tail > 10 chars" abort (length check no longer needed; the path adds 2 chars but DLT template URL variable still resolves; the template was registered as a generic URL var).
   - Apply the same change to the assembly-point safety URL: `${smsBase}/safety/${safetyCode}` (use the existing `/safety/:code` route) instead of `${smsBase}/?s${safetyCode}`.

2. **`supabase/functions/send-sms-badge/index.ts`** (around line 110–130 region in current file)
   - Mirror the same two changes: `qrUrl = ${SMS_LINK_BASE}/s/${shortCode}` (fallback `/s/<visitor-id-tail>`), and `safetyLink = ${SMS_LINK_BASE}/safety/${safetyCode}`.

3. **No frontend changes required.** `src/App.tsx` already supports `/s/:code` natively. The legacy `?code` rewriter stays intact so any SMS already delivered still works on the devices that *do* preserve the query string.

### Out of scope / not changed

- DB, RLS, RPC, visitor public-read policy — all already correct.
- Email and WhatsApp flows — they embed a QR image directly, not a short link.
- `src/pages/VisitorQrLink.tsx` and `src/pages/ShortLinkRedirect.tsx` — unchanged.

## Verification

After deploy, approve a visitor and check:

1. SMS body contains `QR Link: https://vms.resustainability.com/s/<code>` (and `safe to assembly point https://vms.resustainability.com/safety/<code>` if a safety code exists).
2. Tapping the link from the phone's default SMS app opens the visitor QR page (the `VisitorQrLink` screen with the QR image), without any auth prompt.
3. Old links of the form `/?<code>` continue to work via the fallback in `App.tsx`.
