#!/usr/bin/env bash
# repair-pg-perms.sh — fix PostgreSQL data directory ownership inside the
# supabase-db container after a stray host-side `chown -R` rewrote the bind
# mount. Symptom this fixes:
#
#   psql: FATAL: could not open file "global/pg_filenode.map": Permission denied
#
# Root cause: an earlier deploy.sh did `chown -R vmsadm $BASE_DIR`, which
# walked into backend/supabase/docker/volumes/db/data and changed PG files
# from uid 70 (postgres in container) to uid of vmsadm. The running
# postmaster keeps its open FDs so pg_isready still answers, but every NEW
# backend (psql connection) fails to open data files.
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

if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  die "Container '$PG_CONTAINER' is not running. Start the stack first (deploy.sh)."
fi

log "Repairing ownership of /var/lib/postgresql/data inside $PG_CONTAINER"
docker exec -u 0 "$PG_CONTAINER" sh -c '
  set -e
  # PG_UID/GID inside the supabase/postgres image is 70:70 (postgres).
  chown -R 70:70 /var/lib/postgresql/data 2>/dev/null || \
    chown -R postgres:postgres /var/lib/postgresql/data
  chmod 700 /var/lib/postgresql/data
'

log "Restarting $PG_CONTAINER so postmaster reopens with correct perms"
docker restart "$PG_CONTAINER" >/dev/null

wait_for_pg 90

log "Smoke test: opening a fresh backend"
if echo 'SELECT 1' | psql_exec >/dev/null 2>&1; then
  ok "Postgres data dir repaired. New backends can connect."
else
  warn "Smoke test still fails. Inspect: docker logs --tail=80 $PG_CONTAINER"
  exit 2
fi