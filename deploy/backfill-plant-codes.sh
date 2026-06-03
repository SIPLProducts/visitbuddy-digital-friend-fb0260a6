#!/usr/bin/env bash
# Backfill public.locations.plant_code for any rows where it is NULL/empty.
#
# The visitor-id trigger (generate_visitor_id) reads locations.plant_code and
# falls back to 'HO' when missing. On fresh on-prem imports the seed file did
# not include plant_code, so every new visitor at those locations gets an
# 'HO-…' id instead of the real plant prefix (e.g. '3604-…').
#
# This script:
#   1. Shows current plant_code values
#   2. Backfills missing values from the location name
#      (leading plant token like 3802 from "3802- BMW", otherwise
#       uppercase alphanumeric name fallback, max 6 chars)
#   3. De-duplicates collisions by appending 2, 3, …
#   4. Shows the resulting values
#
# Idempotent — re-running only touches still-missing rows.
#
# Usage (from the deploy/ directory on the on-prem server):
#   ./backfill-plant-codes.sh
#
# Requires deploy/.env with POSTGRES_PASSWORD (and optional POSTGRES_HOST /
# POSTGRES_PORT / POSTGRES_DB / POSTGRES_USER overrides).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$SCRIPT_DIR/.env"; set +a
fi

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in deploy/.env}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL=(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1)

echo "==> Current locations.plant_code values:"
"${PSQL[@]}" -c "SELECT id, name, plant_code FROM public.locations ORDER BY name;"

echo
echo "==> Backfilling missing plant_code values (and de-duplicating)..."
"${PSQL[@]}" <<'SQL'
BEGIN;

-- 1. Backfill NULL / empty plant_code from name.
-- Prefer a leading plant token such as 3802 from "3802- BMW -MADURANTHAGAM".
-- If the name does not start with a code, fall back to first 6 alphanumeric chars.
UPDATE public.locations
SET plant_code = COALESCE(
  NULLIF(UPPER(SUBSTRING(COALESCE(name, '') FROM '^[[:space:]]*([A-Za-z0-9]+)')), ''),
  NULLIF(UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 6)), ''),
  'HO'
)
WHERE plant_code IS NULL OR plant_code = '';

-- 2. De-duplicate any collisions by appending 2, 3, ...
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR r IN
    SELECT id, plant_code FROM public.locations
    WHERE plant_code IS NOT NULL AND plant_code <> ''
    ORDER BY created_at
  LOOP
    base := r.plant_code;
    candidate := base;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.locations
      WHERE UPPER(plant_code) = UPPER(candidate) AND id <> r.id
    ) LOOP
      candidate := SUBSTRING(base FROM 1 FOR GREATEST(1, 6 - length(suffix::text))) || suffix::text;
      suffix := suffix + 1;
      IF suffix > 99 THEN EXIT; END IF;
    END LOOP;
    IF candidate <> r.plant_code THEN
      UPDATE public.locations SET plant_code = candidate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

COMMIT;
SQL

echo
echo "==> Updated locations.plant_code values:"
"${PSQL[@]}" -c "SELECT id, name, plant_code FROM public.locations ORDER BY name;"

echo
echo "Done. Create a new visitor at each location to verify the visitor-id"
echo "prefix now matches the plant_code (e.g. '3604-030626-0001') instead of 'HO-…'."