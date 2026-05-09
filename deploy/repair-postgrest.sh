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

# CRLF self-heal
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"; exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/lib/common.sh"
load_config "$HERE" || die "config.env not found in $BASE_DIR or $HERE"
require_var POSTGRES_PASSWORD

SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  die "Postgres container '$PG_CONTAINER' not running. Start: cd $SUPA_DOCKER && docker compose up -d"
fi

log "Re-applying Supabase role grants on public/auth/storage..."
psql_soft <<'SQL'
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

log "Restarting REST / Auth / Storage / Realtime / Meta containers..."
cd "$SUPA_DOCKER"
docker compose restart rest auth storage realtime meta || true

log "Waiting for PostgREST to come back..."
ANON_KEY=$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" | cut -d= -f2-)
API_PORT="${API_PORT:-8000}"
if wait_for_http "http://127.0.0.1:${API_PORT}/rest/v1/locations?select=id&limit=1" 200 60 "apikey: $ANON_KEY"; then
  echo
  ok "PostgREST is healthy. /rest/v1/locations returned 200."
else
  echo
  warn "STILL FAILING. Check container logs:"
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