# Troubleshooting — VisiGuard on-prem

## 0. `mapping key "ports" already defined` when starting the stack

**Symptom:**
```
failed to parse .../supabase/docker/docker-compose.yml:
  yaml: construct errors: line ...: mapping key "ports" already defined at line ...
```

**Cause:** an older deploy script appended a duplicate `ports:` block to the Supabase compose file. The current `deploy.sh` patches YAML safely and keeps a `.orig` backup, but the file already on disk is corrupted.

**Fix (one-time recovery):**
```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker 2>/dev/null && docker compose down -v 2>/dev/null || true
sudo rm -rf /home/vmsadm/resl/vvms/backend
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
sudo bash install.sh --with-seed
```

## 0b. `Bind for 127.0.0.1:5432 failed: port is already allocated`

**Symptom:** `docker compose up` fails on `supabase-pooler` (or `supabase-db`)
with `Bind for 127.0.0.1:5432 failed: port is already allocated`.

**Cause:** Either a leftover system Postgres, an old Supabase container from a
previous attempt, or the upstream compose file's pooler service is also trying
to publish host port 5432. The current `deploy.sh` strips that pooler mapping
and runs a preflight cleanup, but a stale stack on disk can still hold the port.

**Fix (one-shot recovery):**
```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker 2>/dev/null && \
  docker compose down -v --remove-orphans 2>/dev/null || true
sudo bash /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6/deploy/wipe-postgres.sh --force
sudo rm -rf /home/vmsadm/resl/vvms/backend
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
sudo bash install.sh --force-wipe --with-seed
```

If port 5432 is *still* held after the wipe, see exactly what owns it:
```bash
sudo ss -lntp | awk '/:5432 /{print}'
docker ps --filter 'publish=5432'
```

## 0c. `could not open file "global/pg_filenode.map": Permission denied`

## 0d. `trailing junk after numeric literal at or near "1b"` during seed import

**Symptom:** `import-seed.sh` runs a few `INSERT 0 1` lines then aborts with:
```
ERROR:  trailing junk after numeric literal at or near "1b"
LINE 2: ...checkout_method, scheduled_date, ...) VALUES ('1b5eb6aa-5...
```

**Cause:** an older `deploy/generate-seed-files.sh` piped `pg_dump --inserts`
through `grep '^INSERT'`. When a text value contains a newline, `pg_dump`
wraps the row across multiple lines — `grep` keeps only the first line and
silently drops the rest. The result is an unterminated string literal that
fuses with the next row, and Postgres complains about the row that follows
the broken one (not the broken row itself).

**Fix:** `import-seed.sh` now runs `deploy/sanitize-seed.sh` automatically
before importing. It comments out any malformed row in place so the rest
of the import succeeds. Just re-run:
```bash
sudo bash deploy/import-seed.sh
```

The lost rows are preserved as `-- [sanitize-seed] dropped malformed row:`
comments inside the seed files. To recover them you must regenerate the
seeds (the fixed `generate-seed-files.sh` no longer truncates rows):
```bash
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
  bash deploy/generate-seed-files.sh
```

### `syntax error at or near "["` with `LINE 1: [sanitize-seed] dropped malformed row:`

**Cause:** an even older buggy run of `sanitize-seed.sh` wrote bare
`[sanitize-seed] dropped malformed row:` lines (no `--` prefix) into the
seed files, and those broken files were committed to git. Two files are
known to be affected: `deploy/seed/00_auth_users_bootstrap.sql` and
`deploy/seed/48_email_logs.sql`.

**Fix:** pull the latest repo (the corrupted lines have been stripped)
and re-run the import. `sanitize-seed.sh` now also self-heals these bare
marker lines automatically:
```bash
git pull
sudo bash deploy/import-seed.sh
```

## 0e. Login returns `{"code":"unexpected_failure","message":"Database error querying schema"}`

**Symptom:** login from the app fails. `docker logs --tail=200 supabase-auth`
shows:
```
error finding user: sql: Scan error on column index 3,
  name "confirmation_token": converting NULL to string is unsupported
```

**Cause:** the seeded `auth.users` rows were inserted without the GoTrue
token columns (`confirmation_token`, `recovery_token`,
`email_change_token_new`, `email_change`, etc.), so they default to `NULL`.
GoTrue scans them as Go strings and crashes — every password login returns
HTTP 500 with `unexpected_failure`.

