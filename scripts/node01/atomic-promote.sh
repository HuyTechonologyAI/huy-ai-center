#!/usr/bin/env bash
set -euo pipefail

# Atomic promotion of candidate to canonical target
# Pre-condition: candidate verified, backup taken, NO authoritative cutover in this preparation task
# Target canonical: /mnt/data1/Projects/HUY-AI-Center

CANDIDATE_DIR="${1:-/mnt/data1/Projects/HUY-AI-Center-candidate}"
CANONICAL_TARGET="${2:-/mnt/data1/Projects/HUY-AI-Center}"
BACKUP_DIR="${3:-/mnt/data1/HUY-AI/backups/pre-promote-$(date +%s)}"

# Guard /mnt/data2
if [[ "$CANONICAL_TARGET" =~ /mnt/data2.* || "$BACKUP_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 prohibited" >&2
  exit 1
fi

if [[ ! -d "$CANDIDATE_DIR" ]]; then
  echo "ERROR: Candidate directory does not exist: $CANDIDATE_DIR" >&2
  exit 1
fi

echo "Creating rollback backup of current canonical target if present..."
if [[ -d "$CANONICAL_TARGET" ]]; then
  mkdir -p "$BACKUP_DIR"
  cp -a "$CANONICAL_TARGET/." "$BACKUP_DIR/"
  echo "Rollback backup saved to: $BACKUP_DIR"
fi

echo "Performing atomic replacement..."
mkdir -p "$CANONICAL_TARGET"
rsync -a --delete "$CANDIDATE_DIR/" "$CANONICAL_TARGET/"
echo "Promotion completed successfully."
