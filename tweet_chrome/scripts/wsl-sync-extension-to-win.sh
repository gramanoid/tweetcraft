#!/usr/bin/env bash
set -euo pipefail

WIN_EXT_DIR="${WIN_EXT_DIR:-/mnt/c/tweetcraft_ext/extension}"

mkdir -p "$WIN_EXT_DIR"
rsync -a --delete ./extension/ "$WIN_EXT_DIR"/

echo "[WSL-SYNC] Extension synced to $WIN_EXT_DIR"