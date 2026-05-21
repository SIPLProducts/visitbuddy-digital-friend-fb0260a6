## Goal

Add a second short link in the approval SMS labelled "safe to assembly point" that opens a public page showing the safety/assembly details (location name, geo address, assembly point, emergency contact, map) for the visitor's branch.

Final SMS will read:
`Dear {Name}, Your visitor access for {Company} is confirmed on {Date} at {Gate}. QR Link: https://vms.resustainability.com/?{qrCode} Host: {Host} FROM {Dept} safe to assembly point https://vms.resustainability.com/?s{code} Regards: RE SUSTAINABILITY LIMITED`

## Approach

### 1. Database — per-location safety short code

Migration:
- Add `locations.safety_short_code text unique` (4–6 chars, lowercase alphanumeric).
- Backfill existing locations with a generated code.
- Add trigger to auto-fill on insert if NULL.
- Add `get_location_safety_by_code(_code text)` SECURITY DEFINER RPC returning `{ name, geo_address, latitude, longitude, assembly_point, emergency_contact, city, address }` so the page works without login.

Why per-location and not per-visit: same branch always points to the same safety info, keeps the URL tiny and cacheable, and stays well under the 10-char DLT tail when prefixed with `s` (e.g. `?sab12cd` = 7 chars).

### 2. Public Safety Info page

- New route `/safety/:code` rendering `SafetyInfo.tsx`:
  - RESL logo header (re-use existing `resl-logo.png`)
  - Branch name + address
  - "Assembly point" card (large, highlighted)
  - Emergency contact (click-to-call)
  - "Navigate" button → Google Maps directions using lat/lng or geo_address
  - Embedded static map / link
  - Footer "Powered by Sharvi Infotech"
- App.tsx short-link router: detect `/?s<code>` (4–8 char tail) and rewrite to `/safety/<code>`. Keep existing visitor `?<code>` and `?qr<CODE>` rules untouched (add the `s`-prefix branch before the generic match).

### 3. SMS template wiring

Update both senders so the new placeholder is filled with the safety URL:

- `supabase/functions/approve-visitor/index.ts`
- `supabase/functions/send-sms-badge/index.ts`

Steps in each:
- After resolving visitor → gate → location, fetch `locations.safety_short_code` for that location.
- Build `safetyLink = ${smsBase}/?s${safetyShortCode}`.
- Change the message string from the current
  `… FROM ${fromName} Regards: …`
  to
  `… FROM ${fromName} safe to assembly point ${safetyLink} Regards: …`
- If a location has no code (defensive fallback), omit the `safe to assembly point …` segment so the SMS still sends.
- Keep existing `qrLink` tail check; add a similar length log for `safetyLink` tail.

### 4. DLT note (important for the user)

The DLT-approved template needs to include the new `{#var#}` segment exactly as registered. The plan assumes the user has already added the variable in the registered template (as their message implies). The code change above is harmless if DLT also accepts it; if DLT rejects the message, we'll need to register a new template ID.

## Out of scope

- Editing the existing visitor short code or QR Link format.
- WhatsApp/email templates (unchanged).
- Per-visit safety info (we use per-branch info only).

## Files touched

- `supabase/migrations/<new>.sql` — column, backfill, trigger, RPC.
- `src/pages/SafetyInfo.tsx` — new page.
- `src/App.tsx` — add route + `?s<code>` rewrite.
- `supabase/functions/approve-visitor/index.ts` — append safety link to SMS.
- `supabase/functions/send-sms-badge/index.ts` — append safety link to SMS.
