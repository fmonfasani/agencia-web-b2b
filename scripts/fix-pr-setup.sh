#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="origin"
REMOTE_URL="${1:-}"

if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "✅ El remote '$REMOTE_NAME' ya existe: $(git remote get-url "$REMOTE_NAME")"
else
  if [[ -z "$REMOTE_URL" && -n "${GITHUB_REPOSITORY:-}" ]]; then
    REMOTE_URL="git@github.com:${GITHUB_REPOSITORY}.git"
  fi

  if [[ -z "$REMOTE_URL" ]]; then
    echo "❌ No se pudo configurar '$REMOTE_NAME' automáticamente."
    echo "Pasá la URL del repo:"
    echo "  bash scripts/fix-pr-setup.sh git@github.com:<owner>/<repo>.git"
    exit 1
  fi

  git remote add "$REMOTE_NAME" "$REMOTE_URL"
  echo "✅ Remote '$REMOTE_NAME' configurado en $REMOTE_URL"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "⚠️  Estás en detached HEAD. Cambiá a una branch antes de pushear."
  exit 0
fi

echo "ℹ️  Para subir la branch y poder abrir PR:"
echo "  git push -u $REMOTE_NAME $CURRENT_BRANCH"
