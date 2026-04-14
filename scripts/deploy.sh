#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "[deploy] Missing .env file. Copy .env.example to .env first."
  exit 1
fi

echo "[deploy] Building and starting production stack..."
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo "[deploy] Waiting for health endpoint..."
for i in {1..30}; do
  if curl -fsS "http://localhost:3001/api/health" >/dev/null; then
    echo "[deploy] ✅ healthcheck OK"
    exit 0
  fi
  sleep 2
  echo "[deploy] waiting ($i/30)..."
done

echo "[deploy] ❌ healthcheck failed"
exit 1