**Fix:** one-shot repair script. Safe to re-run, no data loss:
```bash
sudo bash deploy/repair-auth.sh
```
It backfills the NULL token columns to empty strings, re-asserts auth
schema grants for `supabase_auth_admin`, restarts `supabase-auth`, and
verifies `/auth/v1/health` returns 200.

`import-seed.sh` and `00_auth_users_bootstrap.sql` now run the same
normalization automatically, so fresh installs won't hit this.

**Symptom:** `deploy.sh` finishes ("DEPLOYMENT COMPLETE"), then
`apply-migrations.sh` immediately fails with:
```
psql: error: connection to server on socket "/run/postgresql/.s.PGSQL.5432" failed:
FATAL:  could not open file "global/pg_filenode.map": Permission denied
```

**Cause:** an older `deploy.sh` ran `chown -R vmsadm $BASE_DIR`, which
walked into `backend/supabase/docker/volumes/db/data` and rewrote every
PostgreSQL data file to `vmsadm:vmsadm`. The already-running postmaster
keeps its open file descriptors so `pg_isready` still says OK, but every
**new** backend (every `psql` connection) can't open its own data files.

The current `deploy.sh` no longer chowns the PG bind mount, and
`install.sh` auto-repairs this before running migrations. If you're on a
server already in the bad state, run the repair manually:

```bash
sudo bash deploy/repair-pg-perms.sh
sudo bash deploy/apply-migrations.sh
sudo bash deploy/import-seed.sh
sudo bash deploy/health-check.sh
```

No wipe / reinstall needed — your data survives.

### If `repair-pg-perms.sh` reports "Smoke test still failing"

The new repair script now prints real diagnostics. Read them carefully:

1. **Files still owned by wrong uid** — re-run as root and confirm
   `BASE_DIR` matches your install (default `/home/vmsadm/resl/vvms`).
   The script fixes both the in-container path AND the host bind mount
   `backend/supabase/docker/volumes/db/data`.
2. **`POSTGRES_PASSWORD not set`** — `config.env` is missing or moved.
   Re-source it: `source /home/vmsadm/resl/vvms/config.env` then re-run.
3. **Logs show "database files are incompatible" / corruption / FATAL on
   startup** — the data dir is unrecoverable. Wipe and re-init:
   ```bash
   sudo bash deploy/wipe-postgres.sh --force
   sudo bash install.sh --force-wipe --with-seed
   ```

## 1. `pg_filenode.map: Permission denied`

**Symptom:** `psql ... global/pg_filenode.map: Permission denied`.
**Cause:** Host `psql` connected to a stray system Postgres (often on port 54322 left over from `supabase` CLI), not the docker container.
**Fix:** All scripts now use `docker exec supabase-db psql` only. If you still see this, you're running an old script copy. Re-extract the package and run:
```bash
sudo bash deploy/wipe-postgres.sh --force
sudo bash install.sh --with-seed
```

## 2. CRLF / `: invalid option nameine 21: set: pipefail`

**Cause:** Files were edited on Windows and have `\r\n` line endings.
**Fix:** Every script self-heals on first run. To do it manually:
```bash
sudo find . -type f \( -name '*.sh' -o -name '*.tpl' \) -exec sed -i 's/\r$//' {} +
```

## 3. PostgREST returns 503 / blank screen after login

```bash
sudo bash deploy/repair-postgrest.sh
```
Re-grants schema USAGE, restarts rest/auth/storage, polls `/rest/v1/locations` until 200.

## 4. Port 5432 in use

```bash
sudo ss -lntp | grep :5432
sudo bash deploy/wipe-postgres.sh --force   # purges system pg + frees port
```

## 5. `INSERT ... profiles violates foreign key constraint profiles_user_id_fkey`

`16_profiles.sql` references auth.users that don't exist yet. Run the bootstrap first:
```bash
# In Studio SQL Editor or via:
docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD supabase-db \
  psql -U postgres -d postgres < deploy/seed/00_auth_users_bootstrap.sql
```
Then re-run `16_profiles.sql`.
`import-seed.sh` does this automatically.

## 6. `DATABASE_URL` parse errors (`could not translate host name "123@db"`)

Caused by special characters in `POSTGRES_PASSWORD` not URL-encoded. `deploy.sh` now encodes it via `urllib.parse.quote`. To rebuild the function `.env`:
```bash
sudo bash deploy/deploy.sh        # regenerates volumes/functions/.env
docker restart supabase-edge-functions
```

