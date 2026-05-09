# VisiGuard — Self-Hosted Deployment

One-shot installer for Ubuntu 22.04 / 24.04. Everything lives under a single base directory (default `/home/vmsadm/resl/vvms`):

## Clean redeploy — migrations + seed SQL (recommended)

The on-prem app is reproduced from **plain SQL files** committed in this repo:

1. `supabase/migrations/*.sql` — schema, RLS, functions, storage buckets (already in repo).
2. `deploy/seed/*.sql` — a snapshot of cloud data as `INSERT … ON CONFLICT DO NOTHING` (regenerated whenever you want to refresh the mirror).

No `pg_dump` / `pg_restore` is involved, so there is no Postgres-version mismatch and no binary artifact to ship.

### Step 1 (one-time / when you want a fresh snapshot) — Refresh seed files

On any machine that can reach the cloud DB:

```bash
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
  bash deploy/generate-seed-files.sh

git add deploy/seed && git commit -m "Refresh cloud snapshot"
git push
```

This rewrites `deploy/seed/*.sql` (auth users + every public table). Ship `00_auth_users.sql` via `scp` if it's gitignored at your site.

### Step 2 — Wipe + redeploy on the Ubuntu server

```bash
git pull
sudo bash deploy/redeploy.sh --with-seed
# or, also restore uploaded photos:
sudo bash deploy/redeploy.sh --with-seed --storage /tmp/storage-export.tgz
```

`redeploy.sh` does the following automatically:

1. **Tear down**: `docker compose down -v`, removes straggler containers, deletes DB / storage / WhatsApp volumes.
2. **Free-port pre-flight**: probes `8000` (API), `3001` (WhatsApp bridge), `8443` (Kong HTTPS) and picks the next free port if any are taken. Persists the chosen ports in `config.env`.
3. **Reinstall**: re-runs `deploy.sh` with `SKIP_SCHEMA=1` (Supabase stack, frontend build, edge functions, Nginx, WhatsApp bridge — but no schema bootstrap).
4. **Apply migrations**: `apply-migrations.sh` runs every `supabase/migrations/*.sql` in chronological order, tracked in `public._lovable_migrations`. Already-applied files are skipped.
5. **Seed data** (with `--with-seed`): `import-seed.sh` runs every `deploy/seed/*.sql` (auth users → reference tables → transactional history) and re-applies Supabase grants.
6. **Restore uploads** (with `--storage`): untars the bucket archive into `volumes/storage/`.
7. **Verify**: polls `/rest/v1/locations` until it returns `200`.

After it finishes, log in with **any cloud user and their existing password**. Visitor photos and branding render exactly as on cloud.

Optional flags:
- `--keep-config` — don't delete `config.env`; reuse the previous JWT secret, ports and SMTP/Twilio answers without re-prompting.
- (omit `--with-seed`) — wipe and redeploy with empty data; only the primary admin (`bala@sharviinfotech.com`) and a default Head Office location are created.

### Where do uploaded files live on the Ubuntu server?

All files written via `supabase.storage.from(...).upload(...)` (visitor photos,
branding logos, badges) land on the local disk under:

```
$BASE_DIR/backend/supabase/docker/volumes/storage/
# e.g. /home/vmsadm/resl/vvms/backend/supabase/docker/volumes/storage/
```

That folder is bind-mounted into the `storage-api` container — there is no
cloud round-trip and nothing leaves the server. Back it up alongside the
Postgres data directory.

### Legacy scripts

`export-from-cloud.sh` and `import-to-onprem.sh` (binary `pg_dump` /
`pg_restore` flow) are kept for backward compatibility but are no longer
called by `redeploy.sh`. Prefer the migrations + seed SQL flow above.

---

## Cloud → On-Prem migration via seed files (preferred)

Plain SQL files committed in `deploy/seed/` reproduce the cloud database on
any on-prem install. No binary `pg_dump` artifact required — just `git pull`
and re-run the importer.

### Refresh seed files (run on a machine with cloud DB access)

```bash
# Option A: pass full connection string (works for any superuser/service-role URL)
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
  bash deploy/generate-seed-files.sh

# Option B: rely on PG* env vars already exported in your shell
bash deploy/generate-seed-files.sh

git add deploy/seed && git commit -m "Refresh seed data"
git push
```

Output (numeric prefix = import order):

