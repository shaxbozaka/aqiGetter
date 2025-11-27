#!/bin/bash
#
# Tashkent AQI Indicator - Zero dependency installer
# macOS only - uses native Swift (built into macOS)
#

set -e

INSTALL_DIR="$HOME/.aqi-indicator"
REPO_URL="https://raw.githubusercontent.com/shaxbozaka/aqiGetter/main/menubar"
PLIST_PATH="$HOME/Library/LaunchAgents/cc.shaxbozaka.aqi-menubar.plist"

echo "================================"
echo "  Tashkent AQI Indicator"
echo "================================"
echo ""

if [[ "$(uname -s)" != "Darwin"* ]]; then
    echo "This installer is for macOS only."
    echo "Use the web dashboard: https://aqi.shaxbozaka.cc"
    exit 1
fi

echo "Downloading Swift source..."
mkdir -p "$INSTALL_DIR"
curl -sSL "$REPO_URL/aqi-native-macos.swift" -o "$INSTALL_DIR/aqi-menubar.swift"

echo "Compiling..."
swiftc -o "$INSTALL_DIR/aqi-menubar" "$INSTALL_DIR/aqi-menubar.swift"

echo "Setting up auto-start..."
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>cc.shaxbozaka.aqi-menubar</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/aqi-menubar</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Stop existing if running
launchctl stop cc.shaxbozaka.aqi-menubar 2>/dev/null || true
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Start
launchctl load "$PLIST_PATH"
launchctl start cc.shaxbozaka.aqi-menubar

echo ""
echo "Done! Check your menu bar for: 9° · 222 🟣"
echo ""
echo "Commands:"
echo "  Stop:      launchctl stop cc.shaxbozaka.aqi-menubar"
echo "  Start:     launchctl start cc.shaxbozaka.aqi-menubar"
echo "  Uninstall: launchctl unload $PLIST_PATH && rm -rf $INSTALL_DIR"
