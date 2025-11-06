#!/bin/bash
# Script to create a .deb package for Ubuntu/Debian
# Usage: ./scripts/create-deb.sh [version] [arch]
# Example: ./scripts/create-deb.sh 0.8.3 amd64

set -e

VERSION=${1:-"0.8.3"}
ARCH=${2:-"amd64"}

echo "Creating .deb package for IPB CLI v${VERSION} (${ARCH})..."

# Check if binary exists
if [ ! -f "dist/investec-ipb-linux-${ARCH}" ]; then
  echo "Error: Binary not found at dist/investec-ipb-linux-${ARCH}"
  echo "Building binary first..."
  npm run pkg:linux
fi

# Package name
PACKAGE_NAME="ipb_${VERSION}_${ARCH}"
PACKAGE_DIR="${PACKAGE_NAME}"

# Clean up any existing package directory
rm -rf "${PACKAGE_DIR}"

# Create package structure
mkdir -p "${PACKAGE_DIR}/usr/local/bin"
mkdir -p "${PACKAGE_DIR}/DEBIAN"

# Copy binary
BINARY_SOURCE="dist/investec-ipb-linux-${ARCH}"
if [ "$ARCH" = "arm64" ]; then
  BINARY_SOURCE="dist/investec-ipb-linux-arm64"
fi

cp "${BINARY_SOURCE}" "${PACKAGE_DIR}/usr/local/bin/ipb"
chmod +x "${PACKAGE_DIR}/usr/local/bin/ipb"

# Get package info from package.json
PACKAGE_DESC=$(node -p "require('./package.json').description")
PACKAGE_AUTHOR=$(node -p "require('./package.json').author")
PACKAGE_HOMEPAGE=$(node -p "require('./package.json').homepage || 'https://github.com/devinpearson/ipb'")

# Create control file
cat > "${PACKAGE_DIR}/DEBIAN/control" << EOF
Package: ipb
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Maintainer: ${PACKAGE_AUTHOR}
Description: ${PACKAGE_DESC}
 CLI application to manage Investec Programmable Banking cards.
 Supports local testing, code deployment, transaction management,
 and more. Can be installed via npm or as a standalone binary.
Homepage: ${PACKAGE_HOMEPAGE}
EOF

# Create postinst script (optional - for any post-installation steps)
cat > "${PACKAGE_DIR}/DEBIAN/postinst" << 'EOF'
#!/bin/bash
# Post-installation script
echo "IPB CLI installed successfully!"
echo "Run 'ipb --help' to get started."
EOF
chmod +x "${PACKAGE_DIR}/DEBIAN/postinst"

# Create prerm script (optional - for pre-removal steps)
cat > "${PACKAGE_DIR}/DEBIAN/prerm" << 'EOF'
#!/bin/bash
# Pre-removal script
# No cleanup needed
EOF
chmod +x "${PACKAGE_DIR}/DEBIAN/prerm"

# Build the package
echo "Building .deb package..."
dpkg-deb --build "${PACKAGE_DIR}"

# Clean up
rm -rf "${PACKAGE_DIR}"

echo ""
echo "✅ Package created: ${PACKAGE_NAME}.deb"
echo ""
echo "To install:"
echo "  sudo dpkg -i ${PACKAGE_NAME}.deb"
echo ""
echo "If dependencies are missing:"
echo "  sudo apt-get install -f"

