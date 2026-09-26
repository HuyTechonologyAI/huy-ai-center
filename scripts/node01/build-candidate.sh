#!/usr/bin/env bash
set -euo pipefail

# Build candidate directory from verified package
# Usage: ./build-candidate.sh <package_path> <candidate_dir>

PACKAGE_PATH="${1:-}"
CANDIDATE_DIR="${2:-/mnt/data1/Projects/HUY-AI-Center-candidate}"

# Guard /mnt/data2
if [[ "$CANDIDATE_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 target prohibited" >&2
  exit 1
fi

mkdir -p "$CANDIDATE_DIR"
echo "Extracting candidate into $CANDIDATE_DIR..."
tar -xzf "$PACKAGE_PATH" -C "$CANDIDATE_DIR"
echo "Candidate ready for pre-promotion health checks."
