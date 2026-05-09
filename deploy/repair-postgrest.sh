#!/usr/bin/env bash
# Repair PostgREST schema cache after a Lovable Cloud -> on-prem import.
#
# Symptoms this fixes:
#   * REST calls return HTTP 503 with {"code":"PGRST002", ...}
#   * Blank page after login; browser console shows 503 on /rest/v1/*
#
# Root cause: pg_restore --clean dropped the public/auth/storage schemas and
# re-created them with no grants. PostgREST connects as `authenticator` and
# switches to `anon` / `authenticated`, which lost USAGE/SELECT and can no
# longer build the schema cache.
#
# Safe to run multiple times.
#
# Usage (run as root on the on-prem server):
#   sudo bash deploy/repair-postgrest.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"; exit 1
fi

SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
# shellcheck disable=SC1090
source "$BASE_DIR/config.env"

SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PSQL="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=0"

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "ERROR: Postgres container '$PG_CONTAINER' is not running. Start the stack first:"
  echo "  cd $SUPA_DOCKER && docker compose up -d"
  exit 1
fi

echo "==> Re-applying Supabase role grants on public/auth/storage..."
$PSQL <<'SQL'
-- Schema USAGE
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator',
                           'supabase_admin','supabase_auth_admin','supabase_storage_admin']
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
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
  END IF;
END $$;

-- Public schema: tables, sequences, functions
GRANT ALL    ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
              ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL                            ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE                        ON FUNCTIONS TO anon, authenticated, service_role;

-- Auth + storage internals: GoTrue / storage-api own them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT ALL ON ALL TABLES    IN SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE 'GRANT ALL ON ALL TABLES    IN SCHEMA storage TO supabase_storage_admin';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO supabase_storage_admin';
  END IF;
END $$;

-- PostgREST exposed roles need to read auth.users for RLS via auth.uid()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    GRANT SELECT ON auth.users TO anon, authenticated, service_role;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SQL

echo "==> Restarting REST / Auth / Storage / Realtime / Meta containers..."
cd "$SUPA_DOCKER"
docker compose restart rest auth storage realtime meta || true

echo "==> Waiting for PostgREST to come back..."
ANON_KEY=$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" | cut -d= -f2-)
OK=0
for i in $(seq 1 30); do
  CODE=$(curl -s -o /tmp/pgrst.out -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    "http://127.0.0.1:8000/rest/v1/locations?select=id&limit=1" || true)
  if [[ "$CODE" == "200" ]]; then OK=1; break; fi
  sleep 2
done

if [[ "$OK" == "1" ]]; then
  echo
  echo "SUCCESS — PostgREST is healthy. /rest/v1/locations returned 200."
  echo "Reload the browser tab; the blank page should now render data."
else
  echo
  echo "STILL FAILING — last response (HTTP $CODE):"
  cat /tmp/pgrst.out; echo
  echo "Check container logs:"
  echo "  docker compose -f $SUPA_DOCKER/docker-compose.yml logs --tail=80 rest"
  echo "  docker compose -f $SUPA_DOCKER/docker-compose.yml logs --tail=80 auth"
  exit 1
fi

# Surface common GoTrue permission failures
if docker compose -f "$SUPA_DOCKER/docker-compose.yml" logs --tail=200 auth 2>/dev/null \
     | grep -qi 'permission denied for table users'; then
  echo
  echo "WARNING: GoTrue logs show 'permission denied for table users'."
  echo "Run this script once more, then restart the auth container manually if needed."
fi