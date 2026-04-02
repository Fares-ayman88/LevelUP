#!/usr/bin/env bash
set -euo pipefail

POCKETBASE_VERSION="${POCKETBASE_VERSION:-0.35.1}"
POCKETBASE_USER="${POCKETBASE_USER:-pocketbase}"
POCKETBASE_GROUP="${POCKETBASE_GROUP:-pocketbase}"
POCKETBASE_DIR="${POCKETBASE_DIR:-/opt/pocketbase}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

sudo apt-get update
sudo apt-get install -y curl unzip

sudo groupadd --system "$POCKETBASE_GROUP" 2>/dev/null || true
sudo useradd --system --gid "$POCKETBASE_GROUP" --home "$POCKETBASE_DIR" --shell /usr/sbin/nologin "$POCKETBASE_USER" 2>/dev/null || true

sudo mkdir -p "$POCKETBASE_DIR"
sudo mkdir -p /var/backups/pocketbase
sudo chown -R "$POCKETBASE_USER:$POCKETBASE_GROUP" "$POCKETBASE_DIR" /var/backups/pocketbase

curl -fsSL -o "$TMP_DIR/pocketbase.zip" "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip"
unzip -o "$TMP_DIR/pocketbase.zip" -d "$TMP_DIR"

sudo install -m 0755 "$TMP_DIR/pocketbase" "$POCKETBASE_DIR/pocketbase"
sudo chown "$POCKETBASE_USER:$POCKETBASE_GROUP" "$POCKETBASE_DIR/pocketbase"

echo "PocketBase installed at $POCKETBASE_DIR/pocketbase"
echo "Next steps:"
echo "1. Copy pb_data into $POCKETBASE_DIR/pb_data"
echo "2. Copy pb_migrations into $POCKETBASE_DIR/pb_migrations if needed"
echo "3. Install the systemd service from ubuntu/pocketbase.service"