## 7. Edge functions stuck restarting

```bash
docker logs --tail=80 supabase-edge-functions
```
Common causes: missing required secret in `volumes/functions/.env`, syntax error in a function, lockfile drift. Rerun `deploy.sh` to regenerate the env, then `docker restart supabase-edge-functions`.

## 8. nginx: conflicting server name on 0.0.0.0:80

Old vhost left over. Remove with:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 9. WhatsApp bridge unreachable

Bridge is optional. If you want it locally:
```bash
sudo bash deploy/run-wa-bridge.sh
```
Otherwise set `WHATSAPP_BRIDGE_URL` in `config.env` to point at an external bridge.

## 10. Health check fails on profiles count

Seed wasn't imported. Run:
```bash
sudo bash deploy/import-seed.sh
```

## Default credentials

| Account               | Email                          | Password   |
|-----------------------|--------------------------------|------------|
| Primary admin         | bala@sharviinfotech.com        | Sharvi@123 |
| Studio dashboard      | (in `config.env` DASHBOARD_*)  | random     |
| Postgres              | postgres                       | from prompt |

All seeded user accounts share password `Sharvi@123` until rotated via User Management.
## 0f. Edge functions return `{"message":"name resolution failed"}`

**Symptom:** "Send Test Email", WhatsApp test, or any other edge function that
calls an external service (Twilio, Gmail SMTP, your WhatsApp bridge) returns:
```json
{ "message": "name resolution failed", "request_id": "..." }
```
The Lovable UI and database keep working — only edge functions fail.

**Cause:** the `supabase-edge-functions` container cannot resolve external
hostnames. Almost always this is because the host uses `systemd-resolved`
(stub `127.0.0.53` in `/etc/resolv.conf`), which Docker copies into containers
but the container itself cannot reach. Less commonly the host firewall is
blocking outbound DNS (53/UDP) or HTTPS (443/TCP).

**Diagnose first (read-only):**
```bash
sudo bash deploy/diagnose-egress.sh
```
Look for `FAIL  container CANNOT resolve ...` — that confirms the issue.

**Fix:**
```bash
sudo bash deploy/fix-edge-dns.sh
```
This writes `/etc/docker/daemon.json` with `"dns": ["8.8.8.8","1.1.1.1"]`,
restarts Docker, brings the Supabase stack back up, and verifies that the
edge-functions container can resolve `smtp.gmail.com`. Safe to re-run.

**If the fix script reports the container still cannot resolve:** your host
firewall is blocking outbound traffic. Allow:
- `53/UDP` (DNS) outbound
- `443/TCP` to `api.twilio.com` outbound
- `587/TCP` to `smtp.gmail.com` outbound (or whichever SMTP host you use)

## 0g. `name resolution failed` but the diagnose script says the container is **not running**

**Symptom:** `deploy/diagnose-egress.sh` reports:
```
OK    host resolves smtp.gmail.com
OK    TCP smtp.gmail.com:587 reachable from host
...
Error response from daemon: container ... is not running
FAIL  container CANNOT resolve smtp.gmail.com
```
The host DNS and egress are fine — the `supabase-edge-functions` container
itself has crashed/exited. Kong then returns `name resolution failed` because
its upstream is down. **Do NOT run `fix-edge-dns.sh` for this case** — it's not
a DNS issue.

**Diagnose:**
```bash
sudo bash deploy/diagnose-edge-functions.sh
```
This prints the container's exit code, OOM status, last 200 log lines, and
whether required env vars (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`,
`TWILIO_*`, etc.) are present.

**Fix:**
```bash
sudo bash deploy/restart-edge-functions.sh
```
This stops, removes, and recreates only the `functions` service, then probes
Kong to confirm functions are reachable.

**Common root causes seen in the logs:**
| Log line                                              | Fix |
|-------------------------------------------------------|-----|
| `BootError: Worker boot error` for one function       | That function has a syntax/import error — fix it or temporarily move its folder out of `volumes/functions/` |
| `Missing environment variable JWT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` | Re-add the key to `backend/supabase/docker/.env` and re-run the restart script |
| `OOMKilled: true` / exit `137` immediately after start | Bump the container memory limit in the compose file |
| `failed to bind 0.0.0.0:9000`                          | Another process holds the port — free it or change the port |
