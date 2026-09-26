#!/usr/bin/env bash
set -euo pipefail

# Rollback candidate promotion from backup
# Usage: ./rollback.sh <canonical_target> <backup_dir>

CANONICAL_TARGET="${1:-/mnt/data1/Projects/HUY-AI-Center}"
BACKUP_DIR="${2:-}"

# Guard /mnt/data2
if [[ "$CANONICAL_TARGET" =~ /mnt/data2.* || "$BACKUP_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 prohibited" >&2
  exit 1
fi

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: Valid backup directory must be provided: $BACKUP_DIR" >&2
  exit 1
fi

echo "Rolling back $CANONICAL_TARGET from $BACKUP_DIR..."
rsync -a --delete "$BACKUP_DIR/" "$CANONICAL_TARGET/"
echo "Rollback restored successfully."
