## Root cause (confirmed)

`deploy.sh` runs:

```bash
chown -R "$SERVICE_USER:$SERVICE_USER" "$BASE_DIR"
```

at **line 41** AND **line 559** (after compose is up). `$BASE_DIR` is `/home/vmsadm/resl/vvms`, which contains `backend/supabase/docker/volumes/db/data` — the live PostgreSQL data directory bind-mounted into `supabase-db`.

That recursive chown silently rewrites every PG data file from `postgres:postgres` (uid 70 inside the container) to `vmsadm:vmsadm`. The already-running postmaster keeps its open file descriptors, so `pg_isready` still answers "yes". But the moment apply-migrations.sh asks for a **new** psql session, the freshly-forked backend tries to re-open `global/pg_filenode.map` and gets:

```
FATAL: could not open file "global/pg_filenode.map": Permission denied
```

That is exactly the error you keep seeing, and it happens 100% of the time because it's baked into deploy.sh — wiping and reinstalling will not fix it on its own.

The earlier "port 5432 already allocated" and "ports already defined" rounds were real, but they were masking this third bug. With those fixed, the install gets far enough that the chown finally executes, and you hit this.

## Fix plan

### 1. Stop chowning the Postgres data directory (the actual fix)
- In `deploy/deploy.sh`, replace both `chown -R "$SERVICE_USER:$SERVICE_USER" "$BASE_DIR"` calls (lines 41 and 559) with a scoped variant that explicitly **excludes** `backend/supabase/docker/volumes` (db data, storage data, functions cache, analytics).
- Implement using `find ... -path .../backend/supabase/docker/volumes -prune -o -exec chown ...` so the PG/storage/functions volumes keep whatever ownership their containers assigned.
- Apply the same exclusion in `deploy/update.sh` (it has its own `chown -R`) and any other script that touches `$BASE_DIR` recursively.

### 2. Self-heal an already-broken install
The user's current server is in the bad state. Add a one-time repair so they don't have to wipe again:
- New `deploy/repair-pg-perms.sh`:
  ```bash
  docker exec -u 0 supabase-db chown -R postgres:postgres /var/lib/postgresql/data
  docker restart supabase-db
  ```
- `install.sh` runs this automatically right before `apply-migrations.sh` whenever a `psql_exec` smoke test fails with `Permission denied`.

### 3. Detect this earlier so it's never silent again
- In `deploy/lib/common.sh`, after `wait_for_pg`, add a `psql_exec -c 'SELECT 1'` smoke test. If it returns `Permission denied`, print a clear error pointing at `repair-pg-perms.sh`, instead of letting apply-migrations.sh fall over with a cryptic line.

### 4. Update troubleshooting doc
- Add section `0c.` to `deploy/README-troubleshooting.md` covering this exact symptom, the cause (recursive chown over the PG bind mount), and the one-line recovery:
  ```bash
  sudo bash deploy/repair-pg-perms.sh && sudo bash deploy/apply-migrations.sh
  ```

## Recovery commands the user runs right now (after the patch lands)

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/repair-pg-perms.sh
sudo bash deploy/apply-migrations.sh
sudo bash deploy/import-seed.sh
sudo bash deploy/health-check.sh
```

No more wiping, no more reinstalling — the data dir ownership gets restored inside the container and migrations resume cleanly.

## Why previous attempts didn't catch this
- `pg_isready` (used by `wait_for_pg`) talks to the already-running postmaster, which has its file handles open from before the chown. It returns OK even though new backends can't start.
- The `chown` at line 559 runs **after** "DEPLOYMENT COMPLETE" banner is printed but **before** install.sh's step 2 (apply-migrations). That timing is why the failure looks like "migrations broke" instead of "deploy broke".
