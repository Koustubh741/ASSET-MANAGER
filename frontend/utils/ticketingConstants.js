export const ISSUE_MAPPING = {
    'Laptop': [
        "Overheating / Heat Management", "Battery / Power Delivery", "Keyboard / Trackpad Failure",
        "Blue Screen of Death (BSOD)", "Performance / System Lag", "Wi-Fi / Bluetooth Connectivity",
        "BIOS / Startup Error", "Screen / Display Issue", "Port / Docking Station Issue",
        "OS Corruption / Boot Failure", "BitLocker / Encryption Lock"
    ],
    'Printer': [
        "Paper Jam", "Clogged Printheads", "Low Ink or Toner", "Printer Offline",
        "Slow Printing", "Streaks and Lines", "Faded or Blurry Prints", "Print Queue Backlog",
        "Driver / Software Issue", "Wi-Fi Connectivity Failure", "Mechanical Wear (Rollers/Fusers)",
        "Non-Genuine Cartridge Error", "Scanner / Copier Malfunction"
    ],
    'Monitor': [
        "No Signal Detected", "Flickering / Artifacts", "Dead Pixels / Lines",
        "Color Tint / Calibration", "Power / LED Indicators", "Physical Screen Damage", "OSD Menu Locked"
    ],
    'Peripheral': [
        "Device Not Recognized", "Input Lag / Latency", "Key Chatter / Double Type",
        "Microphone Static / No Audio", "Webcam Blurry / No Video", "Driver Compatibility Issue"
    ],
    'Mobile': [
        "Rapid Battery Drain", "Device Overheating", "Cloud Sync Failure",
        "MDM / Profile Error", "Physical Screen Damage", "SIM / Cellular Connectivity", "Security / Virus Alert"
    ],
    'Tablet': [
        "Touchscreen Unresponsive", "App Compatibility Issue", "Battery / Charging Error",
        "Stylus / Pencil Not Syncing", "Physical Damage", "Wi-Fi / Bluetooth Connectivity"
    ],
    'Network': [
        "VPN Connection Failure", "Slow Internet Speed", "Router / Access Point Offline",
        "IP Address Conflict", "DNS Resolution Error", "Cabling / Port Fault"
    ],
    'BYOD': [
        "Sync Error", "Access Denied", "Screen Damage", "OS Update Required", "Work Profile Setup Failure"
    ],
    'General': [
        "Hardware Fault", "Performance / System Lag", "Software / OS Issue",
        "Network / VPN", "Access / Permissions", "Email / Outlook",
        "Hardware / Peripheral Issue", "Security Incident", "Other",
        "Paper Jam", "Low Ink or Toner", "Printer Offline", "No Signal Detected",
        "Flickering / Artifacts", "Wi-Fi / Bluetooth Connectivity", "Battery / Power Delivery",
        "Overheating / Heat Management", "Device Not Recognized", "Touchscreen Unresponsive"
    ]
};

export const ISSUE_PRIORITY = {
    'Performance / System Lag': 100,
    'Overheating / Heat Management': 95,
    'Device Overheating': 95,
    'Blue Screen of Death (BSOD)': 90,
    'Paper Jam': 85,
    'Clogged Printheads': 84,
    'Mechanical Wear (Rollers/Fusers)': 83,
    'Non-Genuine Cartridge Error': 82,
    'Scanner / Copier Malfunction': 81,
    'Slow Internet Speed': 80,
    'VPN Connection Failure': 79,
    'BitLocker / Encryption Lock': 78,
    'OS Corruption / Boot Failure': 77,
    'Battery / Power Delivery': 76,
    'Battery / Charging Error': 76,
    'Rapid Battery Drain': 76,
    'Connectivity / Offline': 75,
    'Printer Offline': 75,
    'Wi-Fi / Bluetooth Connectivity': 74,
    'Wi-Fi Connectivity Failure': 74,
    'Access / Permissions': 70,
    'Access Denied': 70,
    'Security Incident': 65,
    'Security / Virus Alert': 65,
    'Physical Screen Damage': 60,
    'Screen / Display Issue': 59,
    'No Signal Detected': 58,
    'Flickering / Artifacts': 57,
    'Dead Pixels / Lines': 56,
    'Touchscreen Unresponsive': 55,
    'Microphone Static / No Audio': 54,
    'Webcam Blurry / No Video': 53,
    'App Compatibility Issue': 50,
    'Driver Compatibility Issue': 49,
    'Hardware Fault': 10,
    'Software / OS Issue': 9,
    'Other': 0
};

