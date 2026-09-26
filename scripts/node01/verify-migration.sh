#!/usr/bin/env bash
set -euo pipefail

# Verify staged migration package SHA256 against expected manifest
# Usage: ./verify-migration.sh <package_path> <expected_sha256>

PACKAGE_PATH="${1:-}"
EXPECTED_SHA256="${2:-}"

if [[ -z "$PACKAGE_PATH" || ! -f "$PACKAGE_PATH" ]]; then
  echo "ERROR: Package file not found: $PACKAGE_PATH" >&2
  exit 1
fi

ACTUAL_SHA256=$(sha256sum "$PACKAGE_PATH" | awk '{print $1}')

if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "ERROR: SECURITY_VIOLATION: CHECKSUM_MISMATCH - expected $EXPECTED_SHA256, got $ACTUAL_SHA256" >&2
  exit 2
fi

echo "VERIFICATION_SUCCESS: Package hash matches expected SHA256 ($ACTUAL_SHA256)"
