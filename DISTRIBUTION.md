# Distribution Guide

This document describes how to distribute the IPB CLI via various package managers and distribution methods.

## Overview

The IPB CLI can be distributed in several ways:

1. **npm** (current) - `npm install -g investec-ipb`
2. **Homebrew** (macOS/Linux) - `brew install ipb`
3. **Direct Downloads** - Standalone binaries for each platform
4. **Other Package Managers** - Scoop (Windows), apt/yum (Linux), etc.

## Building Binaries

We use **esbuild** to bundle the application and **@yao-pkg/pkg** to create standalone executables that don't require Node.js to be installed.

### Prerequisites

```bash
npm install
```

### Build Process

The build process consists of two steps:

1. **Bundle with esbuild**: Bundles all code and dependencies into a single CommonJS file
2. **Package with pkg**: Creates platform-specific executables from the bundled file

### Build Scripts

```bash
# Bundle only (creates dist-bundle/index.cjs)
npm run bundle

# Build for current platform only
npm run pkg:build

# Build for macOS (Intel + Apple Silicon)
npm run pkg:macos

# Build for Linux (x64 + ARM64)
npm run pkg:linux

# Build for Windows (x64)
npm run pkg:windows

# Build for all platforms
npm run pkg:all

# Clean dist and bundle directories
npm run pkg:clean
```

### Output

Binaries are generated in the `dist/` directory with the following naming convention:
- `investec-ipb-macos-x64` (macOS Intel)
- `investec-ipb-macos-arm64` (macOS Apple Silicon)
- `investec-ipb-linux-x64` (Linux x64)
- `investec-ipb-linux-arm64` (Linux ARM64)
- `investec-ipb-win-x64.exe` (Windows x64)

**Note:** The binary names use the package name (`investec-ipb`) from `package.json`.

### Build Architecture

The project uses **esbuild** to bundle ESM code into CommonJS format, which is then packaged with `@yao-pkg/pkg`. This approach:

1. **Bundles all dependencies** - All npm packages are bundled into a single file, eliminating ESM module resolution issues
2. **Converts to CommonJS** - The bundled output is CommonJS, which `pkg` handles reliably
3. **Includes assets** - Templates, assets, and instructions are copied to the bundle directory
4. **Produces working executables** - The final binaries work without Node.js installed

The bundling step resolves the ESM limitations that `pkg` has when packaging ESM code directly.

## Homebrew Distribution

Homebrew is the most popular package manager for macOS and Linux. There are two approaches:

### Option 1: Homebrew Tap (Recommended)

Create a separate repository for your Homebrew formula.

#### 1. Create a Homebrew Tap Repository

Create a new GitHub repository named `homebrew-ipb` (or `homebrew-tap` if you want multiple formulas).

#### 2. Create the Formula

Create `Formula/ipb.rb`:

```ruby
class Ipb < Formula
  desc "CLI application to manage programmable banking cards"
  homepage "https://github.com/devinpearson/ipb"
  url "https://github.com/devinpearson/ipb/releases/download/v#{version}/ipb-macos-arm64"
  sha256 "<SHA256_CHECKSUM>"
  version "<VERSION>"

  if Hardware::CPU.intel?
    url "https://github.com/devinpearson/ipb/releases/download/v#{version}/ipb-macos-x64"
    sha256 "<SHA256_CHECKSUM_X64>"
  end

  def install
    bin.install "ipb-macos-arm64" => "ipb"
    # For Intel builds, use:
    # bin.install "ipb-macos-x64" => "ipb"
  end

  test do
    system "#{bin}/ipb", "--version"
  end
end
```

#### 3. Multiple Architecture Support

For better multi-architecture support, use conditional logic:

```ruby
class Ipb < Formula
  desc "CLI application to manage programmable banking cards"
  homepage "https://github.com/devinpearson/ipb"
  version "0.8.3"

  if Hardware::CPU.arm?
    url "https://github.com/devinpearson/ipb/releases/download/v#{version}/ipb-macos-arm64"
    sha256 "<SHA256_CHECKSUM_ARM64>"
  else
    url "https://github.com/devinpearson/ipb/releases/download/v#{version}/ipb-macos-x64"
    sha256 "<SHA256_CHECKSUM_X64>"
  end

  def install
    if Hardware::CPU.arm?
      bin.install "ipb-macos-arm64" => "ipb"
    else
      bin.install "ipb-macos-x64" => "ipb"
    end
  end

  test do
    system "#{bin}/ipb", "--version"
  end
end
```

#### 4. Install from Tap

Users can install via:

```bash
brew tap devinpearson/ipb
brew install ipb
```

Or in one command:

```bash
brew install devinpearson/ipb/ipb
```

### Option 2: Homebrew Core (Advanced)

