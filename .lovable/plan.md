## Updates from your last message

1. **Pre-install Postgres wipeout** — `install.sh` will detect and remove any existing system Postgres / leftover supabase-db data before bootstrapping, so port 5432 and `/var/lib/postgresql` are clean.
2. **Use default port 5432** — supabase-db container will publish on host `127.0.0.1:5432:5432`. Scripts still use `docker exec` as the primary path (safest), but external tools (pgAdmin, DBeaver) can now connect on 5432.

## Root cause recap

```
psql ... port 54322 ... pg_filenode.map: Permission denied
```

A stray local Postgres on 54322 hijacked the host `psql` connection. Switching to `docker exec` + cleaning the host makes this impossible to recur.

## Final architecture

```
Ubuntu host (post-wipeout)
├── /home/vmsadm/resl/vvms/         (BASE_DIR — survives redeploys)
│   ├── frontend/                   nginx-served Vite build
│   ├── backend/supabase/docker/    self-hosted Supabase compose
│   ├── middleware/whatsapp-bridge/
│   ├── storage/                    bind-mounted to supabase-storage
│   ├── backups/                    nightly pg_dump + storage tarballs
│   └── config.env                  generated once, reused on redeploy
└── /etc/nginx/sites-enabled/visiguard.conf

Deploy package (tar.gz)
├── install.sh                      ONE command, wipes + installs everything
├── deploy/
│   ├── lib/common.sh               psql_exec helper, CRLF heal, logging
│   ├── wipe-postgres.sh            NEW — purges any prior pg + frees 5432
│   ├── deploy.sh                   first-time setup (docker, nginx, env)
│   ├── redeploy.sh                 wipe DB volumes + reseed
│   ├── update.sh                   code-only redeploy (DB untouched)
│   ├── apply-migrations.sh         docker exec, _lovable_migrations tracking
│   ├── import-seed.sh              docker exec, runs seed/*.sql + storage tgz
│   ├── deploy-edge-functions.sh    rsync 21 functions → edge-runtime
│   ├── repair-postgrest.sh         NOTIFY pgrst + restart
│   ├── backup.sh                   pg_dumpall + storage tar
│   ├── restore.sh                  inverse of backup
│   ├── health-check.sh             6 probes (rest/auth/functions/db/nginx)
│   ├── nginx/                      *.conf.tpl (ip + domain)
│   ├── seed/                       00_auth_users_bootstrap + 10_*..49_*
│   ├── storage-export.tgz          uploaded files
│   └── README-troubleshooting.md
└── supabase/                       migrations/ + functions/
```

## NEW: `deploy/wipe-postgres.sh` (called from `install.sh` step 0)

```bash
# 1. Stop & remove any conflicting compose stack
docker compose -f $COMPOSE_FILE down -v --remove-orphans 2>/dev/null || true

# 2. Stop system Postgres if installed
systemctl stop postgresql 2>/dev/null || true
systemctl disable postgresql 2>/dev/null || true
apt-get purge -y 'postgresql-*' 2>/dev/null || true
rm -rf /etc/postgresql /var/lib/postgresql /var/log/postgresql

# 3. Kill any rogue Postgres process holding 5432/54322
for port in 5432 54322; do
  pid=$(lsof -ti tcp:$port 2>/dev/null || true)
  [ -n "$pid" ] && kill -9 $pid || true
done

# 4. Remove leftover supabase docker volumes
docker volume ls -q | grep -E 'supabase_(db|storage|deno)' | xargs -r docker volume rm -f

# 5. Hard-fail if 5432 is still occupied
if lsof -i :5432 >/dev/null 2>&1; then
  echo "FATAL: port 5432 still in use after wipe"; exit 2
fi
echo "OK — host is clean, 5432 is free."
```

User is prompted **"This will DELETE any existing Postgres data on this host. Continue? [yes/NO]"** before step runs (skipped only with `--force-wipe`).

## Updated docker-compose snippet

```yaml
supabase-db:
  ports:
    - "127.0.0.1:5432:5432"   # was 54322 → now standard 5432
```
`POSTGRES_HOST_PORT=5432` written to `config.env`. All scripts default to it but never need to use TCP — `psql_exec` always goes through `docker exec`.

## Core fixes (unchanged from prior plan)

1. `deploy/lib/common.sh` with `psql_exec` (docker exec only) sourced everywhere.
2. CRLF self-heal in script headers + root `.gitattributes` forcing LF.
3. Config loading: `$BASE_DIR/config.env` then `$HERE/config.env`, fail-fast on missing vars.
4. URL-encoded password in `DATABASE_URL` (Python `urllib.parse.quote`).
5. `until psql_exec -c 'select 1'` instead of blind sleeps.
6. Per-step logs in `/var/log/visiguard/`.

## Install flow

```
tar -xzf visiguard-onprem.tar.gz && cd visiguard-onprem
sudo bash install.sh
  [0]  wipe-postgres.sh            ← NEW (asks for confirmation)
  [1]  deploy.sh                   docker, nginx, certbot, env, frontend build,
                                   compose up (db on 5432)
  [2]  apply-migrations.sh         all supabase/migrations/*.sql
  [3]  import-seed.sh              auth bootstrap → reference → 30d tx → storage
  [4]  deploy-edge-functions.sh    21 functions
  [5]  health-check.sh             must exit 0 to declare success
open http://<ip>  →  bala@sharviinfotech.com / Sharvi@123
```

`redeploy.sh --keep-config` re-runs steps 1–5 keeping `config.env` and storage; `--with-wipe` also re-runs step 0.
`update.sh` rebuilds frontend + redeploys edge functions only.

## Seed scope (unchanged)

Reference tables always; last 30 days of `visitors / accompanying_visitors / vehicles / vehicle_entries / appointments`; skip `audit_logs / email_logs / notifications / anpr_events / visitor_agreements`.

## Storage (unchanged)

`deploy/storage-export.tgz` extracted into `$BASE_DIR/storage` (bind-mounted) + metadata-sync SQL into `storage.objects`.

## Edge functions (unchanged)

All 21 rsync'd into the edge-runtime volume; `config.env` injected via compose `env_file`. Missing optional secrets warn, not fail.

## Health checks

Container health, `/rest/v1/locations` 200, `/auth/v1/health` 200, `/functions/v1/notify-host` reachable, profiles count > 0, `nginx -t` clean.

## Troubleshooting doc covers

CRLF, `pg_filenode.map` perms, port 5432/54322 squatters, bad `DATABASE_URL`, PostgREST 503 / schema cache, edge functions stuck restarting, storage 404, nginx port 80 conflicts, ufw, certbot rate limit, what to do if `wipe-postgres.sh` refuses to free 5432.

## Risks

- **Destructive wipe**: `install.sh` deletes any prior Postgres on the host. Confirmation prompt + `--force-wipe` flag protect against accidents, but the user must understand this box becomes single-purpose.
- Outbound HTTPS to Twilio/SMTP/Gemini must be allowed for those features.

Approve and I'll implement in this order:
**lib/common.sh + CRLF guard → wipe-postgres.sh → deploy.sh (5432 + URL-encode) → apply-migrations / import-seed / repair-postgrest → install.sh + health-check.sh → backup/restore → troubleshooting doc → tar.gz packager.**