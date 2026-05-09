#!/usr/bin/env bash
# Import deploy/seed/*.sql into the on-prem self-hosted Supabase Postgres.
#
# Usage:
#   sudo bash deploy/import-seed.sh [optional storage-export.tgz]
#
# Reads POSTGRES_PASSWORD + STORAGE_VOL from deploy/config.env (created by deploy.sh).
# Files run in lexical order: 00_auth_users -> 10_* reference -> 40_* transactional.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SEED_DIR="$HERE/seed"
STORAGE_TGZ="${1:-}"

if [ ! -d "$SEED_DIR" ]; then
  echo "ERROR: $SEED_DIR not found. Run deploy/generate-seed-files.sh first." >&2
  exit 1
fi

SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
for CFG in "$BASE_DIR/config.env" "$HERE/config.env"; do
  if [ -f "$CFG" ]; then
    # shellcheck disable=SC1090
    . "$CFG"
    break
  fi
done
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set (run deploy.sh first or source $BASE_DIR/config.env)}"
: "${STORAGE_VOL:=/var/lib/supabase-storage}"

PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PSQL="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1"
PSQL_SOFT="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=0"

echo "==> Stopping functions container (avoid mid-import calls)"
docker stop supabase-functions 2>/dev/null || true

shopt -s nullglob
FILES=( "$SEED_DIR"/*.sql )
IFS=$'\n' FILES=( $(printf '%s\n' "${FILES[@]}" | sort) )

# Guard: profile/role seeds depend on auth.users. If 00_auth_users.sql is
# missing or empty, the FK insert will hard-fail and abort the whole import.
AUTH_FILE="$SEED_DIR/00_auth_users.sql"
BOOTSTRAP_FILE="$SEED_DIR/00_auth_users_bootstrap.sql"
SKIP_USER_DEPENDENT=0
if [ ! -s "$AUTH_FILE" ] || ! grep -q -i 'INSERT INTO' "$AUTH_FILE"; then
  if [ -s "$BOOTSTRAP_FILE" ]; then
    echo "==> 00_auth_users.sql missing — applying $BOOTSTRAP_FILE (default password Sharvi@123)"
    $PSQL < "$BOOTSTRAP_FILE"
  else
    echo "WARNING: neither $AUTH_FILE nor $BOOTSTRAP_FILE present."
    echo "         profiles / user_location_roles inserts will fail. Skipping those files."
    SKIP_USER_DEPENDENT=1
  fi
fi

echo "==> Importing ${#FILES[@]} seed files"
for f in "${FILES[@]}"; do
  base=$(basename "$f")
  if [ "$SKIP_USER_DEPENDENT" = "1" ] && [[ "$base" =~ ^(16_profiles|17_user_location_roles)\.sql$ ]]; then
    echo "  -- skipped $base (no auth users seeded)"
    continue
  fi
  # Bootstrap already applied above; don't re-apply as a regular seed file.
  if [ "$base" = "00_auth_users_bootstrap.sql" ]; then
    continue
  fi
  echo "  -> $base"
  $PSQL < "$f"
done

echo "==> Re-applying Supabase role grants"
$PSQL_SOFT <<'SQL'
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
END $$;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
              ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL                            ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE                        ON FUNCTIONS TO anon, authenticated, service_role;

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

if [ -n "$STORAGE_TGZ" ] && [ -f "$STORAGE_TGZ" ]; then
  echo "==> Restoring storage objects from $STORAGE_TGZ"
  mkdir -p "$STORAGE_VOL"
  tar -xzf "$STORAGE_TGZ" -C "$STORAGE_VOL"
  chown -R 1000:1000 "$STORAGE_VOL" 2>/dev/null || true
fi

echo "==> Restarting Supabase services"
docker restart supabase-rest supabase-auth supabase-storage supabase-realtime supabase-meta supabase-functions 2>/dev/null || true

echo "==> Verifying REST API"
ANON_KEY="${ANON_KEY:-$(grep -E '^ANON_KEY=' /home/${SERVICE_USER:-vmsadm}/resl/vvms/backend/supabase/docker/.env 2>/dev/null | cut -d= -f2-)}"
OK=0
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: ${ANON_KEY:-anon}" \
    "http://127.0.0.1:8000/rest/v1/locations?select=id&limit=1" || true)
  if [ "$CODE" = "200" ]; then OK=1; break; fi
  sleep 2
done
if [ "$OK" = "1" ]; then
  echo "  /rest/v1/locations -> HTTP 200 (OK)"
else
  echo "  /rest/v1/locations -> HTTP $CODE (NOT OK)"
  echo "  Run: sudo bash $(dirname "$0")/repair-postgrest.sh"
fi

echo
if [ "$SKIP_USER_DEPENDENT" = "1" ]; then
  echo "Done — but profiles/roles were skipped because 00_auth_users.sql was empty."
  echo "Generate it with:  bash deploy/generate-seed-files.sh   (using a connection that can read auth.users)"
  echo "Then re-run:        sudo bash deploy/import-seed.sh"
else
  echo "Done. bala@sharviinfotech.com should now have HO-Admin role (verify in Settings > User Management)."
fi