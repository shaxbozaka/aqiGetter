# Tashkent AQI Menu Bar Indicator

A macOS menu bar indicator that shows real-time air quality and temperature for Tashkent.

## Preview

Shows in your menu bar: `11° | 202 🟣`

- Temperature (from Open-Meteo, updates every minute)
- AQI value with color-coded emoji

## Installation

### Option 1: xbar (Recommended)

1. Install [xbar](https://xbarapp.com/) or use Homebrew:
   ```bash
   brew install --cask xbar
   ```

2. Install jq (required dependency):
   ```bash
   brew install jq
   ```

3. Copy the script to xbar plugins folder:
   ```bash
   cp aqi.1m.sh ~/Library/Application\ Support/xbar/plugins/
   chmod +x ~/Library/Application\ Support/xbar/plugins/aqi.1m.sh
   ```

4. Open xbar - the indicator will appear in your menu bar

5. (Optional) Add xbar to Login Items to start automatically:
   - System Settings → General → Login Items → Add xbar

### Option 2: SwiftBar

Same steps as xbar, but use SwiftBar's plugin folder instead.

### Option 3: Python (rumps)

For a native macOS app experience:

1. Install dependencies:
   ```bash
   pip3 install rumps requests
   ```

2. Run:
   ```bash
   python3 aqi-menubar.py
   ```

## AQI Color Guide

| Emoji | AQI Range | Status |
|-------|-----------|--------|
| 🟢 | 0-50 | Good |
| 🟡 | 51-100 | Moderate |
| 🟠 | 101-150 | Unhealthy for Sensitive Groups |
| 🔴 | 151-200 | Unhealthy |
| 🟣 | 201-300 | Very Unhealthy |
| ⚫ | 301+ | Hazardous |

## Data Sources

- **AQI**: [aqi.shaxbozaka.cc](https://aqi.shaxbozaka.cc) (IQAir data)
- **Temperature**: [Open-Meteo](https://open-meteo.com/) (free, no API key needed)

## Dropdown Menu

Click the indicator to see:
- Current air quality status
- Detailed temperature
- Humidity percentage
- Link to full dashboard
- Manual refresh option

## Customization

Edit `aqi.1m.sh` to change:
- Update frequency: rename file (e.g., `aqi.5m.sh` for 5 minutes)
- Location: change coordinates in `WEATHER_URL`
- API endpoint: change `AQI_URL` for different server
