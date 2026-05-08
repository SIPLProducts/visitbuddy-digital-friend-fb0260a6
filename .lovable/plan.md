## Problem

After importing the Lovable Cloud dump into the on-prem Supabase stack, every REST call returns:

```
503 Service Unavailable
{"code":"PGRST002","message":"Could not query the database for the schema cache. Retrying."}
```

`PGRST002` means PostgREST (the `rest` container behind Kong on `:8000`) can't read the `public`/`auth`/`storage` schemas. After login the page is blank because every data fetch (`profiles`, `user_location_roles`, `gates`, `appointments`, `vehicles` …) fails with 503.

### Root cause

`pg_dump` from Lovable Cloud was restored with `--no-owner --no-privileges`, so:

1. The Supabase-managed roles on the local box (`anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`) **lost their GRANTs** on `public`, `auth`, and `storage` after `pg_restore --clean` dropped & re-created the schemas.
2. PostgREST connects as `authenticator` and switches to `anon`/`authenticated`. Without USAGE on the schemas it can't even build the schema cache → `PGRST002`.
3. The `rest` container caches the failure and keeps returning 503 until you `NOTIFY pgrst, 'reload schema'` AND restart it.
4. The `auth` and `storage` schemas may also have lost ownership of their internal tables, breaking GoTrue and Storage.

## Fix

### Part A — Patch `deploy/import-to-onprem.sh`

After `pg_restore`, before restarting containers, run a repair SQL block that:

- Re-grants USAGE on `public`, `auth`, `storage`, `extensions` to `anon`, `authenticated`, `service_role`.
- Re-grants `SELECT, INSERT, UPDATE, DELETE` on all tables in `public` to `anon, authenticated, service_role` (RLS still enforces row visibility).
- Re-grants `EXECUTE` on all functions in `public` to those roles.
- Re-applies `ALTER DEFAULT PRIVILEGES` so future tables inherit the same grants.
- Re-assigns ownership of `auth.*` to `supabase_auth_admin` and `storage.*` to `supabase_storage_admin`.
- Sends `NOTIFY pgrst, 'reload schema'` and `NOTIFY pgrst, 'reload config'`.

Then explicitly `docker compose restart rest auth storage realtime meta` (not just `up -d`) so PostgREST rebuilds its cache from a clean DB.

Add a verification step that curls `http://127.0.0.1:8000/rest/v1/locations?select=id&limit=1` with the anon key and aborts with a clear message if it still returns 503.

### Part B — One-shot `deploy/repair-postgrest.sh` (new)

For users who already imported and are stuck (your situation right now), ship a standalone script they can run without re-importing:

```
sudo bash deploy/repair-postgrest.sh
```

It loads `/home/vmsadm/resl/vvms/config.env`, runs the same repair SQL, reloads the schema cache, restarts `rest auth storage realtime`, and prints the verification curl result. This is what you'll run on `10.100.4.36` to recover immediately.

### Part C — Tighten `export-from-cloud.sh`

Add `--schema=extensions` to the `pg_dump` call and add a comment noting that grants are intentionally stripped and rebuilt by the import script (so the export stays portable across Supabase versions).

### Part D — Update docs

- `deploy/README.md`: add a "Troubleshooting → 503 / PGRST002 after import" section pointing at `repair-postgrest.sh`.
- `VisiGuard-Deployment-Guide-v6.docx`: new §6.4 "Post-restore repair" describing the symptom, root cause, and the one command to fix it. (Versioned `_v6` so you can compare against v5.)

## Out of scope

- No application code changes (`src/`, edge functions, RLS policies untouched).
- No schema changes — RLS, tables, and policies from the cloud dump are preserved as-is.
- No auth flow changes — existing passwords keep working.

## Technical notes

- The repair SQL is idempotent and safe to run repeatedly.
- It uses `DO $$ ... $$` blocks with `pg_roles` existence checks so it works even on Supabase Docker versions that haven't created every role yet.
- `NOTIFY pgrst` is the official PostgREST cache reload channel; combined with `docker compose restart rest` it guarantees a cold cache rebuild.
- If `auth.users` ownership is wrong, GoTrue logs `permission denied for table users` — the repair script greps `docker logs supabase-auth` for that string and reports it.

After you approve, I'll implement Parts A–D and you can run `sudo bash /home/vmsadm/resl/vvms/frontend/deploy/repair-postgrest.sh` on the on-prem box to unblock the blank-page issue immediately.
