#!/usr/bin/env swift
/*
 * Tashkent AQI Menu Bar Indicator
 * Native macOS - No dependencies!
 *
 * Features:
 * - Real-time AQI with trend arrow (↑/↓)
 * - Temperature and wind speed
 * - Health recommendations
 * - Copy AQI to clipboard
 * - Last updated time
 * - Auto-update checker
 *
 * Compile: swiftc -o aqi-menubar aqi-native-macos.swift
 * Run: ./aqi-menubar
 */

import Cocoa

// Note: Notifications removed - requires app bundle which command-line Swift doesn't have
// To add notifications, compile as proper .app bundle with Info.plist

class AQIMenuBar: NSObject {
    var statusItem: NSStatusItem!
    var timer: Timer?
    var updateCheckTimer: Timer?
    var previousAQI: Int = 0
    var lastUpdateTime: Date?
    var currentAQI: Int = 0
    var currentTemp: Double = 0
    var currentWind: Double = 0
    var currentHumidity: Int = 0
    var updateAvailable: Bool = false

    // App version - update this when releasing new versions
    let currentVersion = "1.2.0"
    let githubRepo = "shaxbozaka/aqiGetter"

    // Notification thresholds
    let thresholds = [50, 100, 150, 200, 300]

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        updateData()

        // Update every 30 seconds for faster response to admin changes
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
            self.updateData()
        }

        // Check for updates every hour
        checkForUpdates()
        updateCheckTimer = Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { _ in
            self.checkForUpdates()
        }

        app.run()
    }

    func checkForUpdates() {
        guard let url = URL(string: "https://api.github.com/repos/\(githubRepo)/releases/latest") else {
            return
        }

        var request = URLRequest(url: url)
        request.setValue("application/vnd.github.v3+json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let tagName = json["tag_name"] as? String else {
                return
            }

            let latestVersion = tagName.replacingOccurrences(of: "v", with: "")

            DispatchQueue.main.async {
                if self.isNewerVersion(latest: latestVersion, current: self.currentVersion) {
                    self.updateAvailable = true
                    self.logNotification(
                        title: "AQI App Update Available",
                        body: "Version \(latestVersion) is available. Click to download."
                    )
                    // Rebuild menu to show update option
                    self.buildMenu(aqi: self.currentAQI, temp: self.currentTemp, wind: self.currentWind, humidity: self.currentHumidity, status: self.getStatus(aqi: self.currentAQI))
                }
            }
        }.resume()
    }

    func isNewerVersion(latest: String, current: String) -> Bool {
        let latestParts = latest.split(separator: ".").compactMap { Int($0) }
        let currentParts = current.split(separator: ".").compactMap { Int($0) }

        for i in 0..<max(latestParts.count, currentParts.count) {
            let latestPart = i < latestParts.count ? latestParts[i] : 0
            let currentPart = i < currentParts.count ? currentParts[i] : 0

            if latestPart > currentPart { return true }
            if latestPart < currentPart { return false }
        }
        return false
    }


    func updateData() {
        guard let aqiUrl = URL(string: "https://aqi.shaxbozaka.cc/api/aqi/indicator") else {
            return
        }

        // Use async URLSession to avoid blocking main thread
        URLSession.shared.dataTask(with: aqiUrl) { data, response, error in
            var aqi: Int = 0
            var temp: Double = 0
            var wind: Double = 0
            var humidity: Int = 0
            var status = "Loading..."

            // Fetch AQI data (includes temperature, wind, humidity)
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let dataObj = json["data"] as? [String: Any] {

                // Handle AQI as Int or String
                if let aqiValue = dataObj["aqi_us"] as? Int {
                    aqi = aqiValue
                    status = self.getStatus(aqi: aqi)
                } else if let aqiStr = dataObj["aqi_us"] as? String, let aqiValue = Int(aqiStr) {
                    aqi = aqiValue
                    status = self.getStatus(aqi: aqi)
                } else if let aqiStr = dataObj["aqi_us"] as? String {
                    // Custom string value - display as-is
                    aqi = -1  // Flag for custom string
                    status = aqiStr
                }

                // Handle temperature as String or Double
                if let tempValue = dataObj["temperature_celsius"] as? String,
                   let tempDouble = Double(tempValue) {
                    temp = tempDouble
                } else if let tempValue = dataObj["temperature_celsius"] as? Double {
                    temp = tempValue
                } else if let tempValue = dataObj["temperature_celsius"] as? Int {
                    temp = Double(tempValue)
                }

                // Handle wind as String or Double
                if let windValue = dataObj["wind_speed_ms"] as? String,
                   let windDouble = Double(windValue) {
                    wind = windDouble * 3.6 // Convert to km/h
                } else if let windValue = dataObj["wind_speed_ms"] as? Double {
                    wind = windValue * 3.6
                }

                // Handle humidity as Int or String
                if let humidityValue = dataObj["humidity"] as? Int {
                    humidity = humidityValue
                } else if let humidityStr = dataObj["humidity"] as? String, let humidityValue = Int(humidityStr) {
                    humidity = humidityValue
                }
            }

            // Check for threshold crossing and send notification
            if self.previousAQI > 0 {
                self.checkThresholdCrossing(oldAQI: self.previousAQI, newAQI: aqi)
            }

            // Store current values
            let oldAQI = self.previousAQI
            self.previousAQI = aqi
            self.currentAQI = aqi
            self.currentTemp = temp
            self.currentWind = wind
            self.currentHumidity = humidity
            self.lastUpdateTime = Date()

            // Update menu bar on main thread
            DispatchQueue.main.async {
                let emoji = self.getEmoji(aqi: aqi)
                let trend = self.getTrendArrow(oldAQI: oldAQI, newAQI: aqi)

                // Display custom string or number
                let aqiDisplay = (aqi == -1) ? status : "\(aqi)\(trend)"
                self.statusItem.button?.title = "\(Int(temp))° · \(aqiDisplay) \(emoji)"

                // Create menu
                self.buildMenu(aqi: aqi, temp: temp, wind: wind, humidity: humidity, status: status)
            }
        }.resume()
    }

    func getTrendArrow(oldAQI: Int, newAQI: Int) -> String {
        if oldAQI == 0 { return "" }
        let diff = newAQI - oldAQI
        if diff > 5 { return "↑" }      // Getting worse
        if diff < -5 { return "↓" }     // Getting better
        return ""                        // Stable
    }

    func checkThresholdCrossing(oldAQI: Int, newAQI: Int) {
        for threshold in thresholds {
            // Crossed up (getting worse)
            if oldAQI < threshold && newAQI >= threshold {
                logNotification(
                    title: "AQI Alert: \(getStatus(aqi: newAQI))",
                    body: "Air quality worsened to \(newAQI). \(getRecommendation(aqi: newAQI))"
                )
                return
            }
            // Crossed down (getting better)
            if oldAQI >= threshold && newAQI < threshold {
                logNotification(
                    title: "AQI Improved: \(getStatus(aqi: newAQI))",
                    body: "Air quality improved to \(newAQI). \(getRecommendation(aqi: newAQI))"
                )
                return
            }
        }
    }

    func logNotification(title: String, body: String) {
        // Log to console since notifications require app bundle
        print("📢 \(title): \(body)")
    }

    func buildMenu(aqi: Int, temp: Double, wind: Double, humidity: Int, status: String) {
        let menu = NSMenu()

        // Header
        let titleItem = NSMenuItem(title: "Tashkent Air Quality", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)

        // Status with emoji
        let statusItem = NSMenuItem(title: "\(getEmoji(aqi: aqi)) \(status)", action: nil, keyEquivalent: "")
        statusItem.isEnabled = false
        menu.addItem(statusItem)

        menu.addItem(NSMenuItem.separator())

        // Weather info
        let tempItem = NSMenuItem(title: "🌡️ Temperature: \(String(format: "%.1f", temp))°C", action: nil, keyEquivalent: "")
        tempItem.isEnabled = false
        menu.addItem(tempItem)

        let humidityItem = NSMenuItem(title: "💧 Humidity: \(humidity)%", action: nil, keyEquivalent: "")
        humidityItem.isEnabled = false
        menu.addItem(humidityItem)

        let windItem = NSMenuItem(title: "💨 Wind: \(String(format: "%.1f", wind)) km/h", action: nil, keyEquivalent: "")
        windItem.isEnabled = false
        menu.addItem(windItem)

        menu.addItem(NSMenuItem.separator())

        // Health recommendation
        let recommendation = getRecommendation(aqi: aqi)
        let recItem = NSMenuItem(title: "💡 \(recommendation)", action: nil, keyEquivalent: "")
        recItem.isEnabled = false
        menu.addItem(recItem)

        menu.addItem(NSMenuItem.separator())

        // Last updated
        if let updateTime = lastUpdateTime {
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            let timeStr = formatter.string(from: updateTime)
            let updateItem = NSMenuItem(title: "Updated: \(timeStr)", action: nil, keyEquivalent: "")
            updateItem.isEnabled = false
            menu.addItem(updateItem)
        }

        menu.addItem(NSMenuItem.separator())

        // Actions
        let dashboardItem = NSMenuItem(title: "Open Dashboard", action: #selector(self.openDashboard), keyEquivalent: "d")
        dashboardItem.target = self
        menu.addItem(dashboardItem)

        let copyItem = NSMenuItem(title: "Copy AQI", action: #selector(self.copyAQI), keyEquivalent: "c")
        copyItem.target = self
        menu.addItem(copyItem)

        let refreshItem = NSMenuItem(title: "Refresh", action: #selector(self.refresh), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)

        // Show update option if available
        if updateAvailable {
            menu.addItem(NSMenuItem.separator())
            let updateItem = NSMenuItem(title: "⬆️ Update Available!", action: #selector(self.downloadUpdate), keyEquivalent: "u")
            updateItem.target = self
            menu.addItem(updateItem)
        }

        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))

        self.statusItem.menu = menu
    }

    @objc func downloadUpdate() {
        // Open GitHub releases page
        NSWorkspace.shared.open(URL(string: "https://github.com/\(githubRepo)/releases/latest")!)
    }

    func getEmoji(aqi: Int) -> String {
        switch aqi {
        case 0...50: return "🌿"
        case 51...100: return "🌤️"
        case 101...150: return "☁️"
        case 151...200: return "😷"
        case 201...300: return "🚨"
        default: return "☠️"
        }
    }

    func getStatus(aqi: Int) -> String {
        switch aqi {
        case 0...50: return "Good"
        case 51...100: return "Moderate"
        case 101...150: return "Unhealthy for Sensitive"
        case 151...200: return "Unhealthy"
        case 201...300: return "Very Unhealthy"
        default: return "Hazardous"
        }
    }

    func getRecommendation(aqi: Int) -> String {
        switch aqi {
        case 0...50: return "Great day for outdoor activities!"
        case 51...100: return "Sensitive groups take it easy."
        case 101...150: return "Consider wearing a mask outside."
        case 151...200: return "Reduce outdoor activities."
        case 201...300: return "Avoid outdoor activities. Use air purifier."
        default: return "Stay indoors! Health emergency."
        }
    }

    @objc func openDashboard() {
        NSWorkspace.shared.open(URL(string: "https://aqi.shaxbozaka.cc")!)
    }

    @objc func copyAQI() {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        let text = "Tashkent AQI: \(currentAQI) (\(getStatus(aqi: currentAQI))) - \(Int(currentTemp))°C"
        pasteboard.setString(text, forType: .string)
    }

    @objc func refresh() {
        updateData()
    }
}

let app = AQIMenuBar()
app.run()
