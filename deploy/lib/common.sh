# Shared helpers sourced by every deploy script.
# - Connects to Postgres ONLY through `docker exec supabase-db` (never host TCP).
# - Provides URL-encoding helper for DATABASE_URL.
# - Provides wait-for helpers and consistent logging.
#
# This file is intentionally NOT executable; it must be sourced.

# shellcheck shell=bash

SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-postgres}"
LOG_DIR="${LOG_DIR:-/var/log/visiguard}"

mkdir -p "$LOG_DIR" 2>/dev/null || true

# ---- logging ---------------------------------------------------------------
log()  { printf '\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
ok()   { printf '\033[1;32m[ OK ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

# ---- config loading --------------------------------------------------------
load_config() {
  local script_dir="${1:-$(pwd)}"
  for cfg in "$BASE_DIR/config.env" "$script_dir/config.env" "$script_dir/../config.env"; do
    if [ -f "$cfg" ]; then
      # shellcheck disable=SC1090
      . "$cfg"
      export CONFIG_FILE="$cfg"
      return 0
    fi
  done
  return 1
}

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    die "Required env var '$name' is not set. Run deploy.sh first or source $BASE_DIR/config.env"
  fi
}

# ---- postgres via docker exec ---------------------------------------------
# Always uses docker exec — host port doesn't matter, no socket conflicts.
psql_exec() {
  require_var POSTGRES_PASSWORD
  docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 "$@"
}

# Soft variant: don't abort on SQL errors (for grants/notify that may be partial)
psql_soft() {
  require_var POSTGRES_PASSWORD
  docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=0 "$@"
}

# Tuple-only quiet: returns single value
psql_query() {
  require_var POSTGRES_PASSWORD
  docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$PG_USER" -d "$PG_DB" -tAq "$@"
}

pg_is_up() {
  docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1
}

wait_for_pg() {
  local timeout="${1:-60}" elapsed=0
  log "Waiting for Postgres in container '$PG_CONTAINER' (timeout ${timeout}s)..."
  while ! pg_is_up; do
    if [ "$elapsed" -ge "$timeout" ]; then
      die "Postgres did not become ready in ${timeout}s. Check: docker logs $PG_CONTAINER"
    fi
    sleep 2; elapsed=$((elapsed+2))
  done
  ok "Postgres is accepting queries."
}

# Verify a fresh backend can actually open data files. pg_isready talks to
# the existing postmaster (which holds open FDs), so it can still answer
# "yes" even when new backends fail with:
#   FATAL: could not open file "global/pg_filenode.map": Permission denied
# Returns 0 if a new backend works, 1 if "Permission denied" detected,
# 2 for any other failure.
pg_smoke_test() {
  require_var POSTGRES_PASSWORD
  local out
  if out=$(echo 'SELECT 1' | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" \
               "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tAq 2>&1); then
    return 0
  fi
  if echo "$out" | grep -qi "permission denied"; then
    warn "Postgres new-backend smoke test failed: Permission denied on data files."
    printf '%s\n' "$out" | head -5 >&2
    return 1
  fi
  warn "Postgres smoke test failed. Raw output:"
  printf '%s\n' "$out" | head -10 >&2
  return 2
}

# ---- URL-encode a password for DATABASE_URL --------------------------------
urlencode() {
  python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

# ---- safe HTTP wait --------------------------------------------------------
wait_for_http() {
  local url="$1" expected="${2:-200}" timeout="${3:-60}" headers="${4:-}"
  local elapsed=0 code
  while :; do
    if [ -n "$headers" ]; then
      code=$(curl -s -o /dev/null -w "%{http_code}" -H "$headers" "$url" || echo 000)
    else
      code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo 000)
    fi
    [ "$code" = "$expected" ] && return 0
    [ "$elapsed" -ge "$timeout" ] && { warn "$url -> HTTP $code (expected $expected)"; return 1; }
    sleep 2; elapsed=$((elapsed+2))
  done
}

# ---- self-heal CRLF on caller scripts before bash chokes -------------------
crlf_heal() {
  local target="$1"
  if grep -lq $'\r' "$target" 2>/dev/null; then
    sed -i 's/\r$//' "$target" 2>/dev/null || true
  fi
}