| File range | Contents | Commit to git? |
|---|---|---|
| `00_auth_users.sql`           | `auth.users` + `auth.identities` (password hashes) | **No** — `.gitignored`, ship via `scp` |
| `10_*` … `21_*` (reference)   | locations, screens, tenant_settings, email_templates, email_config, vehicle_types, profiles, user_location_roles, role_screen_permissions, departments, employees, gates | **Yes** |
| `40_*` … `49_*` (transactional) | visitors, accompanying_visitors, agreements, watchlist, vehicles, vehicle_entries, appointments, audit_logs, email_logs, notifications | Optional — large/sensitive |

The generator runs `pg_dump --data-only --inserts --column-inserts` per table,
wraps each file in `BEGIN; TRUNCATE …; … COMMIT;` so re-imports are idempotent.

If `00_auth_users.sql` comes out empty, the DB user lacks `auth` schema access —
re-run with the postgres / service-role connection string.

### Import on the on-prem server

```bash
# 1. Get the latest seed files
cd /home/vmsadm/resl/vvms/frontend && git pull

# 2. (If you generated 00_auth_users.sql separately) copy it in
scp 00_auth_users.sql vmsadm@10.100.4.36:/home/vmsadm/resl/vvms/frontend/deploy/seed/

# 3. (Optional) copy the storage tarball too if you want visitor photos
scp storage-export.tgz vmsadm@10.100.4.36:/home/vmsadm/

# 4. Run the importer
sudo bash deploy/import-seed.sh /home/vmsadm/storage-export.tgz
# (omit the second arg if you don't have a storage tarball)
```

The importer:

1. Stops `supabase-functions` to prevent mid-import calls.
2. Runs every `deploy/seed/*.sql` in lexical (numeric) order.
3. Re-applies `anon` / `authenticated` / `service_role` grants.
4. Restores storage files from tarball if provided.
5. `NOTIFY pgrst, 'reload schema'` and restarts REST/Auth/Storage/Realtime/Meta/Functions.
6. Verifies `GET /rest/v1/locations` returns 200.

### Verify the bala HO-Admin role

```bash
docker exec -it supabase-db psql -U postgres -d postgres -c "
  SELECT u.email, r.role, r.is_ho_admin
  FROM auth.users u
  LEFT JOIN public.user_location_roles r ON r.user_id = u.id
  WHERE u.email = 'bala@sharviinfotech.com';"
```

Expected: one row with `is_ho_admin = true`. If `r.role` is `NULL`, the cloud
UUID didn't make it in — check that `00_auth_users.sql` is present and re-run
`deploy/import-seed.sh`.

---

```
/home/vmsadm/resl/vvms/
├── frontend/      # Vite app source + built dist (Nginx serves dist/)
├── backend/       # Self-hosted Supabase (docker compose stack + edge functions)
│   └── supabase/
│       └── docker/
├── middleware/    # Integration services
│   ├── whatsapp-bridge/         # whatsapp-web.js container source
│   └── whatsapp-bridge-data/    # persisted WhatsApp session
├── backups/       # nightly pg_dump archives (14-day retention)
└── config.env     # all answers from deploy.sh (re-used on re-run)
```

## Server requirements

- Ubuntu 22.04 or 24.04 LTS, root/sudo access
- 4 vCPU / 8 GB RAM / 80 GB SSD (minimum)
- Either:
  - a **static public IP** with TCP ports 80 + 8000 open (and 3001 if you want remote QR scanning), **or**
  - **DNS A records** pointing to the server (recommended for production):
    - `visiguard.example.com`     → frontend
    - `api.visiguard.example.com` → Supabase API + Studio
    - `wa.visiguard.example.com`  → WhatsApp bridge

## Install — IP-only mode (no domain)

Use this when you don't yet have a domain and want to access the app over the
server's public IP. Plain HTTP, no Let's Encrypt.

```bash
ssh root@your-server
git clone <YOUR_REPO_URL> /tmp/visiguard-src
cd /tmp/visiguard-src
sudo DEPLOY_MODE=ip PUBLIC_IP=203.0.113.10 bash deploy/deploy.sh
```

After install:

| Service             | URL                              |
|---------------------|----------------------------------|
| App                 | `http://<PUBLIC_IP>`             |
| Supabase API/Studio | `http://<PUBLIC_IP>:8000`        |
| WhatsApp bridge     | `http://<PUBLIC_IP>:3001` (only if WA_PORT≠0) |

**HTTP-only caveats** — modern browsers disable a few capabilities on plain
HTTP from non-`localhost` origins:

