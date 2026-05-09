## Goal

Wipe the on-prem server cleanly and redeploy the app so it mirrors the cloud project — same schema, same users (with passwords), same storage objects — with no port conflicts and a single repeatable script.

## Strategy

You will run, on a machine that can reach the cloud DB:

```
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
SUPABASE_URL='https://<ref>.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<service role>' \
bash deploy/export-from-cloud.sh
```

That produces `cloud-export.dump` + `storage-export.tgz`. You then `scp` both to the on-prem server and run the new `deploy/redeploy.sh` (described below) which:

1. Tears the current stack down and wipes its volumes.
2. Picks free ports.
3. Reinstalls Supabase + middleware.
4. Restores the cloud dump (auth.users + public + storage).
5. Re-applies grants and restarts API.
6. Verifies REST returns 200 before exiting.

## Files to add / change

### 1. `deploy/redeploy.sh` (new — single entrypoint)

Pre-flight, then orchestrate everything. Sections:

```text
1. Require root, optional flags: --dump <path> --storage <path>
2. Stop & remove existing containers:
     - cd $BACKEND_DIR/supabase/docker && docker compose down -v
     - docker rm -f wa-bridge supabase-db supabase-rest supabase-auth \
         supabase-storage supabase-realtime supabase-meta supabase-functions \
         supabase-kong supabase-studio supabase-imgproxy supabase-vector \
         supabase-analytics supabase-pooler 2>/dev/null
     - docker volume prune -f --filter label=com.docker.compose.project=docker
     - rm -rf $BACKEND_DIR/supabase/docker/volumes/db/data
     - rm -rf $BACKEND_DIR/supabase/docker/volumes/storage/*
     - rm -rf $MIDDLEWARE_DIR/whatsapp-bridge-data/*
     - rm -f  $BASE_DIR/config.env   (force fresh prompts; or keep with --keep-config)
3. Free-port detection helper (see #2)
4. Re-run deploy.sh logic (or invoke it) with chosen ports
5. If --dump given, run import-to-onprem.sh with auto-grant + repair
6. Final health check loop on /rest/v1/locations -> 200
```

### 2. Free-port helper (in `deploy.sh`)

Replace the hard-coded prompts/defaults with an auto-detect:

```bash
pick_port() {
  local start="$1" p="$start"
  while ss -ltn "( sport = :$p )" 2>/dev/null | grep -q LISTEN; do
    p=$((p+1))
  done
  echo "$p"
}

API_PORT="${API_PORT:-$(pick_port 8000)}"          # 8000 -> 8001 -> ...
PG_HOST_PORT="${PG_HOST_PORT:-$(pick_port 54322)}" # expose DB on free port
WA_PORT="${WA_PORT:-$(pick_port 3001)}"            # WhatsApp bridge
KONG_HTTPS_PORT="${KONG_HTTPS_PORT:-$(pick_port 8443)}"
```

Then patch the Supabase compose file: rewrite `0.0.0.0:8000:8000`, `8443:8443`, and the DB `5432:5432` mapping to use the chosen host ports. Persist them in `config.env` and the frontend `.env.production` (`VITE_SUPABASE_URL=http://$PUBLIC_IP:$API_PORT`).

### 3. `deploy/import-to-onprem.sh` — make it port-agnostic

Replace `psql "$PGCONN"` (which uses host `127.0.0.1:5432`) with `docker exec -i supabase-db psql -U postgres -d postgres`, so it works regardless of which host port we picked. Same change in `repair-postgrest.sh` (already done) and any leftover `psql "$PGCONN"` lines in `deploy.sh`.

### 4. `deploy/export-from-cloud.sh` — already correct

It already dumps `auth + public + storage` schemas with `--no-owner --no-privileges` and packs the storage tarball. We will document its required env vars in the README.

### 5. `deploy/import-to-onprem.sh` — final sequence

After `pg_restore`, run in this order:
1. Re-apply grants on `public/auth/storage` (guarded by `IF EXISTS`).
2. Re-create storage buckets (`visitor-photos`, `branding`).
3. Restore storage tarball into `volumes/storage/stub/stub-stub-stub/<bucket>/`.
4. `docker compose restart rest auth storage realtime meta functions`.
5. Poll `/rest/v1/locations` until 200, else exit non-zero.
6. Print row counts.

### 6. README.md update

Add a "Clean redeploy with cloud mirror" section showing the exact 4 commands:

```bash
# On a machine that can reach the cloud DB:
SUPABASE_DB_URL='...' SUPABASE_URL='...' SUPABASE_SERVICE_ROLE_KEY='...' \
  bash deploy/export-from-cloud.sh

scp cloud-export.dump storage-export.tgz vmsadm@<server>:/tmp/

# On the on-prem server:
sudo bash deploy/redeploy.sh --dump /tmp/cloud-export.dump --storage /tmp/storage-export.tgz
```

## What stays the same

- Frontend source, edge functions, RLS policies, Twilio/Resend/Gemini secrets — all untouched in code; they're just re-deployed and re-injected from `config.env`.
- The `deploy/init-schema.sql` fallback is still there for greenfield installs that don't have a cloud dump.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Port collision after pick (race) | `pick_port` re-runs at compose-up time; deploy fails fast with a clear message if the chosen port is grabbed in between. |
| `wa-bridge` keeps old WhatsApp session and reconnects to wrong number | We wipe `whatsapp-bridge-data` so you'll re-scan the QR once. |
| pg_restore strips grants → blank app | Auto-runs the same SQL block as `repair-postgrest.sh` after restore, then a 60s health-check loop. |
| `00_auth_users.sql` empty | Not used in this flow — full `cloud-export.dump` includes `auth.users` directly. |
| Storage volume permissions | After `tar -xzf`, `chown -R 1000:1000 volumes/storage`. |
| Frontend cached old API URL | `.env.production` rewritten with new `API_PORT`; `npm run build` re-runs in `redeploy.sh`. |

## What you need to do after I implement this

1. Pull the updated repo on both the export machine and the on-prem server.
2. Run `export-from-cloud.sh` on the export machine.
3. `scp` the two artifacts to the on-prem server.
4. Run `sudo bash deploy/redeploy.sh --dump ... --storage ...`.
5. Open the printed app URL — log in with any cloud user / their existing password.