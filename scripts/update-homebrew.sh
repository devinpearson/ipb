#!/bin/bash
# Script to update Homebrew formula with new version and checksums
# Usage: ./scripts/update-homebrew.sh <version>
# Example: ./scripts/update-homebrew.sh 0.8.3

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.8.3"
  exit 1
fi

FORMULA_FILE="Formula/ipb.rb"
if [ ! -f "$FORMULA_FILE" ]; then
  echo "Error: Formula file not found at $FORMULA_FILE"
  exit 1
fi

echo "Updating Homebrew formula to version $VERSION..."

# Update version in formula
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/version \"[^\"]*\"/version \"$VERSION\"/" "$FORMULA_FILE"
else
  # Linux
  sed -i "s/version \"[^\"]*\"/version \"$VERSION\"/" "$FORMULA_FILE"
fi

# Calculate checksums for all binaries
echo ""
echo "Calculating checksums..."
echo "Please ensure you have built all binaries first with: npm run pkg:all"
echo ""

BINARIES=(
  "dist/ipb-macos-x64"
  "dist/ipb-macos-arm64"
  "dist/ipb-linux-x64"
  "dist/ipb-linux-arm64"
  "dist/ipb-win-x64.exe"
)

for binary in "${BINARIES[@]}"; do
  if [ -f "$binary" ]; then
    checksum=$(shasum -a 256 "$binary" | cut -d' ' -f1)
    binary_name=$(basename "$binary")
    echo "  $binary_name: $checksum"
    
    # Update checksum in formula
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|url \".*$binary_name\"|url \"https://github.com/devinpearson/ipb/releases/download/v$VERSION/$binary_name\"|" "$FORMULA_FILE"
      #sed -i '' "s|sha256 \".*\" # $binary_name|sha256 \"$checksum\" # $binary_name|" "$FORMULA_FILE"
      sed -i '' "/url \".*$binary_name\"/,/sha256/s|sha256 \".*\"|sha256 \"$checksum\"|" "$FORMULA_FILE"
    else
      sed -i "s|url \".*$binary_name\"|url \"https://github.com/devinpearson/ipb/releases/download/v$VERSION/$binary_name\"|" "$FORMULA_FILE"
      sed -i "s|sha256 \".*\" # $binary_name|sha256 \"$checksum\" # $binary_name|" "$FORMULA_FILE"
    fi
  else
    echo "  Warning: $binary not found, skipping..."
  fi
done

echo ""
echo "Formula updated successfully!"
echo "Review the changes in $FORMULA_FILE before committing."

