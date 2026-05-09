#!/usr/bin/env bash
# Build & run the WhatsApp bridge container on this host.
# Uses --network=host for the build so apt can reach Debian mirrors even when
# Docker's default bridge network is blocked by UFW / corporate firewall.
#
# Usage:
#   sudo bash deploy/run-wa-bridge.sh
#
# After it runs, the bridge is reachable at http://<SERVER_IP>:<WA_HOST_PORT>
# which should match WHATSAPP_BRIDGE_URL in /home/<user>/resl/vvms/config.env.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash $0"; exit 1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
ENV_FILE="$BASE_DIR/config.env"
MIDDLEWARE_DIR="$BASE_DIR/middleware"

# Auto-strip CRLF in case the file was touched on Windows
sed -i 's/\r$//' "$0" 2>/dev/null || true

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Run deploy.sh first."; exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${WHATSAPP_BRIDGE_API_KEY:?WHATSAPP_BRIDGE_API_KEY missing in $ENV_FILE}"
WA_HOST_PORT="${WA_HOST_PORT:-3001}"

echo ">>> Syncing whatsapp-bridge source to $MIDDLEWARE_DIR..."
mkdir -p "$MIDDLEWARE_DIR/whatsapp-bridge-data"
rsync -a --delete "$REPO_ROOT/whatsapp-bridge/" "$MIDDLEWARE_DIR/whatsapp-bridge/"
chown -R "$SERVICE_USER:$SERVICE_USER" "$MIDDLEWARE_DIR"

echo ">>> Building image (host network)..."
( cd "$MIDDLEWARE_DIR/whatsapp-bridge" && docker build --network=host -t visiguard-wa . )

echo ">>> (Re)starting container on 0.0.0.0:${WA_HOST_PORT}..."
docker rm -f wa-bridge >/dev/null 2>&1 || true
docker run -d --name wa-bridge --restart=always \
  -p 0.0.0.0:${WA_HOST_PORT}:3000 \
  -v "$MIDDLEWARE_DIR/whatsapp-bridge-data":/data \
  -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
  --add-host=host.docker.internal:host-gateway \
  visiguard-wa

echo
echo "WA bridge is up. Configured URL in env:"
echo "  WHATSAPP_BRIDGE_URL=${WHATSAPP_BRIDGE_URL:-<unset>}"
echo "Reachable on this host at: http://${PUBLIC_IP:-127.0.0.1}:${WA_HOST_PORT}"
echo "Logs:  docker logs -f wa-bridge"