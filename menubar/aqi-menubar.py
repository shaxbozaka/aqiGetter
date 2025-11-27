#!/usr/bin/env python3
"""
Tashkent AQI Menu Bar Indicator for macOS
Requires: pip3 install rumps requests

Run with: python3 aqi-menubar.py
To run at startup, add to Login Items in System Preferences
"""

import rumps
import requests
import threading
import time

API_URL = "https://aqi.shaxbozaka.cc/api/aqi/current"

class AQIMenuBar(rumps.App):
    def __init__(self):
        super(AQIMenuBar, self).__init__("AQI: --")
        self.menu = [
            rumps.MenuItem("Loading...", callback=None),
            None,  # Separator
            rumps.MenuItem("Refresh", callback=self.refresh),
            rumps.MenuItem("Open Dashboard", callback=self.open_dashboard),
        ]
        self.aqi_info = self.menu["Loading..."]

        # Start update thread
        self.start_updates()

    def get_aqi_emoji(self, aqi):
        if aqi <= 50:
            return "🟢"
        elif aqi <= 100:
            return "🟡"
        elif aqi <= 150:
            return "🟠"
        elif aqi <= 200:
            return "🔴"
        elif aqi <= 300:
            return "🟣"
        else:
            return "⚫"

    def get_aqi_status(self, aqi):
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Moderate"
        elif aqi <= 150:
            return "Unhealthy for Sensitive"
        elif aqi <= 200:
            return "Unhealthy"
        elif aqi <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"

    def fetch_aqi(self):
        try:
            response = requests.get(API_URL, timeout=10)
            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"]
        except Exception as e:
            print(f"Error fetching AQI: {e}")
        return None

    def update_display(self, _=None):
        data = self.fetch_aqi()
        if data:
            aqi = data.get("aqi_us", 0)
            temp = data.get("temperature_celsius", "--")
            humidity = data.get("humidity", "--")

            emoji = self.get_aqi_emoji(aqi)
            status = self.get_aqi_status(aqi)

            # Update menu bar title
            self.title = f"{emoji} {aqi}"

            # Update menu item with details
            self.aqi_info.title = f"{status} | {temp}°C | {humidity}% humidity"
        else:
            self.title = "AQI: ⚠️"
            self.aqi_info.title = "Unable to fetch data"

    def start_updates(self):
        def update_loop():
            while True:
                self.update_display()
                time.sleep(300)  # Update every 5 minutes

        thread = threading.Thread(target=update_loop, daemon=True)
        thread.start()

    @rumps.clicked("Refresh")
    def refresh(self, _):
        self.title = "AQI: ..."
        threading.Thread(target=self.update_display, daemon=True).start()

    @rumps.clicked("Open Dashboard")
    def open_dashboard(self, _):
        import webbrowser
        webbrowser.open("https://aqi.shaxbozaka.cc")

if __name__ == "__main__":
    AQIMenuBar().run()