For broader distribution, you can submit to Homebrew core. This requires:
- Minimum 30 stars on GitHub
- Active maintenance
- Passing audit tests
- See [Homebrew Core Contributing Guide](https://docs.brew.sh/How-To-Open-a-Homebrew-PR)

## GitHub Releases

### Automated Releases

We use GitHub Actions to automatically build and release binaries when tags are pushed.

See `.github/workflows/release.yml` for the automated release workflow.

### Manual Release Process

1. **Build binaries for all platforms:**
   ```bash
   npm run pkg:all
   ```

2. **Calculate SHA256 checksums:**
   ```bash
   shasum -a 256 dist/investec-ipb-*
   ```

3. **Create a GitHub Release:**
   - Go to GitHub Releases
   - Click "Draft a new release"
   - Tag version: `v0.8.3`
   - Release title: `v0.8.3`
   - Upload all binaries from `dist/`
   - Add release notes

4. **Update Homebrew Formula:**
   - Update version in `Formula/ipb.rb`
   - Update SHA256 checksums
   - Update URL if needed

## Windows Distribution

### Scoop

Create a Scoop manifest in a separate repository or in the main repo under `scoop/ipb.json`:

```json
{
  "version": "0.8.3",
  "description": "CLI application to manage programmable banking cards",
  "homepage": "https://github.com/devinpearson/ipb",
  "license": "MIT",
  "url": "https://github.com/devinpearson/ipb/releases/download/v0.8.3/ipb-win-x64.exe",
  "hash": "SHA256_CHECKSUM",
  "bin": "ipb-win-x64.exe",
  "autoupdate": {
    "url": "https://github.com/devinpearson/ipb/releases/download/v$version/ipb-win-x64.exe"
  }
}
```

Install via:
```powershell
scoop bucket add ipb https://github.com/devinpearson/ipb-scoop
scoop install ipb
```

### Chocolatey

Create a Chocolatey package in a separate repository.

## Linux Distribution

### Ubuntu/Debian (.deb Package)

#### Quick Method (Using Script)

```bash
# Build binary first
npm run pkg:linux

# Create .deb package
./scripts/create-deb.sh 0.8.3 amd64

# Install
sudo dpkg -i ipb_0.8.3_amd64.deb
```

#### Manual Method

```bash
# Install required tools
sudo apt-get install fakeroot dpkg-dev

# Create package structure
mkdir -p ipb_0.8.3/usr/local/bin
cp dist/investec-ipb-linux-x64 ipb_0.8.3/usr/local/bin/ipb
chmod +x ipb_0.8.3/usr/local/bin/ipb

# Create control file
mkdir -p ipb_0.8.3/DEBIAN
cat > ipb_0.8.3/DEBIAN/control << EOF
Package: ipb
Version: 0.8.3
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Devin Pearson
Description: CLI application to manage programmable banking cards
EOF

# Build package
dpkg-deb --build ipb_0.8.3
```

### Ubuntu PPA (Personal Package Archive)

For easy distribution and automatic updates, set up a PPA on Launchpad:

1. **Create Launchpad account** at https://launchpad.net
2. **Create PPA** at https://launchpad.net/people/+new-ppa
3. **Upload packages** using `dput` (see `UBUNTU_DISTRIBUTION.md` for details)

Users can then install via:
```bash
sudo add-apt-repository ppa:your-launchpad-id/ipb
sudo apt update
sudo apt install ipb
```

### Snap Package

Build a universal Snap package:

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Build snap
snapcraft

# Install
sudo snap install ipb_0.8.3_amd64.snap --dangerous
```

See `snap/snapcraft.yaml` for configuration.

### AppImage

Create a portable AppImage:

```bash
# Build binary
npm run pkg:linux

# Create AppDir and package (requires appimagetool)
# See UBUNTU_DISTRIBUTION.md for full instructions
```

### Red Hat/CentOS (.rpm)

Create an `.rpm` package using `rpmbuild` or `fpm`.

For detailed Ubuntu distribution instructions, see [UBUNTU_DISTRIBUTION.md](./UBUNTU_DISTRIBUTION.md).

## Version Management

- Update version in `package.json`
- Update version in Homebrew formula
- Update version in other package manifests
- Tag releases with `v` prefix: `v0.8.3`
- GitHub releases should match tag names

## Testing Distributions

Before releasing:

1. **Test binaries locally:**
   ```bash
   ./dist/investec-ipb-macos-arm64 --version
   ./dist/investec-ipb-macos-arm64 --help
   ```

2. **Test Homebrew formula:**
   ```bash
   brew install --build-from-source Formula/ipb.rb
   brew test ipb
   ```

3. **Test on clean systems:**
   - Use Docker for Linux testing
   - Use VMs for cross-platform testing
   - Test on fresh installs without Node.js

## Troubleshooting

### Binary Not Found Error

If templates/assets are not found at runtime:
- Ensure `pkg.assets` in package.json includes all necessary files
- Check that paths are relative to the binary location
- Verify assets are included in the snapshot

### ESM Module Issues

The project uses esbuild to bundle ESM code into CommonJS before packaging, which resolves ESM compatibility issues. If you encounter module-related errors:

- Ensure `npm run bundle` completes successfully before packaging
- Check that `dist-bundle/index.cjs` exists and is valid
- Verify all dependencies are being bundled (check bundle size)
- The `--no-bytecode --public` flags are included in build scripts for maximum compatibility

### File Size

Binaries are large (~65-80MB) because they include Node.js runtime:
- This is expected and normal
- Users don't need Node.js installed separately
- Consider compression for downloads

## CI/CD Integration

See `.github/workflows/release.yml` for automated release workflow that:
- Builds binaries on push of version tags
- Creates GitHub releases
- Uploads binaries as release assets
- Can trigger formula updates (requires separate workflow)
