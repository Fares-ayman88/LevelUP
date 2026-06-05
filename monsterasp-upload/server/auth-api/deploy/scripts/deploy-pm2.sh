#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/levelup/web-react}"

cd "${APP_DIR}"
git pull --ff-only
npm ci --omit=dev
mkdir -p server/auth-api/logs server/auth-api/tmp/uploads

pm2 startOrReload server/auth-api/deploy/pm2/ecosystem.config.cjs --env production
pm2 save

echo "Deployed levelup-auth-api with PM2"
