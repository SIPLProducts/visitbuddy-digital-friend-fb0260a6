## Root cause

The edge function logs show `[whatsapp-bridge] missing secrets { hasUrl: false, hasKey: false }` even after `configure-wa-bridge.sh` runs. The Supabase `functions` container does **not** read its env from `backend/supabase/docker/.env` — `deploy.sh` writes the edge-function env to:

```
backend/supabase/docker/volumes/functions/.env
```

That is the file mounted into the `supabase-edge-functions` container. Our current `deploy/configure-wa-bridge.sh` only updates `config.env` and `backend/supabase/docker/.env`, so the bridge vars never reach the container — which is exactly what the logs confirm.

## Fix

1. **Update `deploy/configure-wa-bridge.sh`**
   - Add a third target file: `$BASE_DIR/backend/supabase/docker/volumes/functions/.env` (the real edge-function env file).
   - Upsert `WHATSAPP_BRIDGE_URL` and `WHATSAPP_BRIDGE_API_KEY` into it (create the file if missing — but normally `deploy.sh` has already created it).
   - Keep upserting into `config.env` (used by `run-wa-bridge.sh`) so the bridge container itself keeps the same `API_KEY`.
   - Drop or de-emphasize the write to `backend/supabase/docker/.env` (it's harmless but misleading — the functions container does not read it).
   - After writing, run `docker compose -f backend/supabase/docker/docker-compose.yml up -d --force-recreate functions` so the container picks up the new env file.

2. **Verify in the script**
   - After recreate, poll `docker logs supabase-edge-functions` for the `missing secrets` line for ~10s; if still present, print a clear remediation hint pointing at `volumes/functions/.env`.
   - Hit `http://127.0.0.1:${WA_HOST_PORT}/health` (already done) and additionally curl the edge function once via Kong to confirm it no longer returns `unconfigured`.

3. **Document in `deploy/README-troubleshooting.md` (section 0h)**
   - Note that the canonical env file for edge functions is `backend/supabase/docker/volumes/functions/.env`, not `backend/supabase/docker/.env`.
   - Reiterate the recovery command:
     ```bash
     git pull
     sudo bash deploy/configure-wa-bridge.sh
     ```

No app code or edge-function code changes are needed — the function already reads `Deno.env.get("WHATSAPP_BRIDGE_URL"/"WHATSAPP_BRIDGE_API_KEY")` correctly; we just need those vars to actually be present in the container.

## After approval, on your server

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/configure-wa-bridge.sh
docker logs --tail=20 supabase-edge-functions   # should no longer show "missing secrets"
```

Then in the app: Settings → WhatsApp → Connect WhatsApp → scan QR → flip channel to "WhatsApp Web (Demo)" → Send test.