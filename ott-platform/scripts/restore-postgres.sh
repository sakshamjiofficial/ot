#!/usr/bin/env bash
# =============================================================
# PostgreSQL Restore Script
# Usage: ./restore-postgres.sh /var/backups/ott-postgres/ott_db_20240101_020000.sql.gz
# =============================================================
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup_file.sql.gz>}"
[ -f "$BACKUP_FILE" ] || { echo "ERROR: File not found: $BACKUP_FILE"; exit 1; }

set -a; source .env; set +a

echo "WARNING: This will DESTROY and recreate the database."
read -p "Type 'yes' to confirm: " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 0; }

echo "[$(date)] Dropping and recreating database..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres << SQL
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS "$POSTGRES_DB";
  CREATE DATABASE "$POSTGRES_DB" OWNER "$POSTGRES_USER";
SQL

echo "[$(date)] Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date)] Restore complete"
