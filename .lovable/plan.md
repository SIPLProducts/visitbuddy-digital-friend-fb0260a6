# Fix: Blank page after clicking password-reset link (self-hosted)

## Root cause

The reset email link is shaped like:
```
http://10.100.4.36:8000/auth/v1/verify?token=...&type=recovery&redirect_to=http://10.100.4.36:8000/reset-password
```

GoTrue (Supabase Auth) validates `redirect_to` against its allow-list. If it's **not** allowed, GoTrue silently falls back to `GOTRUE_SITE_URL` and strips the path.

Your landing URL is `http://10.100.4.36` — no port, no `/reset-password` path. That's the signature of:
1. `GOTRUE_SITE_URL` is set to `http://10.100.4.36` (bare, no port), AND
2. `http://10.100.4.36:8000/reset-password` is not in `GOTRUE_URI_ALLOW_LIST` / `ADDITIONAL_REDIRECT_URLS`.

The app code (`send-password-reset` edge function, `Auth.tsx`, `ResetPassword.tsx`) is correct and needs no changes.

## Fix — update self-hosted Supabase env

On the server, edit the Supabase `.env` (typically `/opt/supabase/docker/.env` or wherever `docker-compose.yml` lives):

```env
# The public URL where your frontend is reachable (include port if non-80/443)
SITE_URL=http://10.100.4.36:8000

# Comma-separated list of allowed redirect targets after auth actions.
# Add every page that may receive a redirect: reset-password, approve-visitor, etc.
ADDITIONAL_REDIRECT_URLS=http://10.100.4.36:8000/reset-password,http://10.100.4.36:8000/**

# API_EXTERNAL_URL must also be the publicly reachable Supabase URL used in emails
API_EXTERNAL_URL=http://10.100.4.36:8000
```

Note: in the Supabase Docker stack the GoTrue container reads these as `GOTRUE_SITE_URL`, `GOTRUE_URI_ALLOW_LIST`, `GOTRUE_API_EXTERNAL_URL`. The `.env` keys above are what the bundled `docker-compose.yml` maps them from. If your compose file uses different names, set the `GOTRUE_*` ones directly.

Then restart auth:
```bash
cd /opt/supabase/docker
docker compose up -d auth
# or full restart: docker compose restart
```

## Verify

1. Request a password reset again from `/auth` → "Forgot password".
2. Open the email link.
3. You should land on `http://10.100.4.36:8000/reset-password#access_token=...&type=recovery` and see the "Reset your password" form.

## If you use HTTPS / a real domain later

When you put the app behind `https://vms.resustainability.com`, update the same three vars to that URL (and the matching `/reset-password` entry in `ADDITIONAL_REDIRECT_URLS`), then restart `auth` again.

## What NOT to change

- Don't touch `supabase/functions/send-password-reset/index.ts` — it already passes the right `redirectTo` from the browser.
- Don't touch `src/pages/ResetPassword.tsx` — it already listens for `PASSWORD_RECOVERY` and `SIGNED_IN` events and parses the hash via `detectSessionInUrl` (default on).
- Don't add a SPA redirect rule in Nginx for `/reset-password` specifically — your existing SPA fallback already serves `index.html` for unknown paths; the problem was that the URL never reached `/reset-password` in the first place.

## Optional follow-up (later, not required for this fix)

Add a small console.log in `ResetPassword.tsx` to log `window.location.hash` on mount — makes future debugging of similar redirect issues a one-glance check.
