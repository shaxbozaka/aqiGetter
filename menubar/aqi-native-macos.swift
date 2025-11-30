#!/usr/bin/env swift
/*
 * Tashkent AQI Menu Bar Indicator
 * Native macOS - No dependencies!
 *
 * Features:
 * - Real-time AQI with trend arrow (↑/↓)
 * - Temperature and wind speed
 * - Health recommendations
 * - Notifications when AQI crosses thresholds
 * - Copy AQI to clipboard
 * - Last updated time
 *
 * Compile: swiftc -o aqi-menubar aqi-native-macos.swift
 * Run: ./aqi-menubar
 */

import Cocoa
import UserNotifications

class AQIMenuBar: NSObject, UNUserNotificationCenterDelegate {
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
    let currentVersion = "1.1.0"
    let githubRepo = "shaxbozaka/aqiGetter"

    // Notification thresholds
    let thresholds = [50, 100, 150, 200, 300]

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        // Request notification permissions
        requestNotificationPermission()

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        updateData()

        // Update every 60 seconds
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
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
                    self.sendNotification(
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

    func requestNotificationPermission() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            if granted {
                print("Notifications enabled")
            }
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    func updateData() {
        guard let aqiUrl = URL(string: "https://aqi.shaxbozaka.cc/api/aqi/current") else {
            return
        }

        var aqi: Int = 0
        var temp: Double = 0
        var wind: Double = 0
        var humidity: Int = 0
        var status = "Loading..."

        // Fetch AQI data (includes temperature, wind, humidity)
        if let data = try? Data(contentsOf: aqiUrl),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let dataObj = json["data"] as? [String: Any] {

            if let aqiValue = dataObj["aqi_us"] as? Int {
                aqi = aqiValue
                status = getStatus(aqi: aqi)
            }

            if let tempValue = dataObj["temperature_celsius"] as? String,
               let tempDouble = Double(tempValue) {
                temp = tempDouble
            } else if let tempValue = dataObj["temperature_celsius"] as? Double {
                temp = tempValue
            }

            if let windValue = dataObj["wind_speed_ms"] as? String,
               let windDouble = Double(windValue) {
                wind = windDouble * 3.6 // Convert to km/h
            } else if let windValue = dataObj["wind_speed_ms"] as? Double {
                wind = windValue * 3.6
            }

            if let humidityValue = dataObj["humidity"] as? Int {
                humidity = humidityValue
            }
        }

        // Check for threshold crossing and send notification
        if previousAQI > 0 {
            checkThresholdCrossing(oldAQI: previousAQI, newAQI: aqi)
        }

        // Store current values
        let oldAQI = previousAQI
        previousAQI = aqi
        currentAQI = aqi
        currentTemp = temp
        currentWind = wind
        currentHumidity = humidity
        lastUpdateTime = Date()

        // Update menu bar
        DispatchQueue.main.async {
            let emoji = self.getEmoji(aqi: aqi)
            let trend = self.getTrendArrow(oldAQI: oldAQI, newAQI: aqi)
            self.statusItem.button?.title = "\(Int(temp))° · \(aqi)\(trend) \(emoji)"

            // Create menu
            self.buildMenu(aqi: aqi, temp: temp, wind: wind, humidity: humidity, status: status)
        }
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
                sendNotification(
                    title: "AQI Alert: \(getStatus(aqi: newAQI))",
                    body: "Air quality worsened to \(newAQI). \(getRecommendation(aqi: newAQI))"
                )
                return
            }
            // Crossed down (getting better)
            if oldAQI >= threshold && newAQI < threshold {
                sendNotification(
                    title: "AQI Improved: \(getStatus(aqi: newAQI))",
                    body: "Air quality improved to \(newAQI). \(getRecommendation(aqi: newAQI))"
                )
                return
            }
        }
    }

    func sendNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
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
