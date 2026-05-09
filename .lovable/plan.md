## What is happening

`PGRST002` on every `/rest/v1/*` API means the self-hosted REST container cannot build its database schema cache. In your case the likely causes are:

1. The seed import aborted at `16_profiles.sql` because `auth.users` was not imported first.
2. The partial import/restart left REST with missing or insufficient schema grants.
3. Your current `deploy.sh`/repair script assumes DB port `5432` in some places, but Supabase Docker normally exposes Postgres on host port `54322`; your pasted script already shows you manually changed part of this.
4. `import-seed.sh` grants only `public`, but REST also needs access to inspect/use `auth` and `storage` schemas in self-hosted Supabase.

## Immediate server recovery steps

Run these on the server from the project repo root.

### 1. Confirm the stack and DB are reachable

```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker
sudo docker compose ps
sudo docker compose exec db psql -U postgres -d postgres -c "select now();"
```

If this fails, inspect DB logs first:

```bash
sudo docker compose logs --tail=120 db
```

### 2. Re-apply the REST/schema grants manually

This avoids depending on any Lovable tool and works even if the repair script has the wrong DB port.

```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker
sudo docker compose exec db psql -U postgres -d postgres <<'SQL'
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'anon','authenticated','service_role','authenticator',
    'supabase_admin','supabase_auth_admin','supabase_storage_admin'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE format('GRANT USAGE ON SCHEMA auth TO %I', r);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        EXECUTE format('GRANT USAGE ON SCHEMA storage TO %I', r);
      END IF;
    END IF;
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')
     AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin')
     AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO supabase_storage_admin;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='auth' AND table_name='users'
  ) THEN
    GRANT SELECT ON auth.users TO anon, authenticated, service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SQL
```

### 3. Restart API services

```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker
sudo docker compose restart rest auth storage realtime meta functions
```

### 4. Test REST directly from the server

Get the anon key:

```bash
ANON_KEY=$(grep '^ANON_KEY=' /home/vmsadm/resl/vvms/backend/supabase/docker/.env | cut -d= -f2-)
```

Then test:

```bash
curl -i "http://127.0.0.1:8000/rest/v1/locations?select=id,name&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

Expected result: HTTP `200` with JSON data, or HTTP `200` with `[]`. If you still get `503`, capture logs:

```bash
sudo docker compose logs --tail=120 rest
sudo docker compose logs --tail=120 db
```

## Fix the data import issue next

Your import failed here:

```text
profiles_user_id_fkey: Key (user_id)=... is not present in auth.users
```

That means `00_auth_users.sql` was empty or missing. Before importing `16_profiles.sql` and `17_user_location_roles.sql`, you must either:

### Option A: Import original auth users

Generate/copy `deploy/seed/00_auth_users.sql` from the source database using a connection that can read `auth.users` and `auth.identities`, then re-run:

```bash
sudo bash deploy/import-seed.sh
```

### Option B: Only recover the primary admin now

If you only need the system back online quickly, create/login with the admin user via the Auth admin API and keep only the matching profile/role rows for that admin. Other imported profiles/roles whose `user_id` is missing from `auth.users` will continue to fail until the auth dump is restored.

## Code changes I recommend after server is stable

If you approve implementation, I will update the deployment files so this does not recur:

1. Make all scripts use `docker compose exec db psql` instead of hardcoded `127.0.0.1:5432`/`54322` host ports.
2. Strengthen `import-seed.sh` to:
   - stop REST/functions during import,
   - check that `00_auth_users.sql` exists and is non-empty before profile/role imports,
   - re-apply full `public/auth/storage` grants,
   - restart REST/Auth/Storage/Realtime/Meta/Functions,
   - fail clearly if `/rest/v1/locations` is not healthy.
3. Update `repair-postgrest.sh` to avoid host-port assumptions and include guarded grants for `auth` and `storage`.
4. Update `deploy.sh` to use the same reliable DB access pattern and run the repair/reload step after schema/seed/admin creation.
5. Add a short troubleshooting section with the exact commands above.