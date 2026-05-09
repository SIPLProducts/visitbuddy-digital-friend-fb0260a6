#!/usr/bin/env bash
# repair-auth.sh — fix "Database error querying schema" on login.
#
# Root cause: bootstrapped auth.users rows have NULL in token columns
# (confirmation_token, recovery_token, email_change_token_new, email_change).
# GoTrue tries to scan these as Go strings and crashes:
#   sql: Scan error on column index 3, name "confirmation_token":
#        converting NULL to string is unsupported
#
# This script normalizes those NULLs to empty strings, re-asserts the auth
# schema grants supabase_auth_admin needs, and restarts supabase-auth.
# Safe to re-run. No data loss.
set -euo pipefail

if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/lib/common.sh"
load_config "$HERE" || die "config.env not found"
require_var POSTGRES_PASSWORD

wait_for_pg 60

log "Normalizing NULL token columns on auth.users"
psql_exec <<'SQL'
UPDATE auth.users
SET confirmation_token      = COALESCE(confirmation_token, ''),
    recovery_token          = COALESCE(recovery_token, ''),
    email_change_token_new  = COALESCE(email_change_token_new, ''),
    email_change            = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token  = COALESCE(reauthentication_token, ''),
    phone_change            = COALESCE(phone_change, ''),
    phone_change_token      = COALESCE(phone_change_token, ''),
    aud                     = COALESCE(NULLIF(aud, ''),  'authenticated'),
    role                    = COALESCE(NULLIF(role, ''), 'authenticated'),
    raw_app_meta_data       = COALESCE(raw_app_meta_data,  '{"provider":"email","providers":["email"]}'::jsonb),
    raw_user_meta_data      = COALESCE(raw_user_meta_data, '{}'::jsonb)
WHERE confirmation_token       IS NULL
   OR recovery_token           IS NULL
   OR email_change_token_new   IS NULL
   OR email_change             IS NULL
   OR email_change_token_current IS NULL
   OR reauthentication_token   IS NULL
   OR phone_change             IS NULL
   OR phone_change_token       IS NULL
   OR aud  IS NULL OR aud  = ''
   OR role IS NULL OR role = ''
   OR raw_app_meta_data  IS NULL
   OR raw_user_meta_data IS NULL;
SQL

log "Re-asserting auth schema privileges"
psql_soft <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL TABLES    IN SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES    TO supabase_auth_admin';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_auth_admin';
  END IF;
END $$;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
SQL

log "Restarting supabase-auth"
docker restart supabase-auth >/dev/null 2>&1 || warn "docker restart supabase-auth failed"

API_PORT="${API_PORT:-8000}"
ANON_KEY="${ANON_KEY:-$(grep -E '^ANON_KEY=' "$BASE_DIR/backend/supabase/docker/.env" 2>/dev/null | cut -d= -f2-)}"
if wait_for_http "http://127.0.0.1:${API_PORT}/auth/v1/health" 200 60 "apikey: ${ANON_KEY:-anon}"; then
  ok "Auth /health responding (HTTP 200)"
else
  warn "Auth /health did not return 200. Check: docker logs --tail=80 supabase-auth"
fi

echo
ok "Auth repair complete. Try logging in again."
echo "   Admin: bala@sharviinfotech.com / Sharvi@123"