#!/usr/bin/env bash
# Restart the supabase-edge-functions container and verify it stays up.
#
# Usage:  sudo bash deploy/restart-edge-functions.sh
set -u

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash $0"; exit 1; fi

CYAN="\033[36m"; GREEN="\033[32m"; RED="\033[31m"; YEL="\033[33m"; OFF="\033[0m"
log()  { echo -e "${CYAN}[restart-edge-fn]${OFF} $*"; }
ok()   { echo -e "${GREEN}OK${OFF}  $*"; }
warn() { echo -e "${YEL}WARN${OFF} $*"; }
die()  { echo -e "${RED}ERR${OFF} $*"; exit 1; }

SERVICE_USER="${SERVICE_USER:-vmsadm}"
COMPOSE_DIR="${COMPOSE_DIR:-/home/${SERVICE_USER}/resl/vvms/backend/supabase/docker}"
CONTAINER="supabase-edge-functions"
SERVICE="${SERVICE:-functions}"

[[ -d "$COMPOSE_DIR" ]] || die "Compose dir not found: $COMPOSE_DIR"

log "Stopping $SERVICE (if running)"
( cd "$COMPOSE_DIR" && docker compose stop "$SERVICE" ) || warn "stop returned non-zero"

log "Removing crashed container so it gets recreated cleanly"
( cd "$COMPOSE_DIR" && docker compose rm -f "$SERVICE" ) || warn "rm returned non-zero"

log "Starting $SERVICE"
( cd "$COMPOSE_DIR" && docker compose up -d "$SERVICE" ) || die "compose up failed"

log "Waiting up to 30s for $CONTAINER to be Running..."
RUNNING=""
for i in $(seq 1 15); do
  state="$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo false)"
  if [[ "$state" == "true" ]]; then RUNNING="yes"; break; fi
  sleep 2
done

if [[ -z "$RUNNING" ]]; then
  echo
  warn "Container did not stay up. Last 100 log lines:"
  docker logs --tail=100 "$CONTAINER" 2>&1 || true
  die "edge-functions failed to start — fix the cause shown above, then re-run"
fi

ok "$CONTAINER is running"

# Give Deno a couple seconds to actually bind
sleep 3

log "Verifying DNS inside container"
if docker exec "$CONTAINER" getent hosts smtp.gmail.com >/dev/null 2>&1; then
  ok "container resolves smtp.gmail.com"
else
  warn "container cannot resolve smtp.gmail.com — run deploy/fix-edge-dns.sh"
fi

log "Probing Kong -> functions (HTTP status)"
code="$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  http://localhost:8000/functions/v1/test-smtp || echo 000)"
case "$code" in
  401|403) ok "functions are reachable (got $code — auth required, that's expected)" ;;
  200|400) ok "functions are reachable (got $code)" ;;
  000)     warn "could not reach Kong on :8000 (is the kong container up?)" ;;
  503|502) warn "Kong reachable but upstream still failing (got $code) — check logs again" ;;
  *)       ok "got HTTP $code from functions endpoint" ;;
esac

echo
ok "Done. Retry 'Send Test Email' / WhatsApp test from the app."