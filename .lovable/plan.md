## Plan

The current repair script only fixes `/var/lib/postgresql/data` from inside the container, but the smoke test still fails. I will make the deployment repair path more robust and diagnostic so it can resolve both common causes: wrong host bind-mount ownership and wrong container Postgres UID.

## Changes to implement

1. **Harden `deploy/repair-pg-perms.sh`**
   - Load `config.env` before running the smoke test so `POSTGRES_PASSWORD` is always available.
   - Detect the actual Postgres UID/GID inside `supabase-db` instead of assuming `70:70`.
   - Fix ownership on both:
     - container path: `/var/lib/postgresql/data`
     - host bind mount: `backend/supabase/docker/volumes/db/data`
   - Apply safe directory/file permissions for the PG data directory.
   - If the smoke test still fails, print the real `psql` error and recent DB logs instead of only saying “Inspect docker logs”.

2. **Fix `deploy/lib/common.sh` smoke-test output**
   - Make `pg_smoke_test()` show the captured failure reliably.
   - Add a helper that runs the same fresh-backend test with useful output.
   - Keep all DB access through `docker exec`, not host socket/host TCP.

3. **Patch risky direct `docker exec ... PGPASSWORD=$POSTGRES_PASSWORD` usage**
   - Replace unquoted command-string usage in `deploy/deploy.sh` with the shared `psql_exec` helper or a safer inline invocation.
   - This avoids password/shell parsing issues that can masquerade as database failures.

4. **Update troubleshooting docs**
   - Add the exact next commands for this state:
     - run repair
     - if it still fails, capture ownership/log diagnostics
   - Clarify that a still-failing smoke test means either the host bind mount is still incorrectly owned, the DB container user differs from `70`, or the database volume is corrupted and must be recreated.

## Technical details

The likely reason your repair still fails is one of these:

- `repair-pg-perms.sh` does not load `config.env`, so `POSTGRES_PASSWORD` may be missing during `psql_exec`.
- The script assumes UID `70:70`, but the active Supabase Postgres image may use a different `postgres` UID/GID.
- The host bind mount directory may still have ownership/permission problems that need fixing from the host side as well as from inside the container.
- The current smoke-test helper hides the real error, so we need to print the exact failure before deciding whether a wipe is necessary.

After implementation, your recovery command should remain simple:

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
sudo bash deploy/repair-pg-perms.sh
sudo bash deploy/apply-migrations.sh
sudo bash deploy/import-seed.sh
sudo bash deploy/health-check.sh
```