#!/usr/bin/env bash
# Re-deploy frontend + edge functions + middleware after code changes.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Run as root"; exit 1; fi

SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl}"
ENV_FILE="$BASE_DIR/config.env"
# shellcheck disable=SC1090
source "$ENV_FILE"

FRONTEND_DIR="$BASE_DIR/frontend"
BACKEND_DIR="$BASE_DIR/backend"
MIDDLEWARE_DIR="$BASE_DIR/middleware"
SUPA_DOCKER="$BACKEND_DIR/supabase/docker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Frontend
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude supabase --exclude whatsapp-bridge --exclude deploy \
  "$APP_REPO_DIR"/ "$FRONTEND_DIR"/
chown -R "$SERVICE_USER:$SERVICE_USER" "$FRONTEND_DIR"
sudo -u "$SERVICE_USER" -H bash -c "cd '$FRONTEND_DIR' && npm ci --no-audit --no-fund && npm run build"

# Edge functions
FUNC_DIR="$SUPA_DOCKER/volumes/functions"
for fn in "$APP_REPO_DIR"/supabase/functions/*/; do
  name=$(basename "$fn")
  mkdir -p "$FUNC_DIR/$name"
  rsync -a --delete "$fn" "$FUNC_DIR/$name/"
done
docker compose -f "$SUPA_DOCKER/docker-compose.yml" restart functions || true

# Middleware (WhatsApp bridge)
rsync -a --delete "$APP_REPO_DIR/whatsapp-bridge/" "$MIDDLEWARE_DIR/whatsapp-bridge/"
cd "$MIDDLEWARE_DIR/whatsapp-bridge"
docker build -t visiguard-wa . >/dev/null
docker rm -f wa-bridge >/dev/null 2>&1 || true
docker run -d --name wa-bridge --restart=always \
  -p 127.0.0.1:3001:3000 \
  -v "$MIDDLEWARE_DIR/whatsapp-bridge-data":/data \
  -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
  --add-host=host.docker.internal:host-gateway \
  visiguard-wa

systemctl reload nginx
echo "Update complete."
