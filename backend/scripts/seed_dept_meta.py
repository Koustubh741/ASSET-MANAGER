import os
import sys
import asyncio
import json
from sqlalchemy.future import select

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Department

async def seed_department_metadata():
    async with AsyncSessionLocal() as db:
        print("[INFO] Seeding department metadata for all 15 portals...")
        
        metadata_map = {
            "hr": {
                "accent_color": "rose-500",
                "bg_overlay": "bg-rose-500/5",
                "border_accent": "border-rose-500/20",
                "welcome_message": "Human Resources Support Center",
                "icon": "Users",
                "categories": ["Payroll", "Benefits", "Leave Request", "Polices", "Recruitment"]
            },
            "finance": {
                "accent_color": "emerald-500",
                "bg_overlay": "bg-emerald-500/5",
                "border_accent": "border-emerald-500/20",
                "welcome_message": "Finance & Accounting Portals",
                "icon": "Wallet",
                "categories": ["Reimbursement", "Invoice Query", "Budget Allocation", "Taxation", "Audit Support"]
            },
            "legal": {
                "accent_color": "purple-500",
                "bg_overlay": "bg-purple-500/5",
                "border_accent": "border-purple-500/20",
                "welcome_message": "Legal & Compliance Portal",
                "icon": "Scale",
                "categories": ["Contract Review", "Compliance Query", "NDA Request", "Intellectual Property"]
            },
            "operations": {
                "accent_color": "blue-500",
                "bg_overlay": "bg-blue-500/5",
                "border_accent": "border-blue-500/20",
                "welcome_message": "Operations & Logistics Support",
                "icon": "Briefcase",
                "categories": ["Facility Management", "Logistics", "Office Supplies", "Event Coordination"]
            },
            "security": {
                "accent_color": "amber-500",
                "bg_overlay": "bg-amber-500/5",
                "border_accent": "border-amber-500/20",
                "welcome_message": "Cyber Security & Safety Hub",
                "icon": "ShieldCheck",
                "categories": ["Access Control", "Incident Reporting", "Clearance Request", "Security Audit"]
            },
            "it": {
                "accent_color": "primary",
                "bg_overlay": "bg-primary/5",
                "border_accent": "border-primary/20",
                "welcome_message": "Global IT Service Desk",
                "icon": "Laptop",
                "categories": ["Hardware", "Software", "Network", "Access", "Cloud Services"]
            },
            "engineering": {
                "accent_color": "sky-500",
                "bg_overlay": "bg-sky-500/5",
                "border_accent": "border-sky-500/20",
                "welcome_message": "Engineering Operations & Tooling",
                "icon": "Settings",
                "categories": ["Tooling Support", "CI/CD Issue", "Environment Request", "Dev Services"]
            },
            "procurement": {
                "accent_color": "orange-500",
                "bg_overlay": "bg-orange-500/5",
                "border_accent": "border-orange-500/20",
                "welcome_message": "Procurement & Strategic Sourcing",
                "icon": "ShoppingBag",
                "categories": ["New Purchase", "Vendor Request", "Order Status", "Payment Query"]
            },
            "executive": {
                "accent_color": "slate-500",
                "bg_overlay": "bg-slate-500/5",
                "border_accent": "border-slate-500/20",
                "welcome_message": "Executive Management Support",
                "icon": "HeartHandshake",
                "categories": ["Travel Booking", "Meeting Scheduling", "Document Signing", "General Inquiry"]
            },
            "architecture": {
                "accent_color": "cyan-500",
                "bg_overlay": "bg-cyan-500/5",
                "border_accent": "border-cyan-500/20",
                "welcome_message": "Architecture & Standards Group",
                "icon": "Layout",
                "categories": ["Standard Review", "Pattern Advice", "Governance Query"]
            },
            "data_ai": {
                "accent_color": "violet-500",
                "bg_overlay": "bg-violet-500/5",
                "border_accent": "border-violet-500/20",
                "welcome_message": "Data & AI Platform Support",
                "icon": "Database",
                "categories": ["Dataset Request", "Model Support", "Analytic Access", "GPU Cluster"]
            },
            "cloud": {
                "accent_color": "blue-600",
                "bg_overlay": "bg-blue-600/5",
                "border_accent": "border-blue-600/20",
                "welcome_message": "Multi-Cloud Operations Center",
                "icon": "Cloud",
                "categories": ["Cloud Spend", "Instance Request", "K8s Support", "Backup Query"]
            },
            "product": {
                "accent_color": "pink-600",
                "bg_overlay": "bg-pink-600/5",
                "border_accent": "border-pink-600/20",
                "welcome_message": "Product Management Support",
                "icon": "MessageSquare",
                "categories": ["Feature Request", "Customer Feedback", "Roadmap Query"]
            },
             "customer_success": {
                "accent_color": "indigo-500",
                "bg_overlay": "bg-indigo-500/5",
                "border_accent": "border-indigo-500/20",
                "welcome_message": "Customer Success & Retention Hub",
                "icon": "Users",
                "categories": ["Account Query", "Retention Support", "Customer Issue"]
            },
            "sales": {
                "accent_color": "teal-500",
                "bg_overlay": "bg-teal-500/5",
                "border_accent": "border-teal-500/20",
                "welcome_message": "Sales & Marketing Enablement",
                "icon": "Zap",
                "categories": ["Lead Request", "Marketing Asset", "Collateral Request"]
            }
        }

        for slug, meta in metadata_map.items():
            result = await db.execute(select(Department).where(Department.slug == slug))
            dept = result.scalar_one_or_none()
            if dept:
                print(f"Updating metadata for: {dept.name} ({slug})")
                dept.dept_metadata = meta
            else:
                print(f"Warning: Department with slug '{slug}' not found.")
        
        await db.commit()
        print("[SUCCESS] All 15 departmental portals metadata seeded!")

if __name__ == "__main__":
    asyncio.run(seed_department_metadata())
