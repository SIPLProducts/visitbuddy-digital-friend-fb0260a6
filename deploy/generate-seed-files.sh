#!/usr/bin/env bash
# Generate deploy/seed/*.sql from a Supabase / Postgres database.
#
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres' \
#     bash deploy/generate-seed-files.sh
#
# Or rely on standard PG* env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT).
#
# Reference tables (small, safe to commit) -> 10_*..21_*
# Transactional tables (large/sensitive)   -> 40_*..49_*
# Auth users (password hashes, requires superuser/service-role DB access) -> 00_auth_users.sql
set -euo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)/seed"
mkdir -p "$OUT"

PG=()
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  PG=( "$SUPABASE_DB_URL" )
fi

dump_table() {
  local schema="$1" table="$2" out="$3" header="$4"
  echo "-- Seed: $schema.$table  ($header)" > "$out"
  echo "BEGIN;" >> "$out"
  echo "TRUNCATE $schema.$table CASCADE;" >> "$out"
  if pg_dump "${PG[@]}" --data-only --inserts --column-inserts -t "$schema.$table" 2>/dev/null \
      | grep -E '^(INSERT|SELECT pg_catalog\.setval)' >> "$out"; then :; fi
  echo "COMMIT;" >> "$out"
  printf '  %-40s %s lines\n' "$(basename "$out")" "$(wc -l < "$out")"
}

echo "==> Reference tables (committed to git)"
REF=(locations screens tenant_settings email_templates email_config vehicle_types
     profiles user_location_roles role_screen_permissions
     departments employees gates)
i=10
for t in "${REF[@]}"; do
  dump_table public "$t" "$OUT/$(printf '%02d' $i)_$t.sql" "reference"
  i=$((i+1))
done

echo "==> Transactional tables (regenerate before import; consider .gitignore)"
TX=(visitors accompanying_visitors visitor_agreements visitor_watchlist
    vehicles vehicle_entries appointments
    audit_logs email_logs notifications)
i=40
for t in "${TX[@]}"; do
  dump_table public "$t" "$OUT/$(printf '%02d' $i)_$t.sql" "transactional"
  i=$((i+1))
done

echo "==> Auth users (requires superuser DB access; skipped if no permission)"
AUTH_OUT="$OUT/00_auth_users.sql"
{
  echo "-- Seed: auth.users + auth.identities (SENSITIVE - password hashes)"
  echo "BEGIN;"
  pg_dump "${PG[@]}" --data-only --inserts -t auth.users -t auth.identities 2>/dev/null \
    | grep -E '^INSERT' \
    | sed -E 's/;$/ ON CONFLICT (id) DO NOTHING;/' || true
  echo "COMMIT;"
} > "$AUTH_OUT"
lines=$(wc -l < "$AUTH_OUT")
if [ "$lines" -le 3 ]; then
  echo "  WARNING: 00_auth_users.sql is empty — current DB user lacks 'auth' schema access."
  echo "  Re-run with the service-role / postgres connection string to include auth users."
  rm "$AUTH_OUT"
else
  printf '  %-40s %s lines\n' "00_auth_users.sql" "$lines"
fi

echo
echo "Done. Output: $OUT"
echo "Next: commit reference files; ship 00_auth_users.sql out-of-band (contains hashes)."