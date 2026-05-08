# VisiGuard — Self-Hosted Deployment

One-shot installer for Ubuntu 22.04 / 24.04. Everything lives under a single base directory (default `/home/vmsadm/resl/vvms`):

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
