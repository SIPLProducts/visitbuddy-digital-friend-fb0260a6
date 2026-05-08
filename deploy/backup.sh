#!/usr/bin/env bash
# Nightly backup: pg_dump + WhatsApp session + storage volumes
set -euo pipefail
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
source "$BASE_DIR/config.env"

BACKUP_DIR="$BASE_DIR/backups"
SUPA_DOCKER="$BASE_DIR/backend/supabase/docker"
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres" \
  --format=custom --compress=9 \
  --file "$BACKUP_DIR/db-$TS.dump"

tar -czf "$BACKUP_DIR/storage-$TS.tgz" -C "$SUPA_DOCKER/volumes" storage 2>/dev/null || true
tar -czf "$BACKUP_DIR/whatsapp-$TS.tgz" -C "$BASE_DIR/middleware/whatsapp-bridge-data" . 2>/dev/null || true

# Keep last 14 of each
for prefix in db storage whatsapp; do
  ls -1t "$BACKUP_DIR/${prefix}"-* 2>/dev/null | tail -n +15 | xargs -r rm -f
done
echo "[$(date)] Backup complete -> $BACKUP_DIR"
