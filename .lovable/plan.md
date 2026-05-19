## Goal
Make every SMS badge contain a short, branded "click" link on the main domain (`visiguard.sharvisoftwareservices.com/click/<code>`) that redirects the visitor to their existing QR page (`/visitor/:visitorCode`). Word "Click:" labels the link in the SMS body. Applies to host-approval SMS and every other SMS badge send.

## Current behavior
- `supabase/functions/send-sms-badge/index.ts` builds: `QR Link: https://visiguard.sharvisoftwareservices.com/visitor/<VISITOR-ID>`
- `approve-visitor` and direct registration both call `send-sms-badge`.
- Visitor QR page already lives at `/visitor/:visitorCode` (route `VisitorQrLink.tsx`).

## Changes

### 1. New frontend route `/click/:code` → redirects to `/visitor/:code`
File: `src/App.tsx`
- Add lightweight `<Route path="/click/:code" element={<ClickRedirect />} />` (public, no auth wrapper, alongside the existing `/visitor/:visitorCode` route).

New file: `src/pages/ClickRedirect.tsx`
- Read `:code` param, immediately `navigate(`/visitor/${code}`, { replace: true })` inside `useEffect`.
- Render a tiny "Opening your visitor pass…" splash with the RESL logo + spinner for the millisecond before the redirect, so the SMS click feels intentional and branded.
- Same `<title>` / meta as the visitor page for SEO/social previews.

### 2. SMS body uses the new click URL
File: `supabase/functions/send-sms-badge/index.ts`
- Replace the `longQrUrl` construction with:
  - `const clickCode = cleanUrlPart(visitorId);`
  - `const clickUrl = `${SITE_URL}/click/${clickCode}`;`
  - `SITE_URL` already defaults to the Lovable URL; override via existing `PUBLIC_SITE_URL` env, which in production points to `https://visiguard.sharvisoftwareservices.com`.
- Update the message template from `QR Link: ...` to:
  `Click: ${clickUrl}`
- Remove the dead shortener helpers (`fetchShortUrl`, `shortenUrl`) — they were already bypassed and add noise.
- Keep DLT template structure (greeting, visit date, gate, host, "Regards: RE SUSTAINABILITY LIMITED") otherwise unchanged so the telco template match is preserved. The only token swap is `QR Link:` → `Click:` and the path changes from `/visitor/` to `/click/`.
- **Important**: confirm with the user whether the DLT-registered template wording allows the `Click:` label and `/click/` path before deploying — if the template was registered with `QR Link:` and `/visitor/`, the operator will drop the SMS. If DLT can't be edited quickly, fallback option: keep `QR Link:` label but still swap the URL path to `/click/<code>` (only the path differs; same domain).

### 3. Approval-flow audit
File: `supabase/functions/approve-visitor/index.ts`
- No code change needed; it already invokes `send-sms-badge`, so it inherits the new link.

### 4. Out of scope
- WhatsApp badge (`send-whatsapp-badge`) — sends an image + full link; not touched.
- Email badge — uses HTML hyperlinks already; not touched.
- Any DB schema, RLS, or new tables. The `code` is the visitor's existing `visitor_id`; no new tokens table.

## Technical notes
- `/click/:code` is public (anonymous). It performs only a client-side redirect, so RLS on `visitors` is unaffected. The visitor QR page already handles "not found" gracefully.
- Using the main domain keeps DLT-whitelisted delivery and removes the third-party shortener dependency entirely.
- Approx SMS URL length: `https://visiguard.sharvisoftwareservices.com/click/VIS-XXXXXXXX-XXXX` ≈ 73 chars — same order as today's `/visitor/...` URL, no segment-count regression.

## Verification
1. Deploy `send-sms-badge`; trigger an approval from the host UI and confirm the SMS reads `Click: https://visiguard.sharvisoftwareservices.com/click/VIS-...`.
2. Tap the link on a phone → lands on `/click/<code>` → instantly redirected to the existing visitor QR page with the QR rendered.
3. Check edge function logs for `SMS message length` and SMS Striker `statusCode: 200`.