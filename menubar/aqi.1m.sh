#!/bin/bash
# <xbar.title>Tashkent AQI + Weather</xbar.title>
# <xbar.version>v2.0</xbar.version>
# <xbar.author>shaxbozaka</xbar.author>
# <xbar.desc>Shows AQI and real-time temperature for Tashkent</xbar.desc>
# <xbar.image>https://aqi.shaxbozaka.cc/favicon.ico</xbar.image>
# <xbar.dependencies>curl,jq</xbar.dependencies>

# This script works with xbar (https://xbarapp.com) or SwiftBar
# AQI from your server, temperature from Open-Meteo (free, no key needed)

AQI_URL="https://aqi.shaxbozaka.cc/api/aqi/current"
# Tashkent coordinates: 41.2995, 69.2401
WEATHER_URL="https://api.open-meteo.com/v1/forecast?latitude=41.2995&longitude=69.2401&current=temperature_2m,relative_humidity_2m"

JQ=$(which jq)

# Fetch AQI from your server
aqi_response=$(curl -s "$AQI_URL" 2>/dev/null)
aqi=$(echo "$aqi_response" | $JQ -r '.data.aqi_us // empty' 2>/dev/null)

# Fetch real-time weather from Open-Meteo (free, unlimited)
weather_response=$(curl -s "$WEATHER_URL" 2>/dev/null)
temp=$(echo "$weather_response" | $JQ -r '.current.temperature_2m // empty' 2>/dev/null)
humidity=$(echo "$weather_response" | $JQ -r '.current.relative_humidity_2m // empty' 2>/dev/null)

# Fallback to AQI server temp if Open-Meteo fails
if [ -z "$temp" ]; then
    temp=$(echo "$aqi_response" | $JQ -r '.data.temperature_celsius // empty' 2>/dev/null)
fi

if [ -z "$aqi" ]; then
    echo "⚠️ --°"
    echo "---"
    echo "Unable to fetch AQI"
    exit 0
fi

# Round temperature
temp_rounded=$(printf "%.0f" "$temp" 2>/dev/null || echo "$temp")

# Get emoji and status based on AQI
if [ "$aqi" -le 50 ]; then
    emoji="🟢"
    status="Good"
    color="#22c55e"
elif [ "$aqi" -le 100 ]; then
    emoji="🟡"
    status="Moderate"
    color="#eab308"
elif [ "$aqi" -le 150 ]; then
    emoji="🟠"
    status="Unhealthy for Sensitive"
    color="#f97316"
elif [ "$aqi" -le 200 ]; then
    emoji="🔴"
    status="Unhealthy"
    color="#ef4444"
elif [ "$aqi" -le 300 ]; then
    emoji="🟣"
    status="Very Unhealthy"
    color="#a855f7"
else
    emoji="⚫"
    status="Hazardous"
    color="#881337"
fi

# Menu bar title - clean and minimal
echo "${temp_rounded}° · $aqi $emoji"

# Dropdown menu
echo "---"
echo "Tashkent Air Quality"
echo "$status | color=$color"
echo "---"
echo "🌡️ Temperature: ${temp}°C"
echo "💧 Humidity: ${humidity}%"
echo "---"
echo "Open Dashboard | href=https://aqi.shaxbozaka.cc"
echo "Refresh | refresh=true"
