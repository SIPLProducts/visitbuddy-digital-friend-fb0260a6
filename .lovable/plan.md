## Goal
Include a QR-code link in the SMS badge that stays under ~30 characters, so it fits cleanly inside the SMS template without consuming an extra segment.

## Problem
The visitor QR page lives at `/visitor/:visitorCode`. Even the shortest full URL today is well over 30 chars:
- `https://visitbuddy-digital-friend.lovable.app/visitor/VIS-XXXXXXXX-XXXX` → ~70 chars
- Custom domain (`visiguard.sharvisoftwareservices.com`) is even longer.

A self-hosted slug route (e.g. `/v/abcde`) still can't beat 30 chars once the domain is included, so we need an external URL shortener.

## Approach
Use the free **is.gd** shortener (no API key, returns `https://is.gd/xxxxxx` ≈ 20–24 chars). Fallback to TinyURL if is.gd fails. Add the shortened URL to the SMS body in `send-sms-badge`.

### 1. `supabase/functions/send-sms-badge/index.ts`
- Build the full visitor QR URL: `${SITE_URL}/visitor/${visitorId}` (SITE_URL read from a new env var `PUBLIC_SITE_URL`, falling back to the published Lovable URL).
- New helper `shortenUrl(longUrl)`:
  - Try `https://is.gd/create.php?format=simple&url=...` (GET, plain text response).
  - On non-200 or error, try `https://tinyurl.com/api-create.php?url=...`.
  - If both fail, fall back to the full URL (log a warning).
- Append one line to the SMS body: `QR: <shortUrl>`.
- Keep the rest of the message unchanged; log the final length for visibility.

### 2. `supabase/functions/send-whatsapp-badge/index.ts` (consistency only)
- No code change required (WhatsApp already sends a full link / image). Out of scope unless we discover the same 30-char need there.

### 3. Settings / template
- No DB or template changes — the SMS body is built in code, not from a stored template.
- No new tables, no new RLS.

## Technical notes
- is.gd and TinyURL are public, free, no auth. Network egress from Supabase Edge Functions is allowed.
- Add a 3-second timeout (`AbortController`) on the shortener call so SMS sending is never delayed if the service is slow.
- The shortened URL is generated per-send (cheap, no caching needed). If we want to cache later, we can add a `short_links` table — out of scope for this change.
- CORS / secrets: no new secrets required. Optional new env `PUBLIC_SITE_URL` (defaults to `https://visitbuddy-digital-friend.lovable.app`).

## Out of scope
- Building an internal shortener with its own slug table.
- Changing the WhatsApp badge, email badge, or the `/visitor/:code` page itself.
- Editing the stored email templates.
