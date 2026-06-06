#!/usr/bin/env bash
# =============================================================
# PostgreSQL Automated Backup Script
# Add to crontab: 0 2 * * * /opt/ott/scripts/backup-postgres.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ott-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="ott_db_${TIMESTAMP}.sql.gz"

set -a; source /opt/ott/.env 2>/dev/null || source .env; set +a

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: $FILENAME"

# Dump and compress in one pipe
docker compose -f /opt/ott/docker-compose.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-password \
    --format=plain --no-owner --no-acl \
  | gzip -9 > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date)] Backup complete: $FILENAME ($SIZE)"

# Prune old backups
find "$BACKUP_DIR" -name "ott_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "ott_db_*.sql.gz" | wc -l)
echo "[$(date)] Retained $REMAINING backups (${RETENTION_DAYS}d policy)"
