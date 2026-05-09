#!/usr/bin/env bash
# VisiGuard CLEAN REDEPLOY — wipes the on-prem stack, reinstalls, applies
# supabase/migrations/*.sql, then optionally seeds with the snapshot of cloud
# data committed under deploy/seed/.
#
# Usage (run as root):
#   sudo bash deploy/redeploy.sh                    # schema only (empty data)
#   sudo bash deploy/redeploy.sh --with-seed        # schema + committed cloud data
#   sudo bash deploy/redeploy.sh --with-seed \
#         --storage /path/to/storage-export.tgz     # also restore uploaded files
#
# Optional flags:
#   --keep-config     Don't delete config.env (keeps ports/passwords/secrets)
#
# All uploaded files (visitor photos, branding logos) live under
#   $BASE_DIR/backend/supabase/docker/volumes/storage/
# which is bind-mounted into the storage-api container. That folder IS your
# on-prem upload location — back it up like any other data.
#
# Idempotent. Safe to re-run if it fails halfway.
set -euo pipefail

# CRLF self-heal
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0 [...]"; exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
ENV_FILE="$BASE_DIR/config.env"

WITH_SEED=0; STORAGE_TGZ=""; KEEP_CONFIG=0
BUILD_WA=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-seed)   WITH_SEED=1; shift ;;
    --storage)     STORAGE_TGZ="$2"; shift 2 ;;
    --keep-config) KEEP_CONFIG=1; shift ;;
    --build-wa)    BUILD_WA=1; shift ;;
    -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo "============================================================"
echo " VisiGuard CLEAN REDEPLOY (migrations + seed SQL)"
echo "   base:        $BASE_DIR"
echo "   migrations:  $REPO_ROOT/supabase/migrations  (\$(ls $REPO_ROOT/supabase/migrations | wc -l) files)"
echo "   with-seed:   $WITH_SEED"
echo "   storage tgz: ${STORAGE_TGZ:-<none>}"
echo "   keep cfg:    $KEEP_CONFIG"
echo "============================================================"

# ---------------------------------------------------------------
# 1) Tear down existing stack + wipe volumes
# ---------------------------------------------------------------
echo ">>> [1/5] Stopping containers and wiping volumes..."
if [[ -f "$SUPA_DOCKER/docker-compose.yml" ]]; then
  ( cd "$SUPA_DOCKER" && docker compose down -v --remove-orphans ) || true
fi

for c in wa-bridge supabase-db supabase-rest supabase-auth supabase-storage \
         supabase-realtime supabase-meta supabase-functions supabase-kong \
         supabase-studio supabase-imgproxy supabase-vector supabase-analytics \
         supabase-pooler realtime-dev.supabase-realtime; do
  docker rm -f "$c" >/dev/null 2>&1 || true
done

docker volume ls -q --filter label=com.docker.compose.project=docker \
  | xargs -r docker volume rm -f >/dev/null 2>&1 || true

