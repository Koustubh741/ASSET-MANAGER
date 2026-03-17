import sys
import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add root directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import DATABASE_URL
from app.models.models import CategoryConfig

async def seed_categories():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    # Unified Category List (Sync with EndUserDashboard.jsx KEYWORD_MAPPING + ISSUE_MAPPING)
    configs = [
        # Core & Generic
        {"name": "Hardware", "icon_name": "HardDrive", "color": "#f43f5e"},
        {"name": "Software", "icon_name": "Cpu", "color": "#3b82f6"},
        {"name": "Network", "icon_name": "Wifi", "color": "#34d399"},
        {"name": "Communication", "icon_name": "Mail", "color": "#a78bfa"},
        {"name": "Peripherals", "icon_name": "Printer", "color": "#94a3b8"},
        {"name": "Access / Permissions", "icon_name": "Lock", "color": "#fbbf24"},
        {"name": "Security Incident", "icon_name": "ShieldCheck", "color": "#f87171"},
        {"name": "Procurement Request", "icon_name": "ShoppingCart", "color": "#22d3ee"},
        {"name": "Mobile Device", "icon_name": "Smartphone", "color": "#f472b6"},
        {"name": "Other", "icon_name": "HelpCircle", "color": "#64748b"},

        # Performance & Stability
        {"name": "Performance / System Lag", "icon_name": "Activity", "color": "#f59e0b"},
        {"name": "Input Lag / Latency", "icon_name": "Zap", "color": "#f59e0b"},
        {"name": "Blue Screen of Death (BSOD)", "icon_name": "Slash", "color": "#3b82f6"},
        {"name": "OS Corruption / Boot Failure", "icon_name": "Terminal", "color": "#ef4444"},
        {"name": "BIOS / Startup Error", "icon_name": "Power", "color": "#dc2626"},
        {"name": "Software / OS Issue", "icon_name": "Cpu", "color": "#3b82f6"},
        {"name": "Overheating / Heat Management", "icon_name": "Thermometer", "color": "#f97316"},
        {"name": "Device Overheating", "icon_name": "Thermometer", "color": "#ea580c"},

        # Power & Battery
        {"name": "Power / LED Indicators", "icon_name": "Zap", "color": "#fbbf24"},
        {"name": "Battery / Power Delivery", "icon_name": "BatteryCharging", "color": "#10b981"},
        {"name": "Battery / Charging Error", "icon_name": "BatteryWarning", "color": "#f43f5e"},
        {"name": "Rapid Battery Drain", "icon_name": "BatteryLow", "color": "#f97316"},

        # Printer Specific
        {"name": "Paper Jam", "icon_name": "FileX", "color": "#f43f5e"},
        {"name": "Low Ink or Toner", "icon_name": "Droplet", "color": "#3b82f6"},
        {"name": "Non-Genuine Cartridge Error", "icon_name": "AlertTriangle", "color": "#f59e0b"},
        {"name": "Printer Offline", "icon_name": "WifiOff", "color": "#64748b"},
        {"name": "Slow Printing", "icon_name": "Clock", "color": "#94a3b8"},
        {"name": "Printer / Software Issue", "icon_name": "Printer", "color": "#6366f1"},
        {"name": "Clogged Printheads", "icon_name": "Wind", "color": "#64748b"},
        {"name": "Streaks and Lines", "icon_name": "Hash", "color": "#94a3b8"},
        {"name": "Faded or Blurry Prints", "icon_name": "Scan", "color": "#94a3b8"},
        {"name": "Print Queue Backlog", "icon_name": "List", "color": "#6366f1"},
        {"name": "Scanner / Copier Malfunction", "icon_name": "Copy", "color": "#94a3b8"},
        {"name": "Mechanical Wear (Rollers/Fusers)", "icon_name": "Settings", "color": "#64748b"},

        # Connectivity & Network (Advanced)
        {"name": "Network / VPN", "icon_name": "Globe", "color": "#34d399"},
        {"name": "Wi-Fi / Bluetooth Connectivity", "icon_name": "Wifi", "color": "#3b82f6"},
        {"name": "Wi-Fi Connectivity Failure", "icon_name": "WifiOff", "color": "#ef4444"},
        {"name": "VPN Connection Failure", "icon_name": "Shield", "color": "#f43f5e"},
        {"name": "No Signal Detected", "icon_name": "MonitorOff", "color": "#64748b"},
        {"name": "Connectivity / Offline", "icon_name": "WifiOff", "color": "#64748b"},
        {"name": "Router / Access Point Offline", "icon_name": "WifiOff", "color": "#f43f5e"},
        {"name": "IP Address Conflict", "icon_name": "Globe", "color": "#f97316"},
        {"name": "DNS Resolution Error", "icon_name": "Search", "color": "#f97316"},
        {"name": "Cabling / Port Fault", "icon_name": "Cable", "color": "#64748b"},
        {"name": "Slow Internet Speed", "icon_name": "Activity", "color": "#f59e0b"},

        # Display & Visual
        {"name": "Flickering / Artifacts", "icon_name": "Scan", "color": "#f59e0b"},
        {"name": "Dead Pixels / Lines", "icon_name": "Hash", "color": "#f43f5e"},
        {"name": "Color Tint / Calibration", "icon_name": "Palette", "color": "#6366f1"},
        {"name": "Screen / Display Issue", "icon_name": "Monitor", "color": "#3b82f6"},
        {"name": "Physical Screen Damage", "icon_name": "Smartphone", "color": "#ef4444"},
        {"name": "Touchscreen Unresponsive", "icon_name": "Hand", "color": "#f43f5e"},
        {"name": "Physical Damage", "icon_name": "AlertTriangle", "color": "#ef4444"},
        {"name": "Screen Damage", "icon_name": "Smartphone", "color": "#ef4444"},
        {"name": "OSD Menu Locked", "icon_name": "Settings2", "color": "#64748b"},

        # Access & Security (Advanced)
        {"name": "Access Denied", "icon_name": "ShieldAlert", "color": "#ef4444"},
        {"name": "Security / Virus Alert", "icon_name": "AlertCircle", "color": "#ef4444"},
        {"name": "Cloud Sync Failure", "icon_name": "CloudOff", "color": "#f43f5e"},
        {"name": "Sync Error", "icon_name": "RefreshCw", "color": "#f59e0b"},
        {"name": "MDM / Profile Error", "icon_name": "UserCheck", "color": "#6366f1"},
        {"name": "BitLocker / Encryption Lock", "icon_name": "Lock", "color": "#f59e0b"},
        {"name": "Work Profile Setup Failure", "icon_name": "UserX", "color": "#f43f5e"},

        # Software & Apps (Advanced)
        {"name": "App Compatibility Issue", "icon_name": "Box", "color": "#6366f1"},
        {"name": "Browser Performance Issue", "icon_name": "Chrome", "color": "#3b82f6"},
        {"name": "Driver / Software Issue", "icon_name": "Settings", "color": "#3b82f6"},
        {"name": "Driver Compatibility Issue", "icon_name": "Settings", "color": "#f59e0b"},
        {"name": "OS Update Required", "icon_name": "ArrowUpCircle", "color": "#3b82f6"},

        # Hardware & Peripherals (Advanced)
        {"name": "Key Chatter / Double Type", "icon_name": "Type", "color": "#f59e0b"},
        {"name": "Keyboard / Trackpad Failure", "icon_name": "Keyboard", "color": "#ef4444"},
        {"name": "Microphone Static / No Audio", "icon_name": "MicOff", "color": "#ef4444"},
        {"name": "Webcam Blurry / No Video", "icon_name": "VideoOff", "color": "#ef4444"},
        {"name": "Port / Docking Station Issue", "icon_name": "Layout", "color": "#64748b"},
        {"name": "Device Not Recognized", "icon_name": "HelpCircle", "color": "#f59e0b"},
        {"name": "Stylus / Pencil Not Syncing", "icon_name": "PenTool", "color": "#6366f1"},
        {"name": "SIM / Cellular Connectivity", "icon_name": "Signal", "color": "#3b82f6"},
        {"name": "Hardware / Peripheral Issue", "icon_name": "MousePointer", "color": "#94a3b8"}
    ]

    # Helper function to generate derived colors
    def update_config_styles(config):
        color_map = {
            "#f43f5e": "rose", "#3b82f6": "blue", "#10b981": "emerald", "#34d399": "emerald",
            "#f59e0b": "amber", "#a78bfa": "purple", "#6366f1": "indigo", "#64748b": "slate",
            "#94a3b8": "slate", "#f97316": "orange", "#ea580c": "orange", "#ef4444": "red",
            "#dc2626": "red", "#f87171": "red", "#fbbf24": "amber", "#22d3ee": "cyan", "#f472b6": "pink"
        }
        tw_color = color_map.get(config["color"], "slate")
        config["bg_color"] = f"bg-{tw_color}-500/20"
        config["border_color"] = f"group-hover:border-{tw_color}-500/30"
        return config

    async with AsyncSessionLocal() as session:
        print("[*] Seeding FINAL Unified Category Configurations...")
        for raw_config in configs:
            config_data = update_config_styles(raw_config)
            try:
                from sqlalchemy import select
                result = await session.execute(select(CategoryConfig).filter(CategoryConfig.name == config_data["name"]))
                existing = result.scalars().first()
                if existing:
                    for key, value in config_data.items():
                        setattr(existing, key, value)
                    print(f"  [~] Updated: {config_data['name']}")
                else:
                    session.add(CategoryConfig(**config_data))
                    print(f"  [+] Added: {config_data['name']}")
            except Exception as e:
                print(f"  [!] Error: {config_data['name']}: {e}")
        await session.commit()
    print("[+] Seeding Complete.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_categories())
