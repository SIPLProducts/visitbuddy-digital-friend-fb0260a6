#!/usr/bin/env bash
# Diagnose why supabase-edge-functions container is not running.
# Run when edge functions return: {"message":"name resolution failed"}
# but the host DNS works fine (i.e. the container itself is down).
#
# Usage:  sudo bash deploy/diagnose-edge-functions.sh
set -u

CYAN="\033[36m"; RED="\033[31m"; GREEN="\033[32m"; YEL="\033[33m"; OFF="\033[0m"
section() { echo -e "\n${CYAN}=== $* ===${OFF}"; }
ok()      { echo -e "${GREEN}OK${OFF}    $*"; }
bad()     { echo -e "${RED}FAIL${OFF}  $*"; }
warn()    { echo -e "${YEL}WARN${OFF}  $*"; }

CONTAINER="${CONTAINER:-supabase-edge-functions}"
SERVICE_USER="${SERVICE_USER:-vmsadm}"
COMPOSE_DIR="${COMPOSE_DIR:-/home/${SERVICE_USER}/resl/vvms/backend/supabase/docker}"

section "Container state (docker ps -a)"
docker ps -a --filter "name=${CONTAINER}" --format 'table {{.Names}}\t{{.Status}}\t{{.State}}\t{{.RunningFor}}' || bad "docker ps failed"

section "docker inspect (state, exit code, OOM)"
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  docker inspect "$CONTAINER" --format \
    'status={{.State.Status}}
exit_code={{.State.ExitCode}}
oom_killed={{.State.OOMKilled}}
restart_count={{.RestartCount}}
started_at={{.State.StartedAt}}
finished_at={{.State.FinishedAt}}
error={{.State.Error}}'
else
  bad "container ${CONTAINER} does not exist"
  echo "Containers currently in this project:"
  docker ps -a --format '  {{.Names}}  ({{.Status}})' | grep -i supabase || true
  exit 1
fi

section "Last 200 log lines (cause of crash should be here)"
docker logs --tail=200 "$CONTAINER" 2>&1 || warn "could not read logs"

section "Container env vars (names only — values redacted)"
if docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | awk -F= '{print "  " $1}' | sort -u; then
  :
else
  warn "could not read env"
fi

section "Required env vars present?"
ENV_DUMP="$(docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)"
for k in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY JWT_SECRET \
         TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_WHATSAPP_NUMBER TWILIO_SMS_NUMBER; do
  if echo "$ENV_DUMP" | grep -q "^${k}="; then
    ok "$k is set"
  else
    bad "$k is MISSING from container env"
  fi
done

section "Edge function folders on disk"
if [[ -d "${COMPOSE_DIR}/volumes/functions" ]]; then
  ls -la "${COMPOSE_DIR}/volumes/functions" 2>/dev/null || true
elif [[ -d "supabase/functions" ]]; then
  ls -la supabase/functions 2>/dev/null || true
else
  warn "could not locate functions directory"
fi

echo
echo -e "${CYAN}=== Done ===${OFF}"
echo "Common fixes:"
echo "  - 'BootError: Worker boot error'  -> one function has a syntax/import error (see logs above)"
echo "  - 'Missing env'                    -> add to backend/supabase/docker/.env then re-run restart-edge-functions.sh"
echo "  - 'OOMKilled: true' / exit 137     -> bump container memory in docker-compose.yml"
echo
echo "To bring it back up:  sudo bash deploy/restart-edge-functions.sh"