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

if [ -f "$HERE/config.env" ]; then
  # shellcheck disable=SC1091
  . "$HERE/config.env"
fi
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set (run deploy.sh first or source config.env)}"
: "${STORAGE_VOL:=/var/lib/supabase-storage}"

PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PSQL="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1"

echo "==> Stopping functions container (avoid mid-import calls)"
docker stop supabase-functions 2>/dev/null || true

shopt -s nullglob
FILES=( "$SEED_DIR"/*.sql )
IFS=$'\n' FILES=( $(printf '%s\n' "${FILES[@]}" | sort) )

echo "==> Importing ${#FILES[@]} seed files"
for f in "${FILES[@]}"; do
  echo "  -> $(basename "$f")"
  $PSQL < "$f"
done

echo "==> Re-applying Supabase role grants"
$PSQL <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
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
sleep 3
curl -sf -o /dev/null -w "  /rest/v1/locations -> HTTP %{http_code}\n" \
  http://localhost:8000/rest/v1/locations \
  -H "apikey: ${ANON_KEY:-anon}" || true

echo
echo "Done. bala@sharviinfotech.com should now have HO-Admin role (verify in Settings > User Management)."