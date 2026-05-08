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
PGCONN="postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres"
export PGPASSWORD="$POSTGRES_PASSWORD"

echo "==> Pausing edge functions during restore..."
docker compose -f "$SUPA_DOCKER/docker-compose.yml" stop functions || true

echo "==> Restoring database from $DUMP"
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$PGCONN" --jobs=2 --verbose "$DUMP" 2>&1 | tail -n 40 || true

echo "==> Re-creating storage buckets locally (idempotent)..."
psql "$PGCONN" <<'SQL'
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

echo "==> Restarting all containers..."
docker compose -f "$SUPA_DOCKER/docker-compose.yml" up -d

echo "==> Verification"
psql "$PGCONN" -c "ANALYZE;" >/dev/null
psql "$PGCONN" <<'SQL'
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
EOF