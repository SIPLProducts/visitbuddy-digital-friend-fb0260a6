#!/usr/bin/env bash
# Re-deploy frontend + edge functions after a `git pull`.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Run as root"; exit 1; fi

APP_DIR="/opt/visiguard"
SUPA_DOCKER="/opt/supabase/docker"
WWW_DIR="/var/www/visiguard"
source /etc/visiguard.env

cd "$APP_DIR"
git pull --ff-only

# Frontend
npm ci --no-audit --no-fund
npm run build
rsync -a --delete dist/ "$WWW_DIR/"
chown -R www-data:www-data "$WWW_DIR"

# Edge functions
FUNC_DIR="$SUPA_DOCKER/volumes/functions"
for fn in "$APP_DIR"/supabase/functions/*/; do
  name=$(basename "$fn")
  mkdir -p "$FUNC_DIR/$name"
  rsync -a --delete "$fn" "$FUNC_DIR/$name/"
done
docker compose -f "$SUPA_DOCKER/docker-compose.yml" restart functions || true

# WhatsApp bridge
cd "$APP_DIR/whatsapp-bridge"
docker build -t visiguard-wa . >/dev/null
docker rm -f wa-bridge >/dev/null 2>&1 || true
docker run -d --name wa-bridge --restart=always \
  -p 127.0.0.1:3001:3000 \
  -v /opt/visiguard-wa-data:/data \
  -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
  --add-host=host.docker.internal:host-gateway \
  visiguard-wa

systemctl reload nginx
echo "Update complete."