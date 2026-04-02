#!/usr/bin/env bash
set -euo pipefail

POCKETBASE_DIR="${POCKETBASE_DIR:-/opt/pocketbase}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pocketbase}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -d "$POCKETBASE_DIR/pb_data" ]; then
  echo "pb_data not found in $POCKETBASE_DIR" >&2
  exit 1
fi

tar -czf "$BACKUP_DIR/pb_data-$TIMESTAMP.tar.gz" -C "$POCKETBASE_DIR" pb_data
find "$BACKUP_DIR" -type f -name 'pb_data-*.tar.gz' -mtime +14 -delete
