#!/usr/bin/env bash
# Fix "name resolution failed" in supabase-edge-functions by configuring
# Docker daemon DNS to public resolvers, then restarting the stack.
#
# Usage:  sudo bash deploy/fix-edge-dns.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash $0"; exit 1; fi

CYAN="\033[36m"; GREEN="\033[32m"; RED="\033[31m"; YEL="\033[33m"; OFF="\033[0m"
log()  { echo -e "${CYAN}[fix-edge-dns]${OFF} $*"; }
ok()   { echo -e "${GREEN}OK${OFF}  $*"; }
warn() { echo -e "${YEL}WARN${OFF} $*"; }
die()  { echo -e "${RED}ERR${OFF} $*"; exit 1; }

SERVICE_USER="${SERVICE_USER:-vmsadm}"
COMPOSE_DIR="${COMPOSE_DIR:-/home/${SERVICE_USER}/resl/vvms/backend/supabase/docker}"
DAEMON_JSON="/etc/docker/daemon.json"
DNS1="${DNS1:-8.8.8.8}"
DNS2="${DNS2:-1.1.1.1}"

log "Configuring Docker daemon DNS -> ${DNS1}, ${DNS2}"
mkdir -p /etc/docker

if [[ -f "$DAEMON_JSON" ]]; then
  cp "$DAEMON_JSON" "${DAEMON_JSON}.bak.$(date +%s)"
  log "Backup saved next to ${DAEMON_JSON}"
  # Merge dns key, preserving other settings. Requires python3.
  python3 - "$DAEMON_JSON" "$DNS1" "$DNS2" <<'PY'
import json, sys
path, d1, d2 = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(path) as f:
        cfg = json.load(f)
    if not isinstance(cfg, dict):
        cfg = {}
except Exception:
    cfg = {}
cfg["dns"] = [d1, d2]
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
print("merged:", cfg)
PY
else
  cat > "$DAEMON_JSON" <<EOF
{
  "dns": ["${DNS1}", "${DNS2}"]
}
EOF
  log "Created ${DAEMON_JSON}"
fi

log "Restarting docker daemon (this briefly stops all containers)"
systemctl restart docker
sleep 3
ok "docker restarted"

if [[ -d "$COMPOSE_DIR" ]]; then
  log "Bringing Supabase stack back up: ${COMPOSE_DIR}"
  ( cd "$COMPOSE_DIR" && docker compose up -d ) || warn "compose up returned non-zero"
else
  warn "Compose dir ${COMPOSE_DIR} not found — start your stack manually"
fi

# Wait for edge-functions container to be back
for i in $(seq 1 20); do
  if docker inspect supabase-edge-functions >/dev/null 2>&1 && \
     [[ "$(docker inspect -f '{{.State.Running}}' supabase-edge-functions 2>/dev/null)" == "true" ]]; then
    break
  fi
  sleep 2
done

log "Verifying DNS inside supabase-edge-functions"
if docker exec supabase-edge-functions getent hosts smtp.gmail.com >/dev/null 2>&1; then
  ok "container resolves smtp.gmail.com"
else
  die "container still cannot resolve smtp.gmail.com — check firewall/egress (port 53/UDP)"
fi

if docker exec supabase-edge-functions getent hosts api.twilio.com >/dev/null 2>&1; then
  ok "container resolves api.twilio.com"
else
  warn "container cannot resolve api.twilio.com — verify outbound 443"
fi

echo
ok "Done. Retry 'Send Test Email' / WhatsApp test from the app."