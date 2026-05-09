#!/usr/bin/env bash
# health-check.sh — verifies the on-prem stack is functional.
# Exits 0 if all checks pass, non-zero otherwise.
set -euo pipefail

# CRLF self-heal
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/lib/common.sh"
load_config "$HERE" || die "config.env not found"

SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
API_PORT="${API_PORT:-8000}"
ANON_KEY="${ANON_KEY:-$(grep -E '^ANON_KEY=' "$SUPA_DOCKER/.env" 2>/dev/null | cut -d= -f2-)}"

FAILED=0
pass() { ok "$1"; }
fail() { warn "$1"; FAILED=$((FAILED+1)); }

echo
log "===== VisiGuard health check ====="

# 1. docker compose containers
if docker compose -f "$SUPA_DOCKER/docker-compose.yml" ps --format json 2>/dev/null \
    | python3 -c "import sys,json
ok=True
for line in sys.stdin:
    line=line.strip()
    if not line: continue
    try: d=json.loads(line)
    except: continue
    state=d.get('State','')
    health=d.get('Health','')
    if state!='running' or (health and health!='healthy'):
        print(f\"  unhealthy: {d.get('Name')} state={state} health={health}\"); ok=False
sys.exit(0 if ok else 1)
"; then
  pass "All containers running / healthy"
else
  fail "One or more containers unhealthy (see above)"
fi

# 2. Postgres reachable via docker exec
if pg_is_up; then pass "Postgres responding"; else fail "Postgres not responding"; fi

# 3. profiles row count > 0 (proves migrations + seed ran)
CNT=$(echo "SELECT count(*) FROM public.profiles" | psql_query 2>/dev/null || echo 0)
if [ "${CNT:-0}" -gt 0 ] 2>/dev/null; then
  pass "public.profiles has $CNT rows"
else
  fail "public.profiles has 0 rows (seed not imported)"
fi

# 4. REST 200
if wait_for_http "http://127.0.0.1:${API_PORT}/rest/v1/locations?select=id&limit=1" 200 30 "apikey: ${ANON_KEY:-anon}"; then
  pass "REST API responding (HTTP 200)"
else
  fail "REST API not responding"
fi

# 5. Auth /health
if wait_for_http "http://127.0.0.1:${API_PORT}/auth/v1/health" 200 30 "apikey: ${ANON_KEY:-anon}"; then
  pass "Auth /health responding"
else
  fail "Auth /health not responding"
fi

# 6. nginx config valid
if nginx -t >/dev/null 2>&1; then pass "nginx config OK"; else fail "nginx -t failed"; fi

echo
if [ "$FAILED" -eq 0 ]; then
  ok "All checks passed."
  exit 0
else
  warn "$FAILED check(s) failed."
  exit 1
fi