export const KEYWORD_MAPPING = {
    // 1. Performance & Stability
    'ram': ["Performance / System Lag", "Hardware Fault"],
    'memory': ["Performance / System Lag"],
    'slow': ["Performance / System Lag", "Slow Printing"],
    'lag': ["Performance / System Lag", "Input Lag / Latency"],
    'full': ["Performance / System Lag"],
    'cpu': ["Performance / System Lag"],
    'disk': ["Performance / System Lag", "Hardware Fault"],
    'ssd': ["Performance / System Lag", "Hardware Fault"],
    'hdd': ["Performance / System Lag", "Hardware Fault"],
    'storage': ["Performance / System Lag"],
    'throttle': ["Performance / System Lag", "Overheating / Heat Management"],
    'black screen': ["No Signal Detected", "Screen / Display Issue"],
    'blue screen': ["Blue Screen of Death (BSOD)"],
    'wont start': ["BIOS / Startup Error", "OS Corruption / Boot Failure", "Power / LED Indicators"],
    'no power': ["Battery / Power Delivery", "Power / LED Indicators"],
    'battery drain': ["Rapid Battery Drain"],
    'very slow': ["Performance / System Lag"],
    'system lag': ["Performance / System Lag"],
    'wont print': ["Printer / Software Issue", "Printer Offline", "Print Queue Backlog"],
    'paper jam': ["Paper Jam"],
    'broken screen': ["Physical Screen Damage", "Screen Damage"],
    'cracked screen': ["Physical Screen Damage", "Screen Damage"],
    'not recognized': ["Device Not Recognized"],
    'wont connect': ["Connectivity / Offline", "Wi-Fi / Bluetooth Connectivity", "VPN Connection Failure"],
    'vpn fail': ["VPN Connection Failure", "Network / VPN"],

    // 2. Power & Thermal
    'heat': ["Overheating / Heat Management", "Device Overheating"],
    'hot': ["Overheating / Heat Management", "Device Overheating"],
    'fan': ["Overheating / Heat Management"],
    'temp': ["Overheating / Heat Management"],
    'thermal': ["Overheating / Heat Management"],
    'power': ["Battery / Power Delivery", "Power / LED Indicators", "Battery / Charging Error"],
    'charge': ["Battery / Power Delivery", "Battery / Charging Error"],
    'charging': ["Battery / Charging Error"],
    'battery': ["Battery / Power Delivery", "Rapid Battery Drain", "Battery / Charging Error"],
    'drain': ["Rapid Battery Drain"],
    'plug': ["Battery / Power Delivery"],

    // 3. Printer Specific
    'jam': ["Paper Jam"],
    'paper': ["Paper Jam"],
    'ink': ["Low Ink or Toner"],
    'toner': ["Low Ink or Toner"],
    'cartridge': ["Low Ink or Toner", "Non-Genuine Cartridge Error"],
    'offline': ["Printer Offline", "Connectivity / Offline", "Router / Access Point Offline"],
    'print': ["Printer / Software Issue", "Slow Printing"],
    'clog': ["Clogged Printheads"],
    'head': ["Clogged Printheads"],
    'streak': ["Streaks and Lines"],
    'blur': ["Faded or Blurry Prints", "Webcam Blurry / No Video"],
    'fade': ["Faded or Blurry Prints"],
    'queue': ["Print Queue Backlog"],
    'scanner': ["Scanner / Copier Malfunction"],
    'copy': ["Scanner / Copier Malfunction"],
    'roller': ["Mechanical Wear (Rollers/Fusers)"],
    'fuser': ["Mechanical Wear (Rollers/Fusers)"],
    'genuine': ["Non-Genuine Cartridge Error"],

    // 4. Connectivity & Network
    'wifi': ["Network / VPN", "Wi-Fi / Bluetooth Connectivity", "Wi-Fi Connectivity Failure"],
    'internet': ["Network / VPN", "Connectivity / Offline"],
    'wireless': ["Wi-Fi / Bluetooth Connectivity"],
    'net': ["Network / VPN"],
    'vpn': ["Network / VPN", "VPN Connection Failure"],
    'signal': ["No Signal Detected"],
    'connect': ["Connectivity / Offline", "Wi-Fi / Bluetooth Connectivity"],
    'ip': ["IP Address Conflict"],
    'dns': ["DNS Resolution Error"],
    'router': ["Router / Access Point Offline"],
    'ethernet': ["Network / VPN", "Cabling / Port Fault"],
    'lan': ["Network / VPN"],
    'ping': ["Network / VPN", "Input Lag / Latency"],
    'latency': ["Input Lag / Latency"],
    'remote': ["Network / VPN", "Software / OS Issue"],
    'rdp': ["Network / VPN"],

    // 5. Display & Visual
    'flicker': ["Flickering / Artifacts"],
    'pixel': ["Dead Pixels / Lines"],
    'line': ["Dead Pixels / Lines", "Streaks and Lines"],
    'color': ["Color Tint / Calibration"],
    'screen': ["Screen / Display Issue", "Physical Screen Damage", "No Signal Detected", "Touchscreen Unresponsive"],
    'display': ["Screen / Display Issue", "No Signal Detected"],
    'monitor': ["Screen / Display Issue", "No Signal Detected"],
    'broken': ["Hardware Fault", "Physical Screen Damage", "Physical Damage"],
    'damage': ["Physical Screen Damage", "Hardware Fault", "Screen Damage", "Physical Damage"],
    'touch': ["Touchscreen Unresponsive"],
    'hdmi': ["Cabling / Port Fault", "No Signal Detected"],
    'vga': ["Cabling / Port Fault"],
    'dual': ["Screen / Display Issue"],

    // 6. Access & Security
    'login': ["Access / Permissions", "Access Denied"],
    'access': ["Access / Permissions", "Access Denied"],
    'pass': ["Access / Permissions", "Access Denied"],
    'password': ["Access / Permissions", "Access Denied"],
    'security': ["Security Incident", "Security / Virus Alert"],
    'virus': ["Security Incident", "Security / Virus Alert"],
    'alert': ["Security / Virus Alert"],
    'sync': ["Cloud Sync Failure", "Sync Error"],
    'mdm': ["MDM / Profile Error"],
    'account': ["Access / Permissions"],

    // 7. Software & Apps
    'outlook': ["Software / OS Issue", "App Compatibility Issue"],
    'teams': ["Software / OS Issue", "App Compatibility Issue"],
    'office': ["Software / OS Issue"],
    'excel': ["Software / OS Issue"],
    'word': ["Software / OS Issue"],
    'chrome': ["Software / OS Issue", "Browser Performance Issue"],
    'browser': ["Browser Performance Issue"],
    'update': ["Software / OS Issue", "OS Corruption / Boot Failure"],
    'install': ["Software / OS Issue"],
    'license': ["Software / OS Issue"],
    'activation': ["Software / OS Issue"],
    'software': ["Software / OS Issue", "OS Corruption / Boot Failure", "Driver / Software Issue"],
    'driver': ["Driver / Software Issue", "Driver Compatibility Issue"],
    'app': ["App Compatibility Issue", "Software / OS Issue"],

    // 8. Hardware & Peripherals
    'key': ["Key Chatter / Double Type", "Keyboard / Trackpad Failure"],
    'keyboard': ["Keyboard / Trackpad Failure"],
    'mouse': ["Hardware Fault"],
    'trackpad': ["Keyboard / Trackpad Failure"],
    'click': ["Keyboard / Trackpad Failure"],
    'type': ["Key Chatter / Double Type"],
    'mic': ["Microphone Static / No Audio"],
    'audio': ["Microphone Static / No Audio"],
    'sound': ["Microphone Static / No Audio"],
    'webcam': ["Webcam Blurry / No Video"],
    'video': ["Webcam Blurry / No Video", "No Signal Detected"],
    'port': ["Port / Docking Station Issue", "Cabling / Port Fault"],
    'cable': ["Cabling / Port Fault"],
    'usbc': ["Cabling / Port Fault", "Port / Docking Station Issue"],
    'usb': ["Cabling / Port Fault"],
    'detect': ["Device Not Recognized"],
    'stylus': ["Stylus / Pencil Not Syncing"],
    'pencil': ["Stylus / Pencil Not Syncing"],
    'dock': ["Port / Docking Station Issue"],

    // 9. Broad Triggers
    'help': ["Hardware Fault", "Software / OS Issue"],
    'urgent': ["Hardware Fault", "Software / OS Issue"],
    'asap': ["Hardware Fault", "Software / OS Issue"],
    'emergency': ["Hardware Fault", "Software / OS Issue"],
    'fix': ["Hardware Fault", "Software / OS Issue"],
    'issue': ["Hardware Fault", "Software / OS Issue"],
    'problem': ["Hardware Fault", "Software / OS Issue"],
    'dead': ["Hardware Fault", "Battery / Power Delivery"],
    'phone': ["Rapid Battery Drain", "SIM / Cellular Connectivity"]
};

export const STOP_WORDS = new Set(['the', 'is', 'a', 'my', 'with', 'and', 'for', 'to', 'in', 'on', 'at', 'by', 'of', 'from']);
