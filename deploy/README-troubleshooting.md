# Troubleshooting — VisiGuard on-prem

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