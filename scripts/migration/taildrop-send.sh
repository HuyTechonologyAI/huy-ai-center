#!/usr/bin/env bash
set -euo pipefail

# Send migration package to Node01 via Taildrop
# Usage: ./taildrop-send.sh <package_path> [target_peer]

PACKAGE_PATH="${1:-}"
TARGET_PEER="${2:-huy-node01}"

if [[ -z "$PACKAGE_PATH" || ! -f "$PACKAGE_PATH" ]]; then
  echo "ERROR: Package path is invalid or missing: $PACKAGE_PATH" >&2
  exit 1
fi

echo "Checking Tailscale peer status for: $TARGET_PEER"
PEER_STATUS=$(tailscale status | grep -E "$TARGET_PEER" || true)

if [[ -z "$PEER_STATUS" ]]; then
  echo "ERROR: Peer $TARGET_PEER not found in tailscale status" >&2
  exit 1
fi

echo "Sending $PACKAGE_PATH to $TARGET_PEER via Taildrop..."
tailscale file cp "$PACKAGE_PATH" "${TARGET_PEER}:"
echo "Taildrop transfer initiated successfully."
