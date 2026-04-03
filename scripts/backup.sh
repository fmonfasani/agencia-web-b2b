#!/bin/bash
# ========================================
# BACKUP SCRIPT - PostgreSQL + Qdrant + Redis
# ========================================
# Uso: ./scripts/backup.sh [backup_dir]
# Ejemplo: ./scripts/backup.sh ./backups

set -e

BACKUP_DIR=${1:-"./backups"}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_NAME="webshooks-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "=========================================="
echo "  BACKUP - Webshooks Platform"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo "Backup dir: $BACKUP_DIR"
echo ""

# Crear directorio de backup
mkdir -p "$BACKUP_PATH"

# Configuración de conexión
PG_HOST=${PG_HOST:-localhost}
PG_PORT=${PG_PORT:-5432}
PG_USER=${PG_USER:-postgres}
PG_DB=${PG_DB:-agencia_web_b2b}
PG_PASSWORD=${PG_PASSWORD:-}

QDRANT_URL=${QDRANT_URL:-http://localhost:6333}

# 1. Backup PostgreSQL
echo "[1/4] Backing up PostgreSQL..."
if [ -n "$PG_PASSWORD" ]; then
    PGPASSWORD="$PG_PASSWORD" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" | gzip > "$BACKUP_PATH/postgresql.sql.gz"
else
    pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" | gzip > "$BACKUP_PATH/postgresql.sql.gz"
fi

PG_DUMP_SIZE=$(du -h "$BACKUP_PATH/postgresql.sql.gz" | cut -f1)
echo "   ✓ PostgreSQL backup ($PG_DUMP_SIZE)"

# 2. Backup Qdrant (snapshot API)
echo "[2/4] Backing up Qdrant..."
curl -s -X POST "$QDRANT_URL/collections/./snapshots" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$BACKUP_NAME\"}" \
    > "$BACKUP_PATH/qdrant_snapshot.json" 2>/dev/null || true

# Esperar a que se cree el snapshot y descargarlo
sleep 2
SNAPSHOT_NAME=$(curl -s "$QDRANT_URL/collections/./snapshots" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$SNAPSHOT_NAME" ]; then
    curl -s "$QDRANT_URL/collections/./snapshots/$SNAPSHOT_NAME" -o "$BACKUP_PATH/qdrant_snapshot.tar" 2>/dev/null || true
    echo "   ✓ Qdrant snapshot"
else
    echo "   ⚠ Qdrant snapshot no disponible"
fi

# 3. Backup Redis (RDB dump)
echo "[3/4] Backing up Redis..."
CONTAINER_ID=$(docker ps --filter "name=agencia_redis" --format "{{.ID}}" 2>/dev/null | head -1)
if [ -n "$CONTAINER_ID" ]; then
    docker exec "$CONTAINER_ID" redis-cli -h redis -p 6379 --pass "${REDIS_PASSWORD:-}" save 2>/dev/null || true
    sleep 1
    docker cp "$CONTAINER_ID:/data/dump.rdb" "$BACKUP_PATH/redis_dump.rdb" 2>/dev/null || true
    if [ -f "$BACKUP_PATH/redis_dump.rdb" ]; then
        RDB_SIZE=$(du -h "$BACKUP_PATH/redis_dump.rdb" | cut -f1)
        echo "   ✓ Redis RDB ($RDB_SIZE)"
    else
        echo "   ⚠ Redis RDB no disponible"
    fi
else
    echo "   ⚠ Redis container not found (skip)"
fi

# 4. Crear archivo de metadata
echo "[4/4] Creating metadata..."
cat > "$BACKUP_PATH/metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "backup_name": "$BACKUP_NAME",
  "services": ["postgresql", "qdrant", "redis"],
  "postgresql": {
    "database": "$PG_DB",
    "size_bytes": $(stat -c%s "$BACKUP_PATH/postgresql.sql.gz" 2>/dev/null || echo 0)
  },
  "qdrant": {
    "snapshot_available": $([ -f "$BACKUP_PATH/qdrant_snapshot.tar" ] && echo "true" || echo "false")
  },
  "redis": {
    "dump_available": $([ -f "$BACKUP_PATH/redis_dump.rdb" ] && echo "true" || echo "false")
  }
}
EOF

# 5. Comprimir todo
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"  # eliminar directorio descomprimido

FINAL_SIZE=$(du -h "$BACKUP_PATH.tar.gz" | cut -f1)
echo "   ✓ Archive created ($FINAL_SIZE)"

# 6. Retención: mantener últimos 7 días
echo ""
echo "Cleaning old backups (>7 days)..."
find "$BACKUP_DIR" -name "webshooks-backup-*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true

# 7. Resumen final
echo ""
echo "=========================================="
echo "✅ BACKUP COMPLETADO"
echo "=========================================="
echo ""
echo "Archive: $BACKUP_PATH.tar.gz"
echo "Size: $FINAL_SIZE"
echo ""
echo "To restore:"
echo "  1) Extract: tar -xzf $BACKUP_PATH.tar.gz"
echo "  2) Restore PostgreSQL: gunzip -c $BACKUP_PATH/postgresql.sql.gz | psql $PG_DB"
echo "  3) Restore Qdrant: docker cp qdrant_snapshot.tar agencia_qdrant:/qdrant/storage/snapshots/"
echo "  4) Restore Redis: docker cp redis_dump.rdb agencia_redis:/data/dump.rdb"
echo ""
