# Ubuntu Distribution Guide

This guide covers multiple methods to distribute the IPB CLI on Ubuntu.

## Distribution Methods

1. **.deb Package** - Native Debian/Ubuntu package format
2. **PPA (Personal Package Archive)** - Recommended for easy updates
3. **Snap Package** - Universal Linux package format
4. **AppImage** - Portable application format
5. **Direct Binary** - Simple download and install

## Method 1: .deb Package (Recommended for Distribution)

### Prerequisites

```bash
sudo apt-get install -y build-essential fakeroot dpkg-dev
```

### Creating a .deb Package

Use the provided script:

```bash
./scripts/create-deb.sh
```

Or manually:

```bash
# Build the binary first
npm run pkg:linux

# Create package structure
mkdir -p ipb_0.8.3/usr/local/bin
mkdir -p ipb_0.8.3/DEBIAN

# Copy binary
cp dist/investec-ipb-linux-x64 ipb_0.8.3/usr/local/bin/ipb
chmod +x ipb_0.8.3/usr/local/bin/ipb

# Create control file
cat > ipb_0.8.3/DEBIAN/control << EOF
Package: ipb
Version: 0.8.3
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Devin Pearson <your-email@example.com>
Description: CLI application to manage Investec Programmable Banking cards
 A command-line interface for managing and deploying code to Investec
 programmable banking cards. Supports local testing, code deployment,
 transaction management, and more.
Homepage: https://github.com/devinpearson/ipb
EOF

# Build package
dpkg-deb --build ipb_0.8.3

# Result: ipb_0.8.3.deb
```

### Installing .deb Package

```bash
sudo dpkg -i ipb_0.8.3.deb
# If dependencies are missing:
sudo apt-get install -f
```

## Method 2: PPA (Personal Package Archive) - Best for Updates

A PPA allows users to add your repository and install/update via `apt`.

### Prerequisites

1. **Launchpad Account** - Sign up at https://launchpad.net
2. **GPG Key** - For signing packages
3. **PPA Repository** - Create at https://launchpad.net/people/+new-ppa

### Setup Steps

#### 1. Generate GPG Key (if needed)

```bash
gpg --gen-key
# Use your email, name, and a passphrase
gpg --list-secret-keys
# Note the key ID (e.g., ABC12345)
```

#### 2. Export Public Key

```bash
gpg --armor --export YOUR_KEY_ID > public-key.txt
# Upload this to Launchpad: Settings → PPA Keys
```

#### 3. Create Package Source

```bash
# Install packaging tools
sudo apt-get install -y devscripts debhelper dh-make

# Create package directory
mkdir -p ~/ppa/ipb
cd ~/ppa/ipb

# Download source
git clone https://github.com/devinpearson/ipb.git
cd ipb

# Create debian packaging structure
dh_make --createorig --single --yes

# Edit debian/control, debian/changelog, etc.
```

#### 4. Build and Upload

```bash
# Build source package
debuild -S -sa

# Upload to PPA
dput ppa:your-launchpad-id/ipb ../ipb_0.8.3_source.changes
```

### User Installation

Users add your PPA and install:

```bash
sudo add-apt-repository ppa:your-launchpad-id/ipb
sudo apt update
sudo apt install ipb
```

## Method 3: Snap Package

Snaps are universal Linux packages that work across distributions.

### Prerequisites

```bash
sudo snap install snapcraft --classic
```

### Creating snapcraft.yaml

See `snap/snapcraft.yaml` for the configuration file.

### Building Snap

```bash
# Build the binary first
npm run pkg:linux

# Build snap
snapcraft

# Result: ipb_0.8.3_amd64.snap
```

### Installing Snap

```bash
sudo snap install ipb_0.8.3_amd64.snap --dangerous
```

### Publishing to Snap Store

1. Register at https://snapcraft.io
2. Upload snap: `snapcraft upload --release=stable ipb_0.8.3_amd64.snap`
3. Users install: `sudo snap install ipb`

## Method 4: AppImage

AppImage is a portable format that doesn't require installation.

### Creating AppImage

```bash
# Build binary
npm run pkg:linux

# Create AppDir structure
mkdir -p AppDir/usr/bin
cp dist/investec-ipb-linux-x64 AppDir/usr/bin/ipb
chmod +x AppDir/usr/bin/ipb

# Create AppImage (requires appimagetool)
# Download from: https://github.com/AppImage/AppImageKit/releases
./appimagetool AppDir ipb-0.8.3-x86_64.AppImage
```

### Using AppImage

```bash
chmod +x ipb-0.8.3-x86_64.AppImage
./ipb-0.8.3-x86_64.AppImage --version
```

## Method 5: Direct Binary Distribution

Simplest method - users download and install manually.

### Installation Steps for Users

```bash
# Download binary
wget https://github.com/devinpearson/ipb/releases/download/v0.8.3/investec-ipb-linux-x64

# Make executable
chmod +x investec-ipb-linux-x64

# Install to system
sudo mv investec-ipb-linux-x64 /usr/local/bin/ipb

# Verify
ipb --version
```

## Automated Build Scripts

### Creating .deb Package

```bash
./scripts/create-deb.sh [version] [arch]
# Example: ./scripts/create-deb.sh 0.8.3 amd64
```

### Creating Snap Package

```bash
./scripts/create-snap.sh [version]
# Example: ./scripts/create-snap.sh 0.8.3
```

## GitHub Actions Integration

Add to `.github/workflows/release.yml` to automatically build Ubuntu packages on release.

## Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **.deb** | Native, familiar, good integration | Manual distribution | Direct distribution |
| **PPA** | Easy updates, automatic | Launchpad setup required | Long-term distribution |
| **Snap** | Universal, auto-updates, sandboxed | Larger size, slower startup | Modern Ubuntu |
| **AppImage** | Portable, no installation | Manual updates | Single-user systems |
| **Binary** | Simple, fast | Manual installation | Quick testing |

## Recommended Approach

For Ubuntu distribution, I recommend:

1. **Primary**: PPA for easy `apt install ipb` experience
2. **Secondary**: .deb packages for direct downloads
3. **Optional**: Snap for Snap Store distribution

## Next Steps

1. Choose your distribution method(s)
2. Set up necessary accounts (Launchpad for PPA, Snap Store for Snap)
3. Create build scripts
4. Test on clean Ubuntu systems
5. Document installation instructions for users

