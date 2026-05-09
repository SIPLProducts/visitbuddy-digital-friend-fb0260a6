#!/usr/bin/env bash
# Apply every supabase/migrations/*.sql file (chronological) to the on-prem
# Postgres running in the supabase-db container.
#
# Idempotent: tracked in public._lovable_migrations(name PK). Already-applied
# files are skipped on re-runs.
#
# Usage:
#   sudo bash deploy/apply-migrations.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
MIG_DIR="$REPO_ROOT/supabase/migrations"

if [ ! -d "$MIG_DIR" ]; then
  echo "ERROR: migrations dir not found: $MIG_DIR" >&2
  exit 1
fi

if [ -f "$HERE/config.env" ]; then
  # shellcheck disable=SC1091
  . "$HERE/config.env"
fi
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set (run deploy.sh first or source config.env)}"

PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PSQL="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1"
PSQL_TA="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres -tAq"

echo "==> Waiting for Postgres to accept queries..."
for i in $(seq 1 30); do
  if echo "SELECT 1" | $PSQL_TA >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "==> Ensuring tracking table public._lovable_migrations"
$PSQL <<'SQL'
CREATE TABLE IF NOT EXISTS public._lovable_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
FILES=( "$MIG_DIR"/*.sql )
IFS=$'\n' FILES=( $(printf '%s\n' "${FILES[@]}" | sort) )

APPLIED=0
SKIPPED=0
FAILED=0

for f in "${FILES[@]}"; do
  base=$(basename "$f")
  exists=$(echo "SELECT 1 FROM public._lovable_migrations WHERE name='$base'" | $PSQL_TA 2>/dev/null || true)
  if [ "$exists" = "1" ]; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  echo "  -> $base"
  # Each migration is wrapped in its own transaction so a failure rolls back
  # cleanly. ON_ERROR_STOP=1 makes psql return non-zero on the first error.
  if (echo "BEGIN;"; cat "$f"; echo; echo "COMMIT;") | $PSQL >/dev/null 2>/tmp/mig_err.$$; then
    echo "INSERT INTO public._lovable_migrations(name) VALUES ('$base') ON CONFLICT DO NOTHING;" \
      | $PSQL >/dev/null
    APPLIED=$((APPLIED+1))
  else
    FAILED=$((FAILED+1))
    echo "     FAILED: $base"
    sed 's/^/        /' /tmp/mig_err.$$ | head -20
    rm -f /tmp/mig_err.$$
    # Don't abort — keep trying so we know the full damage. The caller
    # (redeploy.sh) decides whether to continue based on exit code.
  fi
  rm -f /tmp/mig_err.$$
done

echo
echo "==> Migrations summary: applied=$APPLIED  skipped=$SKIPPED  failed=$FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo "ERROR: $FAILED migration(s) failed. Inspect output above."
  exit 2
fi

echo "==> Refreshing PostgREST schema cache"
$PSQL <<'SQL' || true
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SQL

echo "Done."