#!/bin/bash
BACKUP_DIR="/var/www/agencia-web-b2b/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U agencia_user -h localhost agencia_web_b2b > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"

# Optional: Send to remote storage (uncomment and configure)
# scp $BACKUP_FILE.gz user@remote-server:/path/to/backups/