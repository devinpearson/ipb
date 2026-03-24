#!/bin/bash
# Script to sign macOS binaries
# Usage: ./scripts/sign-macos.sh [identity]
# Example: ./scripts/sign-macos.sh "Developer ID Application: Devin Pearson (TEAM_ID)"

set -e

IDENTITY="${1:-}"
if [ -z "$IDENTITY" ]; then
  echo "Usage: $0 <signing-identity>"
  echo ""
  echo "Available signing identities:"
  security find-identity -v -p codesigning | grep "Developer ID Application" || echo "  No Developer ID Application certificates found"
  echo ""
  echo "Example:"
  echo "  $0 \"Developer ID Application: Your Name (TEAM_ID)\""
  exit 1
fi

echo "Signing macOS binaries with identity: $IDENTITY"
echo ""

# Sign x64 binary
if [ -f "dist/ipb-macos-x64" ]; then
  echo "Signing ipb-macos-x64..."
  codesign --sign "$IDENTITY" \
    --options runtime \
    --timestamp \
    --force \
    dist/ipb-macos-x64
  echo "✅ Signed ipb-macos-x64"
else
  echo "⚠️  dist/ipb-macos-x64 not found, skipping..."
fi

# Sign ARM64 binary
if [ -f "dist/ipb-macos-arm64" ]; then
  echo "Signing ipb-macos-arm64..."
  codesign --sign "$IDENTITY" \
    --options runtime \
    --timestamp \
    --force \
    dist/ipb-macos-arm64
  echo "✅ Signed ipb-macos-arm64"
else
  echo "⚠️  dist/ipb-macos-arm64 not found, skipping..."
fi

echo ""
echo "Verifying signatures..."
codesign --verify --verbose dist/ipb-macos-x64 2>/dev/null && echo "✅ ipb-macos-x64 signature verified" || echo "❌ ipb-macos-x64 signature verification failed"
codesign --verify --verbose dist/ipb-macos-arm64 2>/dev/null && echo "✅ ipb-macos-arm64 signature verified" || echo "❌ ipb-macos-arm64 signature verification failed"

echo ""
echo "Checking entitlements..."
codesign -d --entitlements - dist/ipb-macos-x64 2>/dev/null || echo "No entitlements found"
codesign -d --entitlements - dist/ipb-macos-arm64 2>/dev/null || echo "No entitlements found"



