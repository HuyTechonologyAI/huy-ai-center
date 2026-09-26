#!/usr/bin/env bash
set -euo pipefail

# Post-promotion health check script
# Usage: ./post-cutover-health.sh <target_dir>

TARGET_DIR="${1:-/mnt/data1/Projects/HUY-AI-Center}"

# Guard /mnt/data2
if [[ "$TARGET_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 prohibited" >&2
  exit 1
fi

echo "Running health checks on $TARGET_DIR..."

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "FAIL: Target directory does not exist: $TARGET_DIR" >&2
  exit 1
fi

if [[ -f "$TARGET_DIR/package.json" ]]; then
  echo "PASS: package.json verified"
fi

echo "HEALTH_CHECK_RESULT: PASS"
