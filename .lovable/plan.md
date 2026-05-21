# Fix: Blank page on reset link (self-hosted at https://vms.resustainability.com)

## Why env changes are needed even though the app is "already deployed"

The deployed URL `https://vms.resustainability.com` is your **React frontend**. But **GoTrue** (the Supabase Auth service running in Docker on your server) is a separate process that has no idea what URL the frontend uses. Every auth-related URL it puts in emails — and every `redirect_to` it accepts — comes from **its own env vars**, not from the frontend.

Your reset-link landing URL proves this:

```
http://10.100.4.36:8000/auth/v1/verify?token=...&redirect_to=http://10.100.4.36
```

Two things wrong, both purely env-config on the server:

1. `verify` host is `10.100.4.36:8000` → GoTrue's `API_EXTERNAL_URL` is set to the bare LAN IP. So every auth email points users at the IP (which won't work from outside the LAN, and isn't HTTPS).
2. `redirect_to` is `http://10.100.4.36` (no path, no port) → GoTrue rejected the `redirect_to` the frontend sent (because it isn't in the allow-list) and fell back to its `SITE_URL`, which is the bare IP.

So we're not "adding a new URL" — we're **replacing the wrong IP-based URLs with the correct public domain**.

## Fix — one .env file on the server, then restart auth

On the deployed server, edit Supabase's `.env` (the one next to `docker-compose.yml`, typically `/opt/supabase/docker/.env`):

```env
# Public URL of the frontend — used as the default landing after auth actions
SITE_URL=https://vms.resustainability.com

# Public URL of the Supabase API (Kong) — used when building links inside emails
API_EXTERNAL_URL=https://vms.resustainability.com

# Allowed redirect targets after auth actions
ADDITIONAL_REDIRECT_URLS=https://vms.resustainability.com/reset-password,https://vms.resustainability.com/**
```

If your compose file uses the `GOTRUE_*`-prefixed names directly, set these instead:
```env
GOTRUE_SITE_URL=https://vms.resustainability.com
GOTRUE_API_EXTERNAL_URL=https://vms.resustainability.com
GOTRUE_URI_ALLOW_LIST=https://vms.resustainability.com/reset-password,https://vms.resustainability.com/**
```

Restart auth:
```bash
cd /opt/supabase/docker
docker compose up -d auth
```

## Confirm Nginx already proxies the auth path

Since the frontend points `VITE_SUPABASE_URL` at `https://vms.resustainability.com`, your Nginx must forward `/auth/v1/*` to the Supabase Kong container (the project ships `deploy/nginx/supabase-api.conf.tpl` for this — make sure it's enabled on the `vms.resustainability.com` server block). Quick check from your laptop:

```bash
curl -i https://vms.resustainability.com/auth/v1/health
# expect: 200 OK with {"name":"GoTrue", ...}
```

If that 404s, the env fix alone won't be enough — Nginx needs the supabase-api config wired in too.

## Verify

1. Open `https://vms.resustainability.com/auth` → click **Forgot password** → submit email.
2. Open the email — the "Reset Password" button now points at `https://vms.resustainability.com/auth/v1/verify?...&redirect_to=https://vms.resustainability.com/reset-password`.
3. Click it → you land on `https://vms.resustainability.com/reset-password#access_token=...&type=recovery` and see the "Reset your password" form.

## No app code changes

`send-password-reset/index.ts`, `Auth.tsx`, and `ResetPassword.tsx` are all correct. This is purely a server-side env config fix.
