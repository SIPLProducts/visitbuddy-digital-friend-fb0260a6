#!/usr/bin/env bash
# VisiGuard CLEAN REDEPLOY — wipes the on-prem stack, reinstalls, and (optionally)
# restores a Lovable Cloud export so the on-prem app is a 1:1 mirror.
#
# Usage (run as root):
#   sudo bash deploy/redeploy.sh \
#        --dump    /tmp/cloud-export.dump \
#        --storage /tmp/storage-export.tgz
#
# Optional flags:
#   --keep-config     Don't delete config.env (keeps ports/passwords/secrets)
#   --no-import       Just wipe + redeploy, skip the data import
#
# Idempotent. Safe to re-run if it fails halfway.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0 [...]"; exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
ENV_FILE="$BASE_DIR/config.env"

DUMP=""; TGZ=""; KEEP_CONFIG=0; DO_IMPORT=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)        DUMP="$2"; shift 2 ;;
    --storage)     TGZ="$2";  shift 2 ;;
    --keep-config) KEEP_CONFIG=1; shift ;;
    --no-import)   DO_IMPORT=0; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

if [[ "$DO_IMPORT" == "1" ]]; then
  [[ -f "$DUMP" ]] || { echo "ERROR: --dump file not found: $DUMP"; exit 1; }
  [[ -f "$TGZ"  ]] || { echo "ERROR: --storage file not found: $TGZ"; exit 1; }
fi

echo "============================================================"
echo " VisiGuard CLEAN REDEPLOY"
echo "   base:      $BASE_DIR"
echo "   dump:      ${DUMP:-<none>}"
echo "   storage:   ${TGZ:-<none>}"
echo "   keep cfg:  $KEEP_CONFIG"
echo "============================================================"

# ---------------------------------------------------------------
# 1) Tear down existing stack + wipe volumes
# ---------------------------------------------------------------
echo ">>> [1/5] Stopping containers and wiping volumes..."
if [[ -f "$SUPA_DOCKER/docker-compose.yml" ]]; then
  ( cd "$SUPA_DOCKER" && docker compose down -v --remove-orphans ) || true
fi

# Belt-and-braces: nuke any straggler containers from older deploys
for c in wa-bridge supabase-db supabase-rest supabase-auth supabase-storage \
         supabase-realtime supabase-meta supabase-functions supabase-kong \
         supabase-studio supabase-imgproxy supabase-vector supabase-analytics \
         supabase-pooler realtime-dev.supabase-realtime; do
  docker rm -f "$c" >/dev/null 2>&1 || true
done

# Remove project volumes left behind
docker volume ls -q --filter label=com.docker.compose.project=docker \
  | xargs -r docker volume rm -f >/dev/null 2>&1 || true

# Disk-level wipe (the supabase compose mounts these as bind mounts)
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
API_PORT_HINT=$(pick_port 8000)
WA_PORT_HINT=$(pick_port 3001)
KONG_HTTPS_HINT=$(pick_port 8443)
echo "   API:        $API_PORT_HINT"
echo "   WA bridge:  $WA_PORT_HINT"
echo "   Kong HTTPS: $KONG_HTTPS_HINT"
export API_PORT="$API_PORT_HINT"
export WA_HOST_PORT="$WA_PORT_HINT"
export KONG_HTTPS_PORT="$KONG_HTTPS_HINT"

# ---------------------------------------------------------------
# 3) Run the standard deploy
# ---------------------------------------------------------------
echo ">>> [3/5] Running deploy.sh..."
bash "$SCRIPT_DIR/deploy.sh"

# Reload env vars deploy.sh just wrote (API_PORT etc.)
# shellcheck disable=SC1090
source "$ENV_FILE"

# ---------------------------------------------------------------
# 4) Restore cloud data (optional)
# ---------------------------------------------------------------
if [[ "$DO_IMPORT" == "1" ]]; then
  echo ">>> [4/5] Importing cloud dump + storage..."
  bash "$SCRIPT_DIR/import-to-onprem.sh" "$DUMP" "$TGZ"

  echo ">>> [4b/5] Re-running PostgREST repair to be safe..."
  bash "$SCRIPT_DIR/repair-postgrest.sh" || true
else
  echo ">>> [4/5] Skipped data import (--no-import)."
fi

# ---------------------------------------------------------------
# 5) Final health check
# ---------------------------------------------------------------
echo ">>> [5/5] Health check..."
ANON_KEY=$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" | cut -d= -f2-)
OK=0
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
  echo "   App URL:       http://${PUBLIC_IP}"
  echo "   Supabase API:  http://${PUBLIC_IP}:${API_PORT}"
  echo "   Studio login:  ${DASHBOARD_USERNAME} / ${DASHBOARD_PASSWORD}"
  echo "   Admin login:   ${ADMIN_EMAIL} / <cloud password if imported, else ${ADMIN_PASSWORD}>"
  echo "============================================================"
else
  echo "ERROR: REST still returning $CODE after retries."
  echo "Check: docker compose -f $SUPA_DOCKER/docker-compose.yml logs --tail=80 rest auth"
  exit 1
fi