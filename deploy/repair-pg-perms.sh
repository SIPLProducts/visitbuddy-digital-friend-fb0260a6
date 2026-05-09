#!/usr/bin/env bash
# repair-pg-perms.sh — fix PostgreSQL data directory ownership inside the
# supabase-db container AND on the host bind mount after a stray host-side
# `chown -R` rewrote ownership. Symptom this fixes:
#
#   psql: FATAL: could not open file "global/pg_filenode.map": Permission denied
#
# Root cause: an earlier deploy.sh did `chown -R vmsadm $BASE_DIR`, which
# walked into backend/supabase/docker/volumes/db/data and changed PG files
# off uid 70 (postgres in container). The running postmaster keeps its open
# FDs so pg_isready still answers, but every NEW backend (psql connection)
# fails to open data files.
#
# Usage:
#   sudo bash deploy/repair-pg-perms.sh
set -euo pipefail

if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/lib/common.sh"

if [ "$EUID" -ne 0 ]; then die "Run as root: sudo bash $0"; fi

# Load config.env so POSTGRES_PASSWORD is available for psql_exec / pg_smoke_test.
load_config "$HERE" || warn "config.env not found — smoke test may skip if POSTGRES_PASSWORD missing"

if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  die "Container '$PG_CONTAINER' is not running. Start the stack first (deploy.sh)."
fi

# ---- 1. Detect the postgres uid/gid actually used by the running image.
PG_UID="$(docker exec "$PG_CONTAINER" id -u postgres 2>/dev/null || echo 70)"
PG_GID="$(docker exec "$PG_CONTAINER" id -g postgres 2>/dev/null || echo 70)"
log "Detected postgres uid:gid inside $PG_CONTAINER = ${PG_UID}:${PG_GID}"

# ---- 2. Fix ownership inside the container.
log "Repairing ownership of /var/lib/postgresql/data inside $PG_CONTAINER"
docker exec -u 0 "$PG_CONTAINER" sh -c "
  set -e
  chown -R ${PG_UID}:${PG_GID} /var/lib/postgresql/data
  find /var/lib/postgresql/data -type d -exec chmod 700 {} +
  find /var/lib/postgresql/data -type f -exec chmod 600 {} +
" || warn "in-container chown reported errors (continuing)"

# ---- 3. Fix ownership on the HOST bind mount too. Some setups still race
# because the bind-mount inode metadata is what the kernel checks.
HOST_PG_DATA="$BASE_DIR/backend/supabase/docker/volumes/db/data"
if [ -d "$HOST_PG_DATA" ]; then
  log "Repairing host bind mount $HOST_PG_DATA -> ${PG_UID}:${PG_GID}"
  chown -R "${PG_UID}:${PG_GID}" "$HOST_PG_DATA" || warn "host chown failed"
  find "$HOST_PG_DATA" -type d -exec chmod 700 {} + 2>/dev/null || true
  find "$HOST_PG_DATA" -type f -exec chmod 600 {} + 2>/dev/null || true
else
  warn "Host bind mount not found at $HOST_PG_DATA (skipping host-side chown)"
fi

# ---- 4. Restart so postmaster reopens with correct perms.
log "Restarting $PG_CONTAINER so postmaster reopens with correct perms"
docker restart "$PG_CONTAINER" >/dev/null

wait_for_pg 90

# ---- 5. Smoke test with full visible output.
log "Smoke test: opening a fresh backend"
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  warn "POSTGRES_PASSWORD not set in env; cannot run authenticated smoke test."
  warn "Set it: export POSTGRES_PASSWORD=... or source $BASE_DIR/config.env"
  exit 2
fi

if pg_smoke_test; then
  ok "Postgres data dir repaired. New backends can connect."
  exit 0
fi

# Failure path — show real diagnostics so we can act, not guess.
warn "Smoke test still failing. Diagnostics:"
echo
echo "---- ownership inside container (top of /var/lib/postgresql/data) ----"
docker exec "$PG_CONTAINER" sh -c 'ls -lan /var/lib/postgresql/data | head -20' || true
echo
echo "---- ownership of global/pg_filenode.map ----"
docker exec "$PG_CONTAINER" sh -c 'ls -lan /var/lib/postgresql/data/global/pg_filenode.map 2>&1' || true
echo
echo "---- last 40 lines of $PG_CONTAINER logs ----"
docker logs --tail=40 "$PG_CONTAINER" 2>&1 || true
echo
echo "Next steps:"
echo "  - If files are still owned by uid != ${PG_UID}, re-run this script as root."
echo "  - If logs show 'database files are incompatible' or corruption,"
echo "    you must wipe and re-init: sudo bash deploy/wipe-postgres.sh --force"
echo "    then sudo bash install.sh --force-wipe --with-seed"
exit 2