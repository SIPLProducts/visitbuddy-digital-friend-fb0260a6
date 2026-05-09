#!/usr/bin/env bash
# Diagnose DNS / outbound egress for the supabase-edge-functions container.
# Run when edge functions return: {"message":"name resolution failed"}
#
# Usage:  sudo bash deploy/diagnose-egress.sh
set -u

CYAN="\033[36m"; RED="\033[31m"; GREEN="\033[32m"; YEL="\033[33m"; OFF="\033[0m"
section() { echo -e "\n${CYAN}=== $* ===${OFF}"; }
ok()      { echo -e "${GREEN}OK${OFF}    $*"; }
bad()     { echo -e "${RED}FAIL${OFF}  $*"; }
warn()    { echo -e "${YEL}WARN${OFF}  $*"; }

CONTAINER="${CONTAINER:-supabase-edge-functions}"

section "Host: /etc/resolv.conf"
cat /etc/resolv.conf 2>/dev/null || bad "cannot read /etc/resolv.conf"

section "Host: resolve smtp.gmail.com"
if getent hosts smtp.gmail.com >/dev/null 2>&1; then
  ok "host resolves smtp.gmail.com -> $(getent hosts smtp.gmail.com | awk '{print $1}' | head -1)"
else
  bad "host CANNOT resolve smtp.gmail.com (DNS broken on the server itself)"
fi

section "Host: resolve api.twilio.com"
if getent hosts api.twilio.com >/dev/null 2>&1; then
  ok "host resolves api.twilio.com"
else
  bad "host CANNOT resolve api.twilio.com"
fi

section "Container: ${CONTAINER} present?"
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  ok "container exists"
else
  bad "container ${CONTAINER} not found — is the Supabase stack up?"
  docker ps --format '{{.Names}}' | grep -i supabase || true
  exit 1
fi

section "Container: /etc/resolv.conf"
docker exec "$CONTAINER" cat /etc/resolv.conf 2>&1 || bad "cannot read container resolv.conf"

section "Container: resolve smtp.gmail.com"
if docker exec "$CONTAINER" getent hosts smtp.gmail.com >/dev/null 2>&1; then
  ok "container resolves smtp.gmail.com"
else
  bad "container CANNOT resolve smtp.gmail.com  <-- this is your error"
fi

section "Container: resolve api.twilio.com"
if docker exec "$CONTAINER" getent hosts api.twilio.com >/dev/null 2>&1; then
  ok "container resolves api.twilio.com"
else
  bad "container CANNOT resolve api.twilio.com"
fi

section "Container: HTTPS reachability to api.twilio.com (5s)"
docker exec "$CONTAINER" sh -c 'wget -qO- --timeout=5 https://api.twilio.com 2>&1 | head -3' || \
  warn "wget not available or request failed"

section "UFW status"
if command -v ufw >/dev/null 2>&1; then
  ufw status 2>/dev/null || true
else
  echo "ufw not installed"
fi

section "Outbound port test from host (53/udp, 443/tcp, 587/tcp)"
for hp in "8.8.8.8:53" "api.twilio.com:443" "smtp.gmail.com:587"; do
  host="${hp%:*}"; port="${hp#*:}"
  if timeout 4 bash -c "</dev/tcp/${host}/${port}" 2>/dev/null; then
    ok "TCP ${host}:${port} reachable from host"
  else
    if [[ "$port" == "53" ]]; then
      # 53/udp can't be tested via /dev/tcp; just note it
      warn "TCP ${host}:${port} not reachable (UDP/53 not tested)"
    else
      bad "TCP ${host}:${port} NOT reachable from host (firewall?)"
    fi
  fi
done

echo
echo -e "${CYAN}=== Done ===${OFF}"
echo "If 'container CANNOT resolve' appears, run:  sudo bash deploy/fix-edge-dns.sh"
echo "If 'TCP ... NOT reachable from host' appears, your firewall is blocking egress."