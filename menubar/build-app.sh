#!/bin/bash

# Build AQI Indicator as a proper macOS .app bundle
# This enables notifications and proper app identity

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="AQI Indicator"
APP_BUNDLE="${APP_NAME}.app"
INSTALL_DIR="/Applications"

echo "🔨 Building ${APP_NAME}..."

# Create app bundle structure
rm -rf "${SCRIPT_DIR}/${APP_BUNDLE}"
mkdir -p "${SCRIPT_DIR}/${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${SCRIPT_DIR}/${APP_BUNDLE}/Contents/Resources"

# Copy Info.plist
cp "${SCRIPT_DIR}/Info.plist" "${SCRIPT_DIR}/${APP_BUNDLE}/Contents/"

# Compile Swift code
echo "📦 Compiling Swift..."
swiftc -O -o "${SCRIPT_DIR}/${APP_BUNDLE}/Contents/MacOS/AQIIndicator" \
    "${SCRIPT_DIR}/aqi-native-macos.swift"

# Remove quarantine attribute
xattr -cr "${SCRIPT_DIR}/${APP_BUNDLE}" 2>/dev/null || true

echo "✅ Built: ${SCRIPT_DIR}/${APP_BUNDLE}"

# Ask to install
read -p "Install to ${INSTALL_DIR}? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Kill existing instance
    pkill -f "AQIIndicator" 2>/dev/null || true

    # Remove old installation
    rm -rf "${INSTALL_DIR}/${APP_BUNDLE}"

    # Copy to Applications
    cp -r "${SCRIPT_DIR}/${APP_BUNDLE}" "${INSTALL_DIR}/"

    # Remove quarantine
    xattr -cr "${INSTALL_DIR}/${APP_BUNDLE}" 2>/dev/null || true

    echo "✅ Installed to ${INSTALL_DIR}/${APP_BUNDLE}"

    # Ask to launch
    read -p "Launch now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "${INSTALL_DIR}/${APP_BUNDLE}"
        echo "🚀 Launched! Check your menubar."
    fi
fi

echo ""
echo "📝 To add to Login Items (start on boot):"
echo "   System Settings → General → Login Items → Add '${APP_NAME}'"
