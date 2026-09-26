#!/usr/bin/env bash
set -euo pipefail

# Build Node01 deterministic migration package
# Usage: ./build-node01-package.sh <source_dir> <output_dir> [package_name]

SOURCE_DIR="${1:-.}"
OUTPUT_DIR="${2:-./artifacts/migration}"
PKG_NAME="${3:-node01-migration-payload}"

# Guards
if [[ "$OUTPUT_DIR" =~ /mnt/data2.* ]]; then
  echo "ERROR: SECURITY_VIOLATION: R4_PROTECTED_DATA2 target prohibited" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
ARCHIVE_PATH="$OUTPUT_DIR/${PKG_NAME}.tar.gz"
MANIFEST_PATH="$OUTPUT_DIR/${PKG_NAME}.manifest.json"

echo "Building deterministic tar.gz: $ARCHIVE_PATH"
tar --exclude='.git' --exclude='node_modules' --exclude='.cache' -czf "$ARCHIVE_PATH" -C "$SOURCE_DIR" .

SHA256=$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')
echo "$SHA256" > "$OUTPUT_DIR/${PKG_NAME}.sha256"

cat <<EOF > "$MANIFEST_PATH"
{
  "package_name": "${PKG_NAME}",
  "archive_file": "${PKG_NAME}.tar.gz",
  "sha256": "${SHA256}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source_dir": "${SOURCE_DIR}"
}
EOF

echo "Package created successfully: $ARCHIVE_PATH (SHA256: $SHA256)"
