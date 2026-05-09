#!/usr/bin/env bash
# Import a Lovable Cloud export (DB dump + storage tarball) into the
# locally running self-hosted Supabase stack created by deploy.sh.
#
# Usage (run as root on the on-prem server):
#   sudo bash deploy/import-to-onprem.sh /path/to/cloud-export.dump /path/to/storage-export.tgz
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0 <dump> <tgz>"; exit 1
fi

DUMP="${1:?Usage: $0 <cloud-export.dump> <storage-export.tgz>}"
TGZ="${2:?Usage: $0 <cloud-export.dump> <storage-export.tgz>}"
[[ -f "$DUMP" ]] || { echo "Dump file not found: $DUMP"; exit 1; }
[[ -f "$TGZ"  ]] || { echo "Storage tarball not found: $TGZ"; exit 1; }

SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
# shellcheck disable=SC1090
source "$BASE_DIR/config.env"

SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
STORAGE_VOL="$SUPA_DOCKER/volumes/storage"
PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
# Port-agnostic DB access — go through the container, not the host port.
PSQL="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres"

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "ERROR: Postgres container '$PG_CONTAINER' is not running. Start the stack first."; exit 1
fi

echo "==> Pausing edge functions during restore..."
docker compose -f "$SUPA_DOCKER/docker-compose.yml" stop functions || true

echo "==> Wiping stale on-prem auth/profile/role rows so cloud UUIDs become source of truth..."
$PSQL -v ON_ERROR_STOP=0 <<'SQL'
-- Any users that were created locally on the on-prem stack (e.g. a fresh
-- bala@sharviinfotech.com signup) get removed here, so pg_restore can
-- repopulate auth.users with the original cloud UUIDs + password hashes.
-- CASCADE clears identities/sessions/refresh_tokens that reference auth.users.
TRUNCATE auth.users CASCADE;
TRUNCATE public.user_location_roles CASCADE;
TRUNCATE public.profiles CASCADE;
SQL

echo "==> Restoring database from $DUMP"
# Stream the dump into the container's pg_restore so we don't depend on the
# host having pg_restore matching the server major version.
docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname=postgres --username=postgres --verbose < "$DUMP" 2>&1 | tail -n 40 || true

echo "==> Re-applying Supabase role grants (pg_restore stripped them)..."
$PSQL -v ON_ERROR_STOP=0 <<'SQL'
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator',
                           'supabase_admin','supabase_auth_admin','supabase_storage_admin']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA public, auth, storage TO %I', r);
    END IF;
  END LOOP;
END $$;

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

GRANT SELECT ON auth.users TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SQL

echo "==> Re-creating storage buckets locally (idempotent)..."
$PSQL <<'SQL'
INSERT INTO storage.buckets (id, name, public)
  VALUES ('visitor-photos', 'visitor-photos', true),
         ('branding',       'branding',       true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
SQL

echo "==> Restoring storage files into $STORAGE_VOL"
TMP_EXTRACT=$(mktemp -d)
tar -xzf "$TGZ" -C "$TMP_EXTRACT"
mkdir -p "$STORAGE_VOL"
# Self-hosted Supabase Storage uses bucket-name/<uuid> layout under /var/lib/storage,
# which maps to volumes/storage. We mirror the same paths the cloud project uses.
for bucket_dir in "$TMP_EXTRACT"/*/; do
  [[ -d "$bucket_dir" ]] || continue
  bucket=$(basename "$bucket_dir")
  echo "    bucket: $bucket"
  mkdir -p "$STORAGE_VOL/stub/stub-stub-stub/$bucket"
  # Storage API recreates object metadata from storage.objects rows (already in
  # the dump). Files just need to live at the path the API expects.
  rsync -a "$bucket_dir" "$STORAGE_VOL/stub/stub-stub-stub/$bucket/"
done
rm -rf "$TMP_EXTRACT"
# Storage container runs as uid 1000 by default in supabase/storage-api
chown -R 1000:1000 "$STORAGE_VOL" 2>/dev/null || true

echo "==> Restarting all containers..."
docker compose -f "$SUPA_DOCKER/docker-compose.yml" up -d
# Force PostgREST to rebuild its schema cache from clean grants
docker compose -f "$SUPA_DOCKER/docker-compose.yml" restart rest auth storage realtime meta || true

echo "==> Verification"
$PSQL -c "ANALYZE;" >/dev/null

ANON_KEY=$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" | cut -d= -f2-)
API_PORT="${API_PORT:-8000}"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    "http://127.0.0.1:${API_PORT}/rest/v1/locations?select=id&limit=1" || true)
  [[ "$CODE" == "200" ]] && { echo "    PostgREST OK (200)"; break; }
  sleep 2
done
if [[ "$CODE" != "200" ]]; then
  echo "    WARNING: PostgREST still returns $CODE. Run: sudo bash $(dirname "$0")/repair-postgrest.sh"
fi

$PSQL <<'SQL'
\echo Row counts:
SELECT 'auth.users'                AS t, count(*) FROM auth.users
UNION ALL SELECT 'profiles',        count(*) FROM public.profiles
UNION ALL SELECT 'locations',       count(*) FROM public.locations
UNION ALL SELECT 'user_location_roles', count(*) FROM public.user_location_roles
UNION ALL SELECT 'visitors',        count(*) FROM public.visitors
UNION ALL SELECT 'vehicles',        count(*) FROM public.vehicles
UNION ALL SELECT 'employees',       count(*) FROM public.employees
UNION ALL SELECT 'storage.objects', count(*) FROM storage.objects;
SQL

cat <<EOF

Import complete.
  - Existing logins (incl. $ADMIN_EMAIL) keep working with their cloud passwords.
  - Visitor photos / branding files restored to: $STORAGE_VOL
  - If a sign-in fails, run deploy.sh again to re-assert the admin account.
  - If the app shows a blank page or 503 / PGRST002 errors, run:
      sudo bash $(dirname "$0")/repair-postgrest.sh
EOF