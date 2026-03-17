"""
Check which domains have managers assigned.
"""
import asyncio
from app.database.database import get_db
from app.models.models import User
from sqlalchemy.future import select
from sqlalchemy import func

async def check_domain_managers():
    print("=== DOMAIN MANAGER ANALYSIS ===\n")
    
    async for db in get_db():
        # Get all managers
        result = await db.execute(
            select(User)
            .filter(User.position == 'MANAGER')
            .filter(User.role == 'END_USER')
            .order_by(User.domain)
        )
        managers = result.scalars().all()
        
        print(f"Total Managers: {len(managers)}\n")
        
        # Group by domain
        domains = {}
        for m in managers:
            domain = m.domain or 'None'
            if domain not in domains:
                domains[domain] = []
            domains[domain].append(m)
        
        print("Managers by Domain:")
        print("-" * 60)
        for domain, mgrs in sorted(domains.items()):
            print(f"\n{domain.upper()} Domain:")
            for m in mgrs:
                print(f"  - {m.email} (Status: {m.status})")
        
        # Check all domains
        print("\n" + "=" * 60)
        print("ALL DOMAINS IN SYSTEM:")
        print("=" * 60)
        
        result = await db.execute(
            select(User.domain, func.count(User.id))
            .filter(User.domain.isnot(None))
            .group_by(User.domain)
        )
        domain_counts = result.all()
        
        all_domains = set()
        for domain, count in domain_counts:
            all_domains.add(domain)
            has_manager = domain in domains
            status = "[HAS MANAGER]" if has_manager else "[NO MANAGER]"
            print(f"{domain}: {count} users {status}")
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY:")
        print("=" * 60)
        domains_with_managers = len([d for d in all_domains if d in domains])
        domains_without_managers = len(all_domains) - domains_with_managers
        
        print(f"Total domains: {len(all_domains)}")
        print(f"Domains with managers: {domains_with_managers}")
        print(f"Domains without managers: {domains_without_managers}")
        
        if domains_without_managers > 0:
            print("\nDomains needing managers:")
            for domain in sorted(all_domains):
                if domain not in domains:
                    print(f"  - {domain}")
        
        break

if __name__ == "__main__":
    asyncio.run(check_domain_managers())
