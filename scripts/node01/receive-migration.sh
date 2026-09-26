#!/usr/bin/env bash
set -euo pipefail

# Receive incoming Taildrop package into Node01 staging area
# Target canonical operational root: /mnt/data1/HUY-AI/staging

INBOX_DIR="${1:-/var/lib/tailscale}"
STAGING_DIR="${2:-/mnt/data1/HUY-AI/staging}"

# Guard /mnt/data2
if [[ "$STAGING_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 target prohibited" >&2
  exit 1
fi

mkdir -p "$STAGING_DIR"

echo "Checking Taildrop inbox in $INBOX_DIR..."
tailscale file get "$STAGING_DIR" || true

echo "Packages in staging directory:"
ls -lh "$STAGING_DIR"