rm -rf "$SUPA_DOCKER/volumes/db/data"      2>/dev/null || true
rm -rf "$SUPA_DOCKER/volumes/storage"/*    2>/dev/null || true
rm -rf "$BASE_DIR/middleware/whatsapp-bridge-data"/* 2>/dev/null || true

if [[ "$KEEP_CONFIG" != "1" ]]; then
  rm -f "$ENV_FILE"
fi

# ---------------------------------------------------------------
# 2) Free-port pre-flight (informational; deploy.sh re-checks)
# ---------------------------------------------------------------
echo ">>> [2/5] Free-port scan..."
pick_port() {
  local p="$1"
  while ss -ltn "( sport = :$p )" 2>/dev/null | grep -q LISTEN; do p=$((p+1)); done
  echo "$p"
}
export API_PORT="$(pick_port 8000)"
export WA_HOST_PORT="$(pick_port 3001)"
export KONG_HTTPS_PORT="$(pick_port 8443)"
echo "   API:        $API_PORT"
echo "   WA bridge:  $WA_HOST_PORT"
echo "   Kong HTTPS: $KONG_HTTPS_PORT"

# ---------------------------------------------------------------
# 3) Run deploy.sh WITHOUT the legacy init-schema/seed.sql path
#    (we apply supabase/migrations/*.sql ourselves in step 4)
# ---------------------------------------------------------------
echo ">>> [3/5] Running deploy.sh (SKIP_SCHEMA=1)..."
SKIP_SCHEMA=1 BUILD_WA_BRIDGE="$BUILD_WA" bash "$SCRIPT_DIR/deploy.sh"

# Reload env vars deploy.sh just wrote (API_PORT, POSTGRES_PASSWORD, etc.)
# shellcheck disable=SC1090
source "$ENV_FILE"

# ---------------------------------------------------------------
# 4) Apply supabase/migrations/*.sql, then optionally seed data
# ---------------------------------------------------------------
echo ">>> [4/5] Applying schema migrations..."
bash "$SCRIPT_DIR/apply-migrations.sh"

if [[ "$WITH_SEED" == "1" ]]; then
  echo ">>> [4b/5] Importing committed cloud data from deploy/seed/..."
  if [[ -n "$STORAGE_TGZ" ]]; then
    bash "$SCRIPT_DIR/import-seed.sh" "$STORAGE_TGZ"
  else
    bash "$SCRIPT_DIR/import-seed.sh"
  fi
else
  echo ">>> [4b/5] Skipping data seed (run with --with-seed to populate)."
  # Bootstrap the primary admin so the app is usable on first login (no host psql).
  ADMIN_RESP=$(curl -fsS -X POST "http://127.0.0.1:${API_PORT}/auth/v1/admin/users" \
      -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"HO Admin\"}}" || true)
  ADMIN_ID=$(echo "$ADMIN_RESP" | jq -r '.id // empty')
  [[ -z "$ADMIN_ID" ]] && ADMIN_ID=$(echo "SELECT id FROM auth.users WHERE email='$ADMIN_EMAIL' LIMIT 1" \
      | psql_query | tr -d ' \r\n')
  if [[ -n "$ADMIN_ID" ]]; then
    psql_soft <<SQL
INSERT INTO public.profiles (user_id, full_name) VALUES ('$ADMIN_ID', 'HO Admin') ON CONFLICT DO NOTHING;
INSERT INTO public.locations (id, name, city, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Head Office', 'Bengaluru', 'India', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES ('$ADMIN_ID', '00000000-0000-0000-0000-000000000001', 'admin', true)
ON CONFLICT DO NOTHING;
SQL
  fi
fi

echo ">>> [4c/5] Repair PostgREST schema cache..."
bash "$SCRIPT_DIR/repair-postgrest.sh" || true

# ---------------------------------------------------------------
# 5) Final health check
# ---------------------------------------------------------------
echo ">>> [5/5] Health check..."
ANON_KEY=$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" | cut -d= -f2-)
OK=0; CODE="000"
for i in $(seq 1 40); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    "http://127.0.0.1:${API_PORT}/rest/v1/locations?select=id&limit=1" || true)
  if [[ "$CODE" == "200" ]]; then OK=1; break; fi
  sleep 2
done

if [[ "$OK" == "1" ]]; then
  echo
  echo "============================================================"
  echo " REDEPLOY COMPLETE — REST returned 200 on port $API_PORT"
  echo "   App URL:        http://${PUBLIC_IP}"
  echo "   Supabase API:   http://${PUBLIC_IP}:${API_PORT}"
  echo "   Studio login:   ${DASHBOARD_USERNAME} / ${DASHBOARD_PASSWORD}"
  echo "   Admin login:    ${ADMIN_EMAIL} / <cloud password if seeded, else ${ADMIN_PASSWORD}>"
  echo "   Uploads on disk:$SUPA_DOCKER/volumes/storage/"
  echo "============================================================"
else
  echo "ERROR: REST still returning $CODE after retries."
  echo "Check: docker compose -f $SUPA_DOCKER/docker-compose.yml logs --tail=80 rest auth"
  exit 1
fi