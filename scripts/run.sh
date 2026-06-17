#!/usr/bin/env bash
# Start education-frontend (port 3010)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3010}"

if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
    echo "Use the same AUTH_SECRET as platform-frontend."
  else
    echo "Missing .env.local — copy .env.example and configure."
    exit 1
  fi
fi

if [[ ! -d node_modules ]]; then
  echo "Installing npm dependencies..."
  npm install
fi

echo "Starting education-frontend on http://localhost:${PORT}"
exec npx next dev --port "$PORT"
