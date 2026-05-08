#!/usr/bin/env bash
# Export DB + storage from Lovable Cloud (or any Supabase project) into
# two artifacts that import-to-onprem.sh can consume:
#   ./cloud-export.dump      (pg_dump custom format, public+auth+storage)
#   ./storage-export.tgz     (tarball of bucket files)
#
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres' \
#   SUPABASE_URL='https://<ref>.supabase.co' \
#   SUPABASE_SERVICE_ROLE_KEY='eyJ...' \
#   bash deploy/export-from-cloud.sh
#
# Requirements on the machine running this: pg_dump (>=15), curl, jq, tar.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Postgres connection string for the source project)}"
: "${SUPABASE_URL:?Set SUPABASE_URL (https://<ref>.supabase.co)}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

OUT_DIR="${OUT_DIR:-$(pwd)}"
DUMP_FILE="$OUT_DIR/cloud-export.dump"
STORAGE_DIR="$OUT_DIR/storage-export"
STORAGE_TGZ="$OUT_DIR/storage-export.tgz"
BUCKETS=(${BUCKETS:-visitor-photos branding})

echo "==> Dumping database to $DUMP_FILE"
pg_dump --no-owner --no-privileges --format=custom --compress=9 \
        --schema=public --schema=auth --schema=storage \
        --file "$DUMP_FILE" "$SUPABASE_DB_URL"
echo "    Dump size: $(du -h "$DUMP_FILE" | cut -f1)"

echo "==> Mirroring storage buckets: ${BUCKETS[*]}"
rm -rf "$STORAGE_DIR"
mkdir -p "$STORAGE_DIR"

download_bucket() {
  local bucket="$1" prefix="${2:-}"
  local body offset=0 limit=1000 page name is_dir
  while :; do
    body=$(curl -fsS -X POST \
      "$SUPABASE_URL/storage/v1/object/list/$bucket" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"prefix\":\"$prefix\",\"limit\":$limit,\"offset\":$offset,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}")
    page=$(echo "$body" | jq -r '. | length')
    [[ "$page" == "0" || -z "$page" ]] && break
    while IFS=$'\t' read -r name is_dir; do
      local full="${prefix:+$prefix/}$name"
      if [[ "$is_dir" == "true" ]]; then
        download_bucket "$bucket" "$full"
      else
        local target="$STORAGE_DIR/$bucket/$full"
        mkdir -p "$(dirname "$target")"
        curl -fsS -o "$target" \
          -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
          "$SUPABASE_URL/storage/v1/object/$bucket/$full" \
          || echo "    WARN: failed $bucket/$full"
      fi
    done < <(echo "$body" | jq -r '.[] | [.name, (if .id == null then "true" else "false" end)] | @tsv')
    [[ "$page" -lt "$limit" ]] && break
    offset=$((offset + limit))
  done
}

for b in "${BUCKETS[@]}"; do
  echo "    bucket: $b"
  mkdir -p "$STORAGE_DIR/$b"
  download_bucket "$b" "" || true
done

echo "==> Packing storage tarball"
tar -czf "$STORAGE_TGZ" -C "$STORAGE_DIR" .
echo "    $(du -h "$STORAGE_TGZ" | cut -f1)  $STORAGE_TGZ"

cat <<EOF

Export complete.
  DB dump : $DUMP_FILE
  Storage : $STORAGE_TGZ

Copy both files to the on-prem server and run:
  sudo bash deploy/import-to-onprem.sh /path/to/cloud-export.dump /path/to/storage-export.tgz
EOF