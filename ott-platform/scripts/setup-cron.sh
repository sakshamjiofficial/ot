#!/usr/bin/env bash
# Add backup and maintenance crons
# Run once: bash scripts/setup-cron.sh

CRONTAB_ENTRY="
# OTT Platform automated tasks
0 2 * * *    /opt/ott/scripts/backup-postgres.sh >> /var/log/ott-backup.log 2>&1
*/5 * * * *  /opt/ott/scripts/health-check.sh   >> /var/log/ott-health.log 2>&1
0 4 * * 0    docker image prune -f              >> /var/log/ott-prune.log  2>&1
"

(crontab -l 2>/dev/null; echo "$CRONTAB_ENTRY") | crontab -
echo "Crontab configured"
crontab -l
