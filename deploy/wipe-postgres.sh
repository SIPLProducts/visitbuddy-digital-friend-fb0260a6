#!/usr/bin/env bash
# wipe-postgres.sh — destructive cleanup of any prior Postgres on the host so
# the supabase-db container can own port 5432 cleanly.
#
# Removes:
#   * Apt-installed system Postgres (postgresql-*)
#   * /etc/postgresql, /var/lib/postgresql, /var/log/postgresql
#   * Any process holding tcp:5432 or tcp:54322
#   * Existing supabase docker volumes (db / storage / deno-cache)
#   * The supabase-db / supabase-* containers themselves
#
# Usage:
#   sudo bash deploy/wipe-postgres.sh            # asks for confirmation
#   sudo bash deploy/wipe-postgres.sh --force    # no prompt (for install.sh)
set -euo pipefail

# CRLF self-heal
if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/lib/common.sh"

if [ "$EUID" -ne 0 ]; then die "Run as root: sudo bash $0 [--force]"; fi

FORCE=0
for a in "$@"; do
  case "$a" in
    --force|-f) FORCE=1 ;;
    -h|--help)  sed -n '2,15p' "$0"; exit 0 ;;
  esac
done

if [ "$FORCE" -ne 1 ]; then
  echo
  warn "This will PERMANENTLY DELETE any existing Postgres data on this host:"
  warn "  - /var/lib/postgresql"
  warn "  - all 'supabase_*' docker volumes"
  warn "  - all 'supabase-*' containers"
  read -r -p "Type 'yes' to continue: " ans
  [ "$ans" = "yes" ] || die "Aborted."
fi

log "[1/5] Stopping any compose stack at $BASE_DIR/backend/supabase/docker"
COMPOSE="$BASE_DIR/backend/supabase/docker/docker-compose.yml"
if [ -f "$COMPOSE" ]; then
  docker compose -f "$COMPOSE" down -v --remove-orphans 2>/dev/null || true
fi

log "[2/5] Removing supabase-* / wa-bridge containers"
for c in $(docker ps -aq --filter 'name=supabase-' 2>/dev/null) \
         $(docker ps -aq --filter 'name=wa-bridge' 2>/dev/null) \
         $(docker ps -aq --filter 'name=realtime-dev.supabase-realtime' 2>/dev/null); do
  docker rm -f "$c" >/dev/null 2>&1 || true
done

# Also remove ANY container that publishes host port 5432 / 54322 — old
# stacks, leftover pgadmin, stray pg containers, etc.
for port in 5432 54322; do
  for c in $(docker ps -aq --filter "publish=$port" 2>/dev/null); do
    warn "removing container $c (was publishing :$port)"
    docker rm -f "$c" >/dev/null 2>&1 || true
  done
done

log "[3/5] Stopping system Postgres (if installed) and purging packages"
systemctl stop  postgresql 2>/dev/null || true
systemctl disable postgresql 2>/dev/null || true
# Purge any apt-installed postgres but DON'T touch postgresql-client (psql tool).
if dpkg -l 2>/dev/null | awk '{print $2}' | grep -E '^postgresql(-[0-9]+)?$' >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get purge -y \
    'postgresql' 'postgresql-[0-9]*' 'postgresql-contrib' \
    'postgresql-common' 'postgresql-client-common' 2>/dev/null || true
  apt-get autoremove -y 2>/dev/null || true
fi
rm -rf /etc/postgresql /var/lib/postgresql /var/log/postgresql 2>/dev/null || true

log "[4/5] Killing any rogue process on tcp:5432 / tcp:54322"
for port in 5432 54322; do
  pids=$( (ss -lntp 2>/dev/null || true) | awk -v p=":$port" '$0~p{print}' \
          | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)
  if [ -n "${pids:-}" ]; then
    for pid in $pids; do
      warn "killing pid $pid (was on :$port)"
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
done

log "[5/5] Removing supabase docker volumes"
for v in $(docker volume ls -q 2>/dev/null | grep -E '^(supabase_|docker_)' || true); do
  docker volume rm -f "$v" >/dev/null 2>&1 || true
done
# Also wipe persisted bind-mount dirs if present
rm -rf "$BASE_DIR/backend/supabase/docker/volumes/db/data" 2>/dev/null || true
rm -rf "$BASE_DIR/backend/supabase/docker/volumes/storage" 2>/dev/null || true

# Final guard
if (ss -lnt 2>/dev/null | awk '{print $4}' | grep -qE ':5432$'); then
  warn "Port 5432 STILL in use after wipe."
  ss -lntp 2>/dev/null | awk '/:5432 /{print}' | sed 's/^/    /'
  warn "Docker containers publishing :5432 (if any):"
  docker ps --filter 'publish=5432' --format '    {{.ID}}  {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null || true
  die "Free port 5432 manually (stop the listed process/container), then re-run."
fi

ok "Host is clean. Port 5432 is free. You can now run install.sh / deploy.sh."