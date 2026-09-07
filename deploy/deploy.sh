#!/usr/bin/env bash
# Pull the latest main, rebuild, and publish the static output.
# Run on the VM from the repo root:  ./deploy/deploy.sh
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/gw-planner}"

cd "$(dirname "$0")/.."
echo "==> repo: $(pwd)"

git fetch --quiet origin
# deploy checkout is disposable — take exactly what's on origin/main
git reset --hard origin/main

echo "==> npm ci"
npm ci --no-audit --no-fund

echo "==> build"
npm run build

echo "==> publish -> $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete dist/ "$WEB_ROOT/"

echo "==> deployed $(git rev-parse --short HEAD) at $(date -Is)"
