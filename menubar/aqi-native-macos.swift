#!/usr/bin/env swift
/*
 * Tashkent AQI Menu Bar Indicator
 * Native macOS - No dependencies!
 *
 * Compile: swiftc -o aqi-menubar aqi-native-macos.swift
 * Run: ./aqi-menubar
 */

import Cocoa

class AQIMenuBar: NSObject {
    var statusItem: NSStatusItem!
    var timer: Timer?

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        updateData()

        // Update every 60 seconds
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            self.updateData()
        }

        app.run()
    }

    func updateData() {
        // Fetch AQI
        guard let aqiUrl = URL(string: "https://aqi.shaxbozaka.cc/api/aqi/current"),
              let weatherUrl = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=41.2995&longitude=69.2401&current=temperature_2m") else {
            return
        }

        var aqi: Int = 0
        var temp: Double = 0
        var status = "Loading..."

        // Fetch AQI synchronously (simple approach)
        if let data = try? Data(contentsOf: aqiUrl),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let dataObj = json["data"] as? [String: Any],
           let aqiValue = dataObj["aqi_us"] as? Int {
            aqi = aqiValue
            status = getStatus(aqi: aqi)
        }

        // Fetch temperature
        if let data = try? Data(contentsOf: weatherUrl),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let current = json["current"] as? [String: Any],
           let tempValue = current["temperature_2m"] as? Double {
            temp = tempValue
        }

        // Update menu bar
        DispatchQueue.main.async {
            let emoji = self.getEmoji(aqi: aqi)
            self.statusItem.button?.title = "\(Int(temp))° · \(aqi) \(emoji)"

            // Create menu
            let menu = NSMenu()
            menu.addItem(NSMenuItem(title: "Tashkent Air Quality", action: nil, keyEquivalent: ""))
            menu.addItem(NSMenuItem(title: status, action: nil, keyEquivalent: ""))
            menu.addItem(NSMenuItem.separator())
            menu.addItem(NSMenuItem(title: "Temperature: \(temp)°C", action: nil, keyEquivalent: ""))
            menu.addItem(NSMenuItem.separator())

            let dashboardItem = NSMenuItem(title: "Open Dashboard", action: #selector(self.openDashboard), keyEquivalent: "")
            dashboardItem.target = self
            menu.addItem(dashboardItem)

            let refreshItem = NSMenuItem(title: "Refresh", action: #selector(self.refresh), keyEquivalent: "r")
            refreshItem.target = self
            menu.addItem(refreshItem)

            menu.addItem(NSMenuItem.separator())
            menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))

            self.statusItem.menu = menu
        }
    }

    func getEmoji(aqi: Int) -> String {
        switch aqi {
        case 0...50: return "🟢"
        case 51...100: return "🟡"
        case 101...150: return "🟠"
        case 151...200: return "🔴"
        case 201...300: return "🟣"
        default: return "⚫"
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

    @objc func openDashboard() {
        NSWorkspace.shared.open(URL(string: "https://aqi.shaxbozaka.cc")!)
    }

    @objc func refresh() {
        updateData()
    }
}

let app = AQIMenuBar()
app.run()
