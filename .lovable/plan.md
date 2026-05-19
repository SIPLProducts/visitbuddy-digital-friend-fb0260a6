Constraint: everything after `?` in the SMS link must be at most 10 characters. Today it sends `?qrVIS-78B8C42A-6138` (19 chars after `?`), which exceeds the limit.

## Approach

Generate a short, unique 8-character code per visitor and use it in the SMS link. The frontend resolves that short code back to the full visitor record on first load.

Resulting SMS link:
```text
https://vms.resustainability.com/?ab12cd34xy   (10 chars after ?)
```

## What changes

1. Database
   - Add column `short_code text` on `public.visitors` (unique, 8 chars, lowercase base36).
   - Trigger generates it on insert if null, with retry on collision.
   - Backfill existing visitors with a unique short_code.
   - Add index on `short_code`.

2. Edge functions (`approve-visitor`, `send-sms-badge`)
   - Build `qrLink = ${PUBLIC_SMS_LINK_BASE}/?${visitor.short_code}` (no `qr` prefix, no `=`).
   - Hard-enforce: if the part after `?` is >10 chars, regenerate / fail-safe abort SMS with a clear log line; never send a longer link.
   - `sms_logs.message` and `loggedPayload` updated to the new link.

3. Frontend (`src/App.tsx` → `QrShortlinkHandler`)
   - On first load, if `location.search` matches `^\?[a-z0-9]{6,10}$`, fetch the visitor by `short_code` (anon RLS public read by short_code only), then `window.history.replaceState` to `/visitor/${visitor_id}`.
   - Keep backward-compat for the old `?qrVIS-…` format (existing SMS already out there): if it starts with `?qr`, strip `qr` and route to `/visitor/<code>` as before.

4. RLS
   - Add a narrow anon SELECT policy on `visitors` exposing only the row matching a provided `short_code` (or a SECURITY DEFINER RPC `get_visitor_by_short_code(text)` that returns the visitor_id only). Preferred: RPC, so we don’t broaden table-level access.

## Technical notes

- Short code format: 8 chars from `[a-z0-9]`, generated with `encode(gen_random_bytes(5), 'base64')` trimmed/normalised, retried on unique violation.
- 8 chars of base36 ≈ 2.8 trillion combinations — collision-safe for this scale.
- Total tail length after `?` = exactly 8, well within the 10-char cap.
- No TinyURL, no external shortener, no DLT template length change beyond the URL itself.
- DLT QR Link variable: confirm it still accepts the new format (it’s shorter than current, so should pass).

## Out of scope

- Changing email/WhatsApp link format (no length limit there).
- Changing the visitor detail page itself.
- Domain/DNS work (on-prem).
