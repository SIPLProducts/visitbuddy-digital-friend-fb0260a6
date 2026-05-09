#!/usr/bin/env bash
# Import deploy/seed/*.sql into the on-prem self-hosted Supabase Postgres
# via docker exec only. No host psql / no TCP.
#
# Usage:
#   sudo bash deploy/import-seed.sh [optional storage-export.tgz]
set -euo pipefail

# CRLF self-heal
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SEED_DIR="$HERE/seed"
STORAGE_TGZ="${1:-}"

# shellcheck disable=SC1091
source "$HERE/lib/common.sh"
load_config "$HERE" || die "config.env not found in $BASE_DIR or $HERE"
require_var POSTGRES_PASSWORD
: "${STORAGE_VOL:=/var/lib/supabase-storage}"

[ -d "$SEED_DIR" ] || die "$SEED_DIR not found. Run deploy/generate-seed-files.sh first."

wait_for_pg 60

# Self-heal: an older generate-seed-files.sh used `grep '^INSERT'` which
# truncates pg_dump rows whose text values contain newlines, leaving an
# unterminated string literal that aborts the whole import with
# "trailing junk after numeric literal". Comment those broken rows out.
if [ -x "$HERE/sanitize-seed.sh" ] || [ -f "$HERE/sanitize-seed.sh" ]; then
  log "Sanitizing seed files (drops malformed rows in-place)"
  bash "$HERE/sanitize-seed.sh" || warn "sanitize-seed.sh reported errors (continuing)"
fi

log "Stopping functions container (avoid mid-import calls)"
docker stop supabase-functions supabase-edge-functions 2>/dev/null || true

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
    log "00_auth_users.sql missing — applying $BOOTSTRAP_FILE (default password Sharvi@123)"
    psql_exec < "$BOOTSTRAP_FILE"
  else
    warn "Neither $AUTH_FILE nor $BOOTSTRAP_FILE present."
    warn "profiles / user_location_roles inserts will fail. Skipping those files."
    SKIP_USER_DEPENDENT=1
  fi
fi

# Always normalize auth.users token columns. Whether rows came from the
# bootstrap SQL or a pg_dump'd 00_auth_users.sql, missing token columns
# default to NULL which crashes GoTrue on login with:
#   sql: Scan error on column ... confirmation_token: converting NULL to string
log "Normalizing NULL token columns on auth.users (post-bootstrap safety)"
psql_soft <<'SQL'
UPDATE auth.users
SET confirmation_token         = COALESCE(confirmation_token, ''),
    recovery_token             = COALESCE(recovery_token, ''),
    email_change_token_new     = COALESCE(email_change_token_new, ''),
    email_change               = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token     = COALESCE(reauthentication_token, ''),
    phone_change               = COALESCE(phone_change, ''),
    phone_change_token         = COALESCE(phone_change_token, '');
SQL

log "Importing ${#FILES[@]} seed files"
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
  psql_exec < "$f"
done

log "Re-applying Supabase role grants"
psql_soft <<'SQL'
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
  log "Restoring storage objects from $STORAGE_TGZ"
  mkdir -p "$STORAGE_VOL"
  tar -xzf "$STORAGE_TGZ" -C "$STORAGE_VOL"
  chown -R 1000:1000 "$STORAGE_VOL" 2>/dev/null || true
fi

log "Restarting Supabase services"
docker restart supabase-rest supabase-auth supabase-storage supabase-realtime supabase-meta supabase-edge-functions 2>/dev/null || true

log "Verifying REST API"
API_PORT="${API_PORT:-8000}"
ANON_KEY="${ANON_KEY:-$(grep -E '^ANON_KEY=' "$BASE_DIR/backend/supabase/docker/.env" 2>/dev/null | cut -d= -f2-)}"
if wait_for_http "http://127.0.0.1:${API_PORT}/rest/v1/locations?select=id&limit=1" 200 60 "apikey: ${ANON_KEY:-anon}"; then
  ok "/rest/v1/locations -> HTTP 200"
else
  warn "REST not responding 200. Run: sudo bash $HERE/repair-postgrest.sh"
fi

echo
if [ "$SKIP_USER_DEPENDENT" = "1" ]; then
  echo "Done — but profiles/roles were skipped because 00_auth_users.sql was empty."
else
  ok "Seed import complete. Login: bala@sharviinfotech.com / Sharvi@123"
fi