- Camera capture (visitor photo, QR scanner) — blocked by `getUserMedia`.
- PWA install / service worker / push notifications — disabled.
- Clipboard write API — restricted.

Workarounds: (1) point a domain at the server and re-run with
`DEPLOY_MODE=domain` for free Let's Encrypt TLS, or (2) install a self-signed
cert manually in Nginx.

## Install — Domain mode (recommended for production)

```bash
ssh root@your-server
git clone <YOUR_REPO_URL> /tmp/visiguard-src
cd /tmp/visiguard-src
sudo DEPLOY_MODE=domain bash deploy/deploy.sh
```

The script creates the `vmsadm` user (if missing), installs Docker / Node 20 / Nginx / Certbot, brings up self-hosted Supabase, deploys edge functions, builds the WhatsApp bridge container, builds the frontend, configures Nginx + TLS, enables systemd auto-start, and schedules nightly backups.

To deploy under a different path or user, set env vars before running:

```bash
sudo SERVICE_USER=vmsadm BASE_DIR=/home/vmsadm/resl/vvms DEPLOY_MODE=domain bash deploy/deploy.sh
```

## After install

1. Open `https://wa.<domain>` and scan the WhatsApp QR (first run only).
2. Open `https://visiguard.<domain>` and log in as the admin email/password you provided.
3. Open `https://api.<domain>` for Supabase Studio (basic-auth credentials in `/home/vmsadm/resl/vvms/config.env`).

## Updates

```bash
# Pull latest code into /tmp/visiguard-src then:
sudo bash /tmp/visiguard-src/deploy/update.sh
```

This rsyncs source into `frontend/`, rebuilds, redeploys edge functions, and rebuilds the WhatsApp bridge container.

## Backups

Cron runs `/usr/local/bin/visiguard-backup` nightly at 02:00 → `/home/vmsadm/resl/vvms/backups/`.

```bash
# Manual restore
pg_restore --clean --if-exists --no-owner \
  -d "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres" \
  /home/vmsadm/resl/vvms/backups/db-YYYYMMDD-HHMMSS.dump
```

## Migrating data + credentials from Lovable Cloud (one-time)

The deploy script already prompts for **every credential** the app uses
(Gemini, Twilio, SMTP, Resend, WhatsApp bridge key). To also bring across
**existing data** (auth users, profiles, visitors, vehicles, photos, branding)
use the helper scripts:

```bash
# 1) On any machine with internet access (needs psql client + jq + curl):
export SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres'
export SUPABASE_URL='https://<ref>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJ...'      # service role, NOT anon
bash deploy/export-from-cloud.sh
# Produces: cloud-export.dump  +  storage-export.tgz

# 2) Copy both files to the on-prem server, then:
scp cloud-export.dump storage-export.tgz vmsadm@<server>:/tmp/
ssh root@<server>
sudo bash /tmp/visiguard-src/deploy/import-to-onprem.sh \
  /tmp/cloud-export.dump /tmp/storage-export.tgz
```

Existing user passwords keep working (auth schema is included in the dump).
Photos and branding files are re-served from
`/home/vmsadm/resl/vvms/backend/supabase/docker/volumes/storage`.

> **Important:** the import script now **truncates the on-prem `auth.users`,
> `public.profiles`, and `public.user_location_roles` tables before
> `pg_restore`** so the cloud UUIDs become the source of truth. If anyone
> signed up locally before the import (e.g. `bala@sharviinfotech.com`), that
> local account is removed and replaced with the cloud row — the original
> cloud password works, and the HO Admin role mapping in
> `user_location_roles` lines up correctly. After the import finishes,
> verify with:
>
> ```sql
> SELECT u.email, r.role, r.is_ho_admin
> FROM auth.users u
> LEFT JOIN public.user_location_roles r ON r.user_id = u.id
> WHERE u.email = 'bala@sharviinfotech.com';
> ```
>
> Expected: one row with `is_ho_admin = true`. The header in the app should
> then show **HO Admin** and User Management opens.

## What's different vs Lovable Cloud

- **AI/ANPR**: Lovable AI Gateway is unavailable. `anpr-scan` falls back to Google Gemini directly using `GEMINI_API_KEY`.
- **Secrets**: managed via `/home/vmsadm/resl/vvms/config.env` and `backend/supabase/docker/volumes/functions/.env`. Edit either, then `update.sh` (or restart the `functions` service).
- **Auth providers** (Google OAuth, etc.): configure in Supabase Studio → Authentication.

## Troubleshooting

