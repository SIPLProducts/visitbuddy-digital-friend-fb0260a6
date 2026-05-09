## Root cause of "no data in tables"

`redeploy.sh` runs in 5 phases:

```
[3/5] deploy.sh        ← failed here
[4/5] apply-migrations.sh   ← never ran
[4b/5] import-seed.sh       ← never ran  (this is what populates tables)
[4c/5] repair-postgrest.sh
[5/5] health check
```

`deploy.sh` aborted at the Nginx step because two templates are missing in `deploy/nginx/`:

- `supabase-api.conf.tpl` ← missing (domain mode only)
- `whatsapp.conf.tpl` ← missing (domain mode only)
- `frontend-ip.conf.tpl` ✓
- `frontend.conf.tpl` ✓

Your saved `config.env` has `DEPLOY_MODE=domain`, so `install_site` tried to read `supabase-api.conf.tpl`, `sed` errored, and `set -euo pipefail` killed the script before migrations + seed could run. **That is why Studio shows empty tables.**

A second issue visible in the log: `WHATSAPP_BRIDGE_URL = http://host.docker.internal:3001`. Edge functions inside the docker-compose network can't reach `host.docker.internal` reliably — and `supabase-edge-functions` is currently `Restarting`. It should point at the host's public IP.

## Plan

### 1. Add the two missing Nginx templates

**`deploy/nginx/supabase-api.conf.tpl`** — vhost for `api.<domain>` proxying to Kong on `127.0.0.1:${API_PORT}`. Includes WebSocket upgrade headers for Realtime, `client_max_body_size 25M` for uploads, no buffering for edge-function streams.

**`deploy/nginx/whatsapp.conf.tpl`** — vhost for `wa.<domain>` proxying to the WhatsApp bridge on `127.0.0.1:${WA_HOST_PORT}` with WS upgrade headers for the QR pairing stream.

Both use `__API_DOMAIN__` / `__WA_DOMAIN__` / `__ROOT__` placeholders to match the existing `install_site` sed substitutions.

### 2. Harden `install_site` in `deploy.sh`

Wrap the `sed` call in an existence check. If the template is missing, log a clear warning and continue instead of killing the whole deploy. This guarantees a partially-broken nginx setup never blocks the migration + seed phases again.

### 3. Auto-detect `PUBLIC_IP` in both modes + fix stale WA URL

In `deploy.sh`:
- Move the `DETECTED_IP=$(curl … ipify)` block out of the `ip`-mode branch so it runs for `domain` mode too.
- Persist `PUBLIC_IP` to `config.env`.
- When the cached `WHATSAPP_BRIDGE_URL` still equals `http://host.docker.internal:<port>`, replace the prompt default with `http://<PUBLIC_IP>:<WA_HOST_PORT>` so a single Enter fixes it.

### 4. Document edge-function restart troubleshooting

After redeploy, if `supabase-edge-functions` keeps restarting, check:
```
docker compose -f $BASE_DIR/backend/supabase/docker/docker-compose.yml logs --tail=80 functions
```
Likely cause: a function importing a module not available in `edge-runtime` or referring to an env var with a value the runtime rejects. Not blocking for the data-import problem — REST/Auth/Realtime work without it.

## Files to add / change

- **add** `deploy/nginx/supabase-api.conf.tpl`
- **add** `deploy/nginx/whatsapp.conf.tpl`
- **edit** `deploy/deploy.sh`:
  - Detect & persist `PUBLIC_IP` in both modes
  - Override stale `host.docker.internal` default for `WHATSAPP_BRIDGE_URL`
  - Make `install_site` resilient to missing templates

No DB migrations, no edge-function code changes, no frontend changes.

## What you'll do on the server after the patch

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
# pull the new files (git pull or re-copy)

# Run again — keep saved answers, re-import seed
sudo bash deploy/redeploy.sh --with-seed --keep-config
```

When it gets to the prompt:
```
WhatsApp bridge URL reachable from edge functions [http://<your-public-ip>:3001]:
```
just press Enter.

Expected result on completion:
- All 4 nginx vhosts written, `nginx -t` passes
- `apply-migrations.sh` runs every file in `supabase/migrations/`
- `import-seed.sh` loads all `deploy/seed/*.sql` files (locations, screens, employees, vehicles, etc.)
- Health check: `REST returned 200 on port 8000`
- Studio shows all seeded rows

Then point DNS A records for `<APP_DOMAIN>`, `api.<APP_DOMAIN>`, `wa.<APP_DOMAIN>` at this server's public IP and run `sudo certbot --nginx` for TLS.
