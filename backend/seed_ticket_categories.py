import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))

try:
    from app.database.database import SessionLocal
    from app.models.models import CategoryConfig
except ImportError:
    sys.path.append(os.getcwd())
    from app.database.database import SessionLocal
    from app.models.models import CategoryConfig

def seed_categories():
    categories_to_seed = [
        # Performance & Stability
        {"name": "Performance / System Lag", "icon_name": "Activity", "color": "#ef4444", "bg_color": "bg-red-500/10", "border_color": "border-red-500/20"},
        {"name": "Overheating / Heat Management", "icon_name": "Thermometer", "color": "#f97316", "bg_color": "bg-orange-500/10", "border_color": "border-orange-500/20"},
        {"name": "Device Overheating", "icon_name": "Thermometer", "color": "#f97316", "bg_color": "bg-orange-500/10", "border_color": "border-orange-500/20"},
        {"name": "Blue Screen of Death (BSOD)", "icon_name": "Slash", "color": "#3b82f6", "bg_color": "bg-blue-500/10", "border_color": "border-blue-500/20"},
        {"name": "OS Corruption / Boot Failure", "icon_name": "Terminal", "color": "#ef4444", "bg_color": "bg-red-500/10", "border_color": "border-red-500/20"},
        {"name": "BIOS / Startup Error", "icon_name": "Power", "color": "#f97316", "bg_color": "bg-orange-500/10", "border_color": "border-orange-500/20"},
        
        # Printer Specific
        {"name": "Paper Jam", "icon_name": "FileX", "color": "#dc2626", "bg_color": "bg-red-600/10", "border_color": "border-red-600/20"},
        {"name": "Low Ink or Toner", "icon_name": "Droplets", "color": "#4f46e5", "bg_color": "bg-indigo-600/10", "border_color": "border-indigo-600/20"},
        {"name": "Printer Offline", "icon_name": "WifiOff", "color": "#64748b", "bg_color": "bg-slate-500/10", "border_color": "border-slate-500/20"},
        {"name": "Clogged Printheads", "icon_name": "Wind", "color": "#dc2626", "bg_color": "bg-red-600/10", "border_color": "border-red-600/20"},
        {"name": "Scanner / Copier Malfunction", "icon_name": "Copy", "color": "#8b5cf6", "bg_color": "bg-purple-500/10", "border_color": "border-purple-500/20"},
        {"name": "Mechanical Wear (Rollers/Fusers)", "icon_name": "Settings", "color": "#4b5563", "bg_color": "bg-gray-500/10", "border_color": "border-gray-500/20"},
        {"name": "Non-Genuine Cartridge Error", "icon_name": "AlertTriangle", "color": "#f59e0b", "bg_color": "bg-amber-500/10", "border_color": "border-amber-500/20"},
        
        # Connectivity & Display
        {"name": "Network / VPN", "icon_name": "Globe", "color": "#0ea5e9", "bg_color": "bg-sky-500/10", "border_color": "border-sky-500/20"},
        {"name": "Connectivity / Offline", "icon_name": "WifiOff", "color": "#64748b", "bg_color": "bg-slate-500/10", "border_color": "border-slate-500/20"},
        {"name": "Wi-Fi / Bluetooth Connectivity", "icon_name": "Wifi", "color": "#06b6d4", "bg_color": "bg-cyan-500/10", "border_color": "border-cyan-500/20"},
        {"name": "VPN Connection Failure", "icon_name": "Shield", "color": "#3b82f6", "bg_color": "bg-blue-500/10", "border_color": "border-blue-500/20"},
        {"name": "No Signal Detected", "icon_name": "MonitorOff", "color": "#4b5563", "bg_color": "bg-gray-600/10", "border_color": "border-gray-600/20"},
        {"name": "Flickering / Artifacts", "icon_name": "Scan", "color": "#8b5cf6", "bg_color": "bg-purple-500/10", "border_color": "border-purple-500/20"},
        {"name": "Dead Pixels / Lines", "icon_name": "Hash", "color": "#ef4444", "bg_color": "bg-red-500/10", "border_color": "border-red-500/20"},
        
        # Hardware & General
        {"name": "Hardware Fault", "icon_name": "HardDrive", "color": "#f43f5e", "bg_color": "bg-rose-500/10", "border_color": "border-rose-500/20"},
        {"name": "Software / OS Issue", "icon_name": "Cpu", "color": "#3b82f6", "bg_color": "bg-blue-500/10", "border_color": "border-blue-500/20"},
        {"name": "Battery / Power Delivery", "icon_name": "BatteryCharging", "color": "#10b981", "bg_color": "bg-emerald-500/10", "border_color": "border-emerald-500/20"},
        {"name": "Rapid Battery Drain", "icon_name": "BatteryLow", "color": "#f59e0b", "bg_color": "bg-amber-500/10", "border_color": "border-amber-500/20"},
        {"name": "Access / Permissions", "icon_name": "Lock", "color": "#fbbf24", "bg_color": "bg-amber-400/10", "border_color": "border-amber-400/20"},
        {"name": "Access Denied", "icon_name": "ShieldAlert", "color": "#ef4444", "bg_color": "bg-red-500/10", "border_color": "border-red-500/20"},
        {"name": "Security Incident", "icon_name": "ShieldCheck", "color": "#f87171", "bg_color": "bg-red-400/10", "border_color": "border-red-400/20"},
        {"name": "Security / Virus Alert", "icon_name": "AlertCircle", "color": "#ef4444", "bg_color": "bg-red-500/10", "border_color": "border-red-500/20"},
        {"name": "Email / Outlook", "icon_name": "Mail", "color": "#a78bfa", "bg_color": "bg-violet-400/10", "border_color": "border-violet-400/20"},
        {"name": "Hardware / Peripheral Issue", "icon_name": "MousePointer", "color": "#94a3b8", "bg_color": "bg-slate-400/10", "border_color": "border-slate-400/20"},
        {"name": "Other", "icon_name": "HelpCircle", "color": "#64748b", "bg_color": "bg-slate-500/10", "border_color": "border-slate-500/20"},
        {"name": "Physical Screen Damage", "icon_name": "Smartphone", "color": "#f472b6", "bg_color": "bg-pink-400/10", "border_color": "border-pink-400/20"},
        {"name": "Touchscreen Unresponsive", "icon_name": "Hand", "color": "#3b82f6", "bg_color": "bg-blue-500/10", "border_color": "border-blue-500/20"},
        {"name": "Microphone Static / No Audio", "icon_name": "MicOff", "color": "#f43f5e", "bg_color": "bg-rose-500/10", "border_color": "border-rose-500/20"},
        {"name": "Webcam Blurry / No Video", "icon_name": "VideoOff", "color": "#64748b", "bg_color": "bg-slate-500/10", "border_color": "border-slate-500/20"},
    ]

    session = SessionLocal()
    try:
        for cat_data in categories_to_seed:
            existing = session.query(CategoryConfig).filter_by(name=cat_data["name"]).first()
            if existing:
                print(f"Updating category: {cat_data['name']}")
                existing.icon_name = cat_data["icon_name"]
                existing.color = cat_data["color"]
                existing.bg_color = cat_data.get("bg_color")
                existing.border_color = cat_data.get("border_color")
            else:
                print(f"Adding category: {cat_data['name']}")
                new_cat = CategoryConfig(**cat_data)
                session.add(new_cat)
        
        session.commit()
        print("Seeding completed successfully!")
    except Exception as e:
        session.rollback()
        print(f"Error seeding categories: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    seed_categories()
