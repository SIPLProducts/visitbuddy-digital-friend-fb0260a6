#!/usr/bin/env bash
# Configure the WhatsApp Web bridge end-to-end on this host.
#
# What it does (idempotent — safe to re-run):
#   1. Generates WHATSAPP_BRIDGE_API_KEY if not already set.
#   2. Upserts WHATSAPP_BRIDGE_URL, WHATSAPP_BRIDGE_API_KEY, WA_HOST_PORT
#      into BOTH env files that need them:
#        - /home/<user>/resl/vvms/config.env             (used by run-wa-bridge.sh)
#        - /home/<user>/resl/vvms/backend/supabase/docker/.env
#                                                       (used by supabase-edge-functions)
#   3. Builds & (re)starts the wa-bridge container via deploy/run-wa-bridge.sh.
#   4. Recreates the supabase-edge-functions container so it picks up the new env.
#   5. Verifies the bridge /health endpoint returns 200.
#
# Usage:  sudo bash deploy/configure-wa-bridge.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash $0"; exit 1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
CONFIG_ENV="$BASE_DIR/config.env"
SUPABASE_ENV="$BASE_DIR/backend/supabase/docker/.env"
SUPABASE_DIR="$BASE_DIR/backend/supabase/docker"
# This is the env file actually mounted into the supabase-edge-functions
# container by deploy.sh. Updating it is what makes Deno.env.get(...) work.
FUNCTIONS_ENV="$SUPABASE_DIR/volumes/functions/.env"

# Self-heal CRLF
sed -i 's/\r$//' "$0" 2>/dev/null || true

log()  { printf '\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
ok()   { printf '\033[1;32m[ OK ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

[[ -f "$CONFIG_ENV"   ]] || die "$CONFIG_ENV not found. Run install.sh first."
[[ -f "$SUPABASE_ENV" ]] || die "$SUPABASE_ENV not found. Run install.sh first."
if [[ ! -f "$FUNCTIONS_ENV" ]]; then
  warn "$FUNCTIONS_ENV not found — creating it. (deploy.sh normally creates this.)"
  mkdir -p "$(dirname "$FUNCTIONS_ENV")"
  : > "$FUNCTIONS_ENV"
fi

# Upsert KEY=VALUE into a shell-style env file, preserving everything else.
upsert_env() {
  local file="$1" key="$2" value="$3"
  if grep -qE "^${key}=" "$file"; then
    # Replace existing line. Use | as sed delimiter to tolerate / in values.
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

# Read current value from a config.env-style file (no sourcing required).
get_env() {
  local file="$1" key="$2"
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2- | sed 's/^"//; s/"$//'
}

# 1) Resolve / generate the API key
API_KEY="$(get_env "$CONFIG_ENV" WHATSAPP_BRIDGE_API_KEY || true)"
if [[ -z "$API_KEY" ]]; then
  API_KEY="$(get_env "$SUPABASE_ENV" WHATSAPP_BRIDGE_API_KEY || true)"
fi
if [[ -z "$API_KEY" ]]; then
  API_KEY="$(openssl rand -hex 32)"
  log "Generated new WHATSAPP_BRIDGE_API_KEY."
else
  log "Reusing existing WHATSAPP_BRIDGE_API_KEY."
fi

WA_HOST_PORT="${WA_HOST_PORT:-3001}"
BRIDGE_URL="http://host.docker.internal:${WA_HOST_PORT}"

# 2) Upsert into both env files
log "Updating $CONFIG_ENV ..."
upsert_env "$CONFIG_ENV" WHATSAPP_BRIDGE_API_KEY "$API_KEY"
upsert_env "$CONFIG_ENV" WA_HOST_PORT            "$WA_HOST_PORT"
upsert_env "$CONFIG_ENV" WHATSAPP_BRIDGE_URL     "$BRIDGE_URL"

log "Updating $SUPABASE_ENV ..."
upsert_env "$SUPABASE_ENV" WHATSAPP_BRIDGE_API_KEY "$API_KEY"
upsert_env "$SUPABASE_ENV" WHATSAPP_BRIDGE_URL     "$BRIDGE_URL"

log "Updating $FUNCTIONS_ENV (the file mounted into supabase-edge-functions) ..."
upsert_env "$FUNCTIONS_ENV" WHATSAPP_BRIDGE_API_KEY "$API_KEY"
upsert_env "$FUNCTIONS_ENV" WHATSAPP_BRIDGE_URL     "$BRIDGE_URL"
ok "Env files updated."

# 3) Build & start the bridge
log "Building & starting wa-bridge container ..."
bash "$SCRIPT_DIR/run-wa-bridge.sh"

# 4) Recreate the edge-functions container so it sees the new env
if [[ -d "$SUPABASE_DIR" ]]; then
  log "Recreating supabase-edge-functions container ..."
  ( cd "$SUPABASE_DIR" && docker compose up -d --force-recreate functions ) \
    || warn "Could not recreate functions service automatically — restart it manually."
  # Give the container a moment to boot, then check for the missing-secrets line
  sleep 3
  if docker logs --tail=40 supabase-edge-functions 2>&1 | grep -q "missing secrets"; then
    warn "supabase-edge-functions still reports 'missing secrets'."
    warn "Check that vars are present in: $FUNCTIONS_ENV"
    warn "Then: docker compose -f $SUPABASE_DIR/docker-compose.yml up -d --force-recreate functions"
  else
    ok "supabase-edge-functions has the bridge env."
  fi
else
  warn "Supabase dir $SUPABASE_DIR missing; skipping functions recreate."
fi

# 5) Verify the bridge /health endpoint
log "Waiting for bridge /health on localhost:${WA_HOST_PORT} ..."
for i in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${WA_HOST_PORT}/health" || echo 000)"
  [[ "$code" == "200" ]] && { ok "Bridge /health responded 200."; break; }
  sleep 1
done
if [[ "${code:-000}" != "200" ]]; then
  warn "Bridge /health did not return 200 (got ${code:-000})."
  warn "Check: docker logs --tail=80 wa-bridge"
fi

cat <<EOF

==========================================================================
WhatsApp bridge configured.

  WHATSAPP_BRIDGE_URL     = $BRIDGE_URL
  WHATSAPP_BRIDGE_API_KEY = (stored in both env files)
  WA_HOST_PORT            = $WA_HOST_PORT

Next steps in the app:
  1. Open VisiGuard -> Settings -> WhatsApp.
  2. Click "Connect WhatsApp" and scan the QR with your phone
     (WhatsApp -> Linked devices -> Link a device).
  3. Flip the channel switch to "WhatsApp Web (Demo)".
  4. Click "Send test" — the bridge call should now succeed.

If "Bridge call failed" still appears:
  docker logs --tail=80 wa-bridge
  docker logs --tail=80 supabase-edge-functions
==========================================================================
EOF