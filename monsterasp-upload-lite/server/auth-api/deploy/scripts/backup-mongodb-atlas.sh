#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "MONGODB_URI is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_DIR}/levelup-${STAMP}"

mkdir -p "${TARGET}"

mongodump --uri="${MONGODB_URI}" --out="${TARGET}"
tar -czf "${TARGET}.tar.gz" -C "${BACKUP_DIR}" "levelup-${STAMP}"
rm -rf "${TARGET}"

find "${BACKUP_DIR}" -name "levelup-*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup created: ${TARGET}.tar.gz"
