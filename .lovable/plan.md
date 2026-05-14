## The actual problem

Your self-hosted Supabase `edge-runtime` container starts with:

```
--main-service /home/deno/functions/main
```

It expects a **router file** at `volumes/functions/main/index.ts` that dispatches incoming requests to each function folder (`notify-host`, `send-email`, etc.).

Your `volumes/functions/` directory has all 18 function folders but **no `main/` folder**. So the runtime boots, fails with:

```
worker boot error: failed to bootstrap runtime:
could not find an appropriate entrypoint
```

…exits with code 1, Docker restarts it, it crashes again → restart loop. Kong then returns 503 because there's no healthy upstream. DNS is a red herring — it's already working.

Twilio env vars are unrelated to this crash. We can ignore them for now.

## Fix — 2 steps

### Step 1: Add `supabase/functions/main/index.ts` to the repo

A standard Supabase self-hosted router that:
- Reads the function name from the URL (`/functions/v1/<name>`)
- Loads `volumes/functions/<name>/index.ts` via `EdgeRuntime.userWorkers.create()`
- Forwards the request and streams back the response
- Honors `verify_jwt` per function (defaults to false to match your `config.toml`)

This file lives in the repo so future `deploy/update.sh` runs copy it into `volumes/functions/main/` automatically — you won't lose it again.

### Step 2: Deploy and restart

On the server:

```bash
cd /home/vmsadm/resl/vvms/visitbuddy-digital-friend-fb0260a6-main
git pull          # or however you sync the repo
sudo bash deploy/update.sh           # rsyncs main/ into volumes/functions/main/
sudo bash deploy/restart-edge-functions.sh
```

Expected output from `restart-edge-functions.sh`:

```
OK  supabase-edge-functions is running
OK  container resolves smtp.gmail.com
OK  functions are reachable (got 401 — auth required, that's expected)
```

A `401` (not `503`) from `curl http://localhost:8000/functions/v1/test-smtp` means the runtime is up and Kong is forwarding correctly.

## How to verify it's actually fixed

1. `docker ps | grep edge-functions` — STATUS should be `Up X minutes`, not `Restarting`.
2. `docker logs --tail=20 supabase-edge-functions` — should show `serving HTTP requests`, no `BootError`.
3. From the app: open Settings → Email → Send Test Email. You should get a real success/failure response (no more `503 name resolution failed`).

## What this does NOT fix

- **Twilio WhatsApp/SMS** — those will still fail until `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` / `TWILIO_SMS_NUMBER` are added to `backend/supabase/docker/.env` and passed through the `functions:` service in `docker-compose.yml`. You said to skip this — noted, parking it.
- Email (SMTP/Gmail) **will** start working as soon as the runtime is up, because SMTP creds come from the `email_config` table, not env vars.

## Confirm before I implement

I'll only add **one new file**: `supabase/functions/main/index.ts`. No changes to existing functions, no DB migrations, no docker-compose edits.

Approve and I'll create it.
