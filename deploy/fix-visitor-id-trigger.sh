#!/usr/bin/env bash
# Patch the on-prem public.generate_visitor_id() function so that when a
# location's plant_code is NULL/empty the visitor-id prefix is derived from
# the location name (prefer leading plant token like 3802 from "3802- BMW",
# otherwise first 6 alphanumeric chars) instead of the hard-coded 'HO' fallback.
#
# Idempotent — safe to re-run. Pair with ./backfill-plant-codes.sh to also
# clean up any NULL plant_code rows already in the table.
#
# Usage (from the deploy/ directory on the on-prem server):
#   ./fix-visitor-id-trigger.sh
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

echo "==> Patching public.generate_visitor_id() ..."
"${PSQL[@]}" <<'SQL'
CREATE OR REPLACE FUNCTION public.generate_visitor_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plant text;
  v_name  text;
  v_name_token text;
  v_seq   int;
BEGIN
  IF NEW.visitor_id IS NOT NULL AND length(NEW.visitor_id) > 0 THEN
    RETURN NEW;
  END IF;

  SELECT UPPER(REGEXP_REPLACE(COALESCE(l.plant_code, ''), '[^A-Za-z0-9]', '', 'g')),
         COALESCE(l.name, '')
    INTO v_plant, v_name
  FROM public.gates g
  LEFT JOIN public.locations l ON l.id = g.location_id
  WHERE g.id = NEW.gate_id;

  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_name_token := UPPER(SUBSTRING(COALESCE(v_name, '') FROM '^[[:space:]]*([A-Za-z0-9]+)'));
    v_plant := COALESCE(
      NULLIF(v_name_token, ''),
      NULLIF(UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(v_name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6)), '')
    );
  END IF;

  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_plant := 'HO';
  END IF;

  INSERT INTO public.visitor_id_counters (location_key, last_seq, updated_at)
  VALUES (v_plant, 1, now())
  ON CONFLICT (location_key) DO UPDATE
    SET last_seq = public.visitor_id_counters.last_seq + 1,
        updated_at = now()
  RETURNING last_seq INTO v_seq;

  NEW.visitor_id := v_plant || '-' || to_char(now(), 'DDMMYY') || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$function$;
SQL

echo
echo "==> Gate/location plant-code diagnostics:"
"${PSQL[@]}" -c "
SELECT
  g.id AS gate_id,
  g.name AS gate_name,
  g.building,
  l.id AS location_id,
  l.name AS location_name,
  l.plant_code,
  COALESCE(NULLIF(UPPER(REGEXP_REPLACE(COALESCE(l.plant_code, ''), '[^A-Za-z0-9]', '', 'g')), ''), NULLIF(UPPER(SUBSTRING(COALESCE(l.name, '') FROM '^[[:space:]]*([A-Za-z0-9]+)')), ''), NULLIF(UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(l.name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6)), ''), 'HO') AS resolved_prefix
FROM public.gates g
LEFT JOIN public.locations l ON l.id = g.location_id
ORDER BY l.name, g.name, g.building;
"

echo
echo "==> Gates that would still fall back to HO because location data is missing:"
"${PSQL[@]}" -c "
SELECT g.id AS gate_id, g.name AS gate_name, g.location_id
FROM public.gates g
LEFT JOIN public.locations l ON l.id = g.location_id
WHERE g.location_id IS NULL OR l.id IS NULL OR COALESCE(l.name, '') = '';
"

echo
echo "Done. New visitors will now use the location's plant_code (or leading"
echo "plant token / alphanumeric chars of the location name) as the visitor-id prefix."
echo "Run ./backfill-plant-codes.sh as well to fix locations whose plant_code"
echo "is still NULL/empty in the database."