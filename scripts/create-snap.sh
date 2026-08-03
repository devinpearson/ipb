#!/bin/bash
# Script to create a Snap package for IPB
# Usage: ./scripts/create-snap.sh [version]
# Example: ./scripts/create-snap.sh 0.8.3

set -euo pipefail

VERSION=${1:-$(node -p "require('./package.json').version")}
SNAPCRAFT_FILE="snap/snapcraft.yaml"

if [ ! -f "$SNAPCRAFT_FILE" ]; then
  echo "Error: Snapcraft config not found at $SNAPCRAFT_FILE"
  exit 1
fi

echo "Creating snap package for IPB v${VERSION}..."

if [ ! -f "dist/ipb-linux-x64" ]; then
  echo "Linux binary not found, building first..."
  npm run pkg:linux
fi

TMP_FILE=$(mktemp)
cp "$SNAPCRAFT_FILE" "$TMP_FILE"

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version: .*/version: '${VERSION}'/" "$TMP_FILE"
else
  sed -i "s/^version: .*/version: '${VERSION}'/" "$TMP_FILE"
fi

echo "Running snapcraft build..."
snapcraft --destructive-mode --project-dir "$(pwd)" --snapcraft-yaml "$TMP_FILE"

rm -f "$TMP_FILE"

echo ""
echo "Snap build complete."
echo "Install locally with:"
echo "  sudo snap install ipb_${VERSION}_amd64.snap --dangerous"
