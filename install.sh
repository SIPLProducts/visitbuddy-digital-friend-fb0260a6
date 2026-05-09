#!/usr/bin/env bash
# install.sh — one-command bootstrap for VisiGuard self-hosted.
#
# Steps:
#   [0] wipe-postgres.sh         (asks for confirmation; --force-wipe to skip)
#   [1] deploy.sh                (docker, nginx, env, frontend build, compose up)
#   [2] apply-migrations.sh
#   [3] import-seed.sh           (auth bootstrap + reference + 30d tx + storage)
#   [4] deploy-edge-functions    (handled inside deploy.sh today)
#   [5] health-check.sh
#
# Usage:
#   sudo bash install.sh                       # interactive, asks before wipe
#   sudo bash install.sh --force-wipe          # skip wipe confirmation
#   sudo bash install.sh --with-seed           # also import seed data
#   sudo bash install.sh --storage tgz=/path   # also restore storage tarball
set -euo pipefail

# CRLF self-heal for THIS file and all deploy/*.sh, deploy/lib/*.sh
if grep -q $'\r' "$0" 2>/dev/null; then
  HERE="$(cd "$(dirname "$0")" && pwd)"
  find "$HERE/deploy" -type f \( -name '*.sh' -o -name '*.tpl' -o -name '*.sql' \) \
    -exec sed -i 's/\r$//' {} + 2>/dev/null || true
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash $0 [...]"; exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/deploy/lib/common.sh"

FORCE_WIPE=0
WITH_SEED=0
STORAGE_TGZ=""
SKIP_WIPE=0
for arg in "$@"; do
  case "$arg" in
    --force-wipe) FORCE_WIPE=1 ;;
    --skip-wipe)  SKIP_WIPE=1 ;;
    --with-seed)  WITH_SEED=1 ;;
    --storage=*)  STORAGE_TGZ="${arg#*=}" ;;
    -h|--help)    sed -n '2,18p' "$0"; exit 0 ;;
  esac
done

echo
echo "============================================================"
echo " VisiGuard self-hosted INSTALLER"
echo "============================================================"

# [0] wipe
if [ "$SKIP_WIPE" -eq 1 ]; then
  warn "Skipping wipe-postgres step (--skip-wipe)"
else
  log "[0/5] Wiping any prior Postgres install (frees port 5432)"
  if [ "$FORCE_WIPE" -eq 1 ]; then
    bash "$HERE/deploy/wipe-postgres.sh" --force
  else
    bash "$HERE/deploy/wipe-postgres.sh"
  fi
fi

# [1] deploy.sh
log "[1/5] Running deploy.sh"
SKIP_SCHEMA=1 bash "$HERE/deploy/deploy.sh"

# Reload config the deploy step wrote
load_config "$HERE/deploy" || die "config.env not produced by deploy.sh"

# [2] migrations
log "[2/5] Applying schema migrations"
bash "$HERE/deploy/apply-migrations.sh"

# [3] seed
if [ "$WITH_SEED" -eq 1 ]; then
  log "[3/5] Importing seed data"
  if [ -n "$STORAGE_TGZ" ]; then
    bash "$HERE/deploy/import-seed.sh" "$STORAGE_TGZ"
  else
    bash "$HERE/deploy/import-seed.sh"
  fi
else
  log "[3/5] Skipping seed (--with-seed not set). Bootstrapping admin only via auth bootstrap SQL."
  if [ -f "$HERE/deploy/seed/00_auth_users_bootstrap.sql" ]; then
    psql_exec < "$HERE/deploy/seed/00_auth_users_bootstrap.sql" || \
      warn "Auth bootstrap SQL failed — admin user may already exist."
  fi
fi

# [4] edge functions are deployed by deploy.sh; nothing to do here.
log "[4/5] Edge functions deployed during step [1]."

# [5] health
log "[5/5] Health check"
if bash "$HERE/deploy/health-check.sh"; then
  echo
  ok "INSTALL COMPLETE."
  echo "   App URL:      http://${PUBLIC_IP:-<ip>}"
  echo "   Supabase API: http://${PUBLIC_IP:-<ip>}:${API_PORT:-8000}"
  echo "   Postgres:     127.0.0.1:${POSTGRES_HOST_PORT:-5432}  (user postgres / pwd in config.env)"
  echo "   Admin login:  ${ADMIN_EMAIL:-bala@sharviinfotech.com} / ${ADMIN_PASSWORD:-Sharvi@123}"
else
  die "Health check failed. See /var/log/visiguard/ for per-step logs."
fi