```bash
# Backend stack
docker compose -f /home/vmsadm/resl/vvms/backend/supabase/docker/docker-compose.yml ps
docker compose -f /home/vmsadm/resl/vvms/backend/supabase/docker/docker-compose.yml logs -f

# Middleware
docker logs -f wa-bridge

# Web
journalctl -u nginx
systemctl status visiguard-backend.service

# Re-run the installer at any time — it's idempotent
sudo bash /tmp/visiguard-src/deploy/deploy.sh
```

### Blank page after login / `503` `PGRST002` errors

If, right after importing a Lovable Cloud dump, the browser console shows:

```
GET http://<server>:8000/rest/v1/... 503 (Service Unavailable)
{"code":"PGRST002","message":"Could not query the database for the schema cache. Retrying."}
```

`pg_restore` stripped the GRANTs that Supabase's `anon` / `authenticated` roles
need. Run the one-shot repair script — it re-applies the grants, reloads the
PostgREST schema cache, and restarts the affected containers:

```bash
sudo bash /home/vmsadm/resl/vvms/frontend/deploy/repair-postgrest.sh
```

Reload the browser tab afterwards. The script is idempotent and safe to re-run.

### Manual recovery (if `repair-postgrest.sh` is unavailable)

These commands talk to Postgres through the running container, so they don't
depend on which host port the DB is exposed on (`5432` vs `54322`):

```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker
sudo docker compose ps
sudo docker compose exec db psql -U postgres -d postgres -c "select now();"

# Re-apply public/auth/storage grants and reload PostgREST
sudo docker exec -i supabase-db psql -U postgres -d postgres <<'SQL'
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'anon','authenticated','service_role','authenticator',
    'supabase_admin','supabase_auth_admin','supabase_storage_admin'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='public')  THEN EXECUTE format('GRANT USAGE ON SCHEMA public  TO %I', r); END IF;
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='auth')    THEN EXECUTE format('GRANT USAGE ON SCHEMA auth    TO %I', r); END IF;
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='storage') THEN EXECUTE format('GRANT USAGE ON SCHEMA storage TO %I', r); END IF;
    END IF;
  END LOOP;
END $$;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users') THEN
    GRANT SELECT ON auth.users TO anon, authenticated, service_role;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SQL

sudo docker compose restart rest auth storage realtime meta functions

ANON_KEY=$(grep '^ANON_KEY=' .env | cut -d= -f2-)
curl -i "http://127.0.0.1:8000/rest/v1/locations?select=id&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

### `profiles_user_id_fkey` error during seed import

If `import-seed.sh` aborts with:

```text
ERROR: insert or update on table "profiles" violates foreign key constraint "profiles_user_id_fkey"
DETAIL: Key (user_id)=(...) is not present in table "users".
```

then `deploy/seed/00_auth_users.sql` is missing or empty (it isn't committed
to git because it contains password hashes). Generate it from a machine that
can read `auth.users` on the source DB:

```bash
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
  bash deploy/generate-seed-files.sh
scp deploy/seed/00_auth_users.sql vmsadm@<server>:/home/vmsadm/resl/vvms/.../deploy/seed/
sudo bash deploy/import-seed.sh
```

`import-seed.sh` will now skip `16_profiles.sql` and `17_user_location_roles.sql`
with a warning when `00_auth_users.sql` is empty, instead of failing the whole import.

---

## WhatsApp bridge (external-URL / ngrok-style mode)

By default `deploy.sh` and `redeploy.sh` **do not** build the WhatsApp bridge
Docker image. The bridge is treated like ngrok — it lives outside the deploy
pipeline and the edge function reaches it via `WHATSAPP_BRIDGE_URL`.

The default URL is `http://<SERVER_IP>:<WA_HOST_PORT>` (auto-filled from your
public IP prompt). Override with any reachable URL: another server, an ngrok
tunnel, etc.

Three ways to run a bridge:

1. **External (default)** — point `WHATSAPP_BRIDGE_URL` at any reachable
   bridge endpoint. Nothing else to do.

2. **Local helper** — run on this host without coupling to the deploy pipeline:
   ```bash
   sudo bash deploy/run-wa-bridge.sh
   ```
   Builds with `--network=host` (bypasses UFW/Docker-bridge issues that block
   `deb.debian.org`) and exposes the bridge on `0.0.0.0:<WA_HOST_PORT>`.

3. **Inside redeploy** — only if your network can reach Debian mirrors:
   ```bash
   sudo bash deploy/redeploy.sh --with-seed --keep-config --build-wa
   ```
