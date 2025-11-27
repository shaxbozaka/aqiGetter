# Tashkent AQI Menu Bar Indicator

Native macOS menu bar app showing real-time air quality for Tashkent.

**Zero dependencies** - uses only Swift (built into macOS).

## Install

```bash
curl -sSL https://raw.githubusercontent.com/shaxbozaka/aqiGetter/main/menubar/install.sh | bash
```

This will:
1. Download the Swift source
2. Compile it (Swift is built into macOS)
3. Set up auto-start on login
4. Run the indicator

Shows in menu bar: `9° · 222 🟣`

## Features

- Real-time AQI from [aqi.shaxbozaka.cc](https://aqi.shaxbozaka.cc)
- Temperature from Open-Meteo (free, no API key)
- Auto-updates every 60 seconds
- Starts automatically on login
- Click for details and dashboard link

## AQI Colors

| Color | AQI | Status |
|-------|-----|--------|
| 🟢 | 0-50 | Good |
| 🟡 | 51-100 | Moderate |
| 🟠 | 101-150 | Unhealthy for Sensitive |
| 🔴 | 151-200 | Unhealthy |
| 🟣 | 201-300 | Very Unhealthy |
| ⚫ | 301+ | Hazardous |

## Manual Commands

```bash
# Stop
launchctl stop cc.shaxbozaka.aqi-menubar

# Start
launchctl start cc.shaxbozaka.aqi-menubar

# Disable auto-start
launchctl unload ~/Library/LaunchAgents/cc.shaxbozaka.aqi-menubar.plist

# Uninstall
launchctl unload ~/Library/LaunchAgents/cc.shaxbozaka.aqi-menubar.plist
rm ~/Library/LaunchAgents/cc.shaxbozaka.aqi-menubar.plist
rm -rf ~/.aqi-indicator
```

## Linux / Windows

Use the web dashboard: https://aqi.shaxbozaka.cc
