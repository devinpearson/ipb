#!/bin/bash
# Script to create a Snap package for IPB
# Usage: ./scripts/create-snap.sh [version]
# Example: ./scripts/create-snap.sh 0.8.3

set -euo pipefail

VERSION=${1:-$(node -p "require('./package.json').version")}
# Strip leading v if present (tags are often v0.9.2)
VERSION=${VERSION#v}
SNAPCRAFT_FILE="snap/snapcraft.yaml"

if [ ! -f "$SNAPCRAFT_FILE" ]; then
  echo "Error: Snapcraft config not found at $SNAPCRAFT_FILE"
  exit 1
fi

echo "Creating snap package for IPB v${VERSION}..."

if [ ! -f "dist/ipb-linux-x64" ]; then
  echo "Linux binary not found, building first..."
  npm run pkg:linux
  if [ -f "dist/investec-ipb-linux-x64" ]; then
    mv dist/investec-ipb-linux-x64 dist/ipb-linux-x64
  elif [ -f "dist/index" ]; then
    mv dist/index dist/ipb-linux-x64
  fi
  chmod +x dist/ipb-linux-x64
fi

# Update version in snapcraft.yaml, restore on exit
ORIGINAL_VERSION=$(sed -n "s/^version: ['\"]\\(.*\\)['\"]/\\1/p" "$SNAPCRAFT_FILE" | head -n 1)
restore_version() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^version: .*/version: '${ORIGINAL_VERSION}'/" "$SNAPCRAFT_FILE"
  else
    sed -i "s/^version: .*/version: '${ORIGINAL_VERSION}'/" "$SNAPCRAFT_FILE"
  fi
}
trap restore_version EXIT

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version: .*/version: '${VERSION}'/" "$SNAPCRAFT_FILE"
else
  sed -i "s/^version: .*/version: '${VERSION}'/" "$SNAPCRAFT_FILE"
fi

echo "Running snapcraft pack (destructive mode)..."
# Modern snapcraft requires `pack`; --snapcraft-yaml/--project-dir were removed.
snapcraft pack --destructive-mode

echo ""
echo "Snap build complete."
echo "Install locally with:"
echo "  sudo snap install investec-ipb_${VERSION}_amd64.snap --dangerous"
echo "Then run: investec-ipb --version"
