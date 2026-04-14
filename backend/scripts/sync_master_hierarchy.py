import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

# Add root and backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Department, Location, Company
from backend.app.utils.uuid_gen import get_uuid

DEPARTMENTS = [
    "ADMIN", "B&M", "BD", "F&A", "HR", "INVENTORY", "IT", 
    "LEGAL & COMPANY SECRETARY", "LOSS PREVENTION", "MARKETING", 
    "NSO", "PLANNING", "PROJECT", "RETAIL", "RETAIL OPERATION", "SCM"
]

LOC_CODES = [
    "DB03", "DB05", "DH24", "DJ02", "DK02", "DM01", "DM02", "DN01", "DN02", "DO01", "DO02", "DP01", "DR01", "DU05", "DU06", "DW01", "DW02", "DX01", "HA10", "HA11", "HA12", "HA13", "HB05", "HB06", "HB07", "HB08", "HB09", "HB10", "HB11", "HB13", "HB15", "HB16", "HB17", "HB19", "HB20", "HB21", "HB22", "HB24", "HB26", "HB29", "HB30", "HB31", "HB32", "HB34", "HB35", "HB36", "HB37", "HB38", "HB39", "HB41", "HB42", "HB43", "HB44", "HB45", "HB46", "HB47", "HB48", "HB50", "HB51", "HB52", "HB53", "HB54", "HB55", "HB56", "HB57", "HB58", "HB59", "HB60", "HB61", "HB62", "HB63", "HB64", "HB65", "HB66", "HB67", "HB68", "HC01", "HC02", "HC03", "HC04", "HC05", "HC06", "HC08", "HC09", "HD22", "HD24", "HD25", "HD26", "HD27", "HD28", "HD29", "HD30", "HD31", "HD32", "HD33", "HF01", "HG10", "HG11", "HG12", "HG13", "HH13", "HH14", "HH15", "HH16", "HH17", "HH18", "HH19", "HH20", "HH21", "HI05", "HI06", "HI07", "HI08", "HJ08", "HJ09", "HJ10", "HJ11", "HJ12", "HJ14", "HJ15", "HJ17", "HJ19", "HJ20", "HJ21", "HJ22", "HJ23", "HJ24", "HJ25", "HJ26", "HJ27", "HJ28", "HJ29", "HJ30", "HJ31", "HK04", "HK07", "HK10", "HK11", "HK12", "HK13", "HK14", "HK15", "HK16", "HK17", "HK18", "HK19", "HK20", "HK21", "HK22", "HK23", "HK24", "HK25", "HK26", "HK27", "HK28", "HK30", "HL01", "HL02", "HL03", "HL04", "HL05", "HL06", "HL07", "HL08", "HL09", "HL10", "HL11", "HM21", "HM22", "HM23", "HM24", "HM25", "HM26", "HM28", "HM29", "HM30", "HM31", "HM32", "HM33", "HM35", "HM36", "HM37", "HM38", "HM39", "HM40", "HM41", "HM42", "HM44", "HM45", "HM46", "HM47", "HM48", "HM49", "HM50", "HM51", "HM52", "HM53", "HM54", "HN10", "HN11", "HN13", "HN14", "HN15", "HN21", "HN22", "HN23", "HN25", "HN26", "HN27", "HN28", "HN29", "HN30", "HN31", "HN33", "HN34", "HN35", "HN36", "HN37", "HN38", "HN39", "HN40", "HN41", "HN42", "HN43", "HN44", "HN45", "HN46", "HN47", "HN48", "HN49", "HN50", "HN60", "HN61", "HN62", "HN80", "HO08", "HO09", "HO10", "HO11", "HO12", "HO13", "HO15", "HO16", "HO18", "HO19", "HO20", "HO21", "HO23", "HO24", "HO25", "HO26", "HO27", "HO28", "HO29", "HO30", "HO31", "HO32", "HO36", "HO37", "HO38", "HO39", "HO40", "HO41", "HO42", "HO43", "HO44", "HO45", "HO46", "HO47", "HO48", "HO49", "HO51", "HP01", "HP02", "HP03", "HP04", "HP05", "HP06", "HP07", "HP08", "HP09", "HP10", "HP11", "HP12", "HP13", "HP14", "HP17", "HP18", "HP19", "HP20", "HP21", "HP22", "HP23", "HR17", "HR18", "HR19", "HR20", "HR22", "HR23", "HR24", "HR25", "HR26", "HR27", "HR28", "HR29", "HS01", "HS02", "HS03", "HS04", "HS05", "HS06", "HS07", "HT14", "HT16", "HT17", "HT18", "HT19", "HT20", "HT21", "HT22", "HT23", "HT24", "HU34", "HU36", "HU41", "HU44", "HU45", "HU48", "HU49", "HU54", "HU55", "HU57", "HU58", "HU59", "HU61", "HU64", "HU65", "HU67", "HU69", "HU70", "HU71", "HU72", "HU74", "HU76", "HU78", "HU80", "HU81", "HU82", "HU83", "HU84", "HU86", "HU87", "HU88", "HU89", "HU90", "HU91", "HU92", "HU93", "HU94", "HU95", "HU96", "HU97", "HU98", "HU99", "HV01", "HW13", "HW14", "HW15", "HW16", "HW17", "HW18", "HW19", "HW20", "HW21", "HW24", "HW25", "HW26", "HW27", "HW29", "HW31", "HW32", "HW33", "HW34", "HW35", "HW36", "HW37", "HW42", "HX10", "HX11", "HX12", "HX13", "HX14", "HX15", "HX16", "HX17", "HX19", "HX20", "HX50", "HX51", "HX52", "HX53", "HY01", "HY02", "RDC-K", "RDC-W", "RH01", "RH02", "U100", "U101", "U102", "U103", "U104", "U105", "U106", "U107", "U108", "U111", "U112", "U113", "U114", "U115", "U116", "U117", "U119", "U120", "U121", "U122", "U124", "U125", "U126", "U127", "U128", "U129"
]

async def sync_hierarchy():
    async with AsyncSessionLocal() as db:
        print("\n--- SYNCING DEPARTMENTS ---")
        for dept_name in DEPARTMENTS:
            slug = dept_name.lower().replace(" ", "-").replace("&", "n")
            # Upsert Department
            stmt = insert(Department).values(
                name=dept_name,
                slug=slug,
                description=f"Master Department: {dept_name}"
            ).on_conflict_do_update(
                index_elements=[Department.slug],
                set_={"name": dept_name}
            )
            await db.execute(stmt)
            print(f"Synced Dept: {dept_name} ({slug})")
        
        await db.commit()
        
        print("\n--- SYNCING LOCATIONS ---")
        updated_locs = 0
        for code in LOC_CODES:
            # Check if exists (idempotent selectivity)
            res = await db.execute(select(Location).filter(Location.name == code))
            existing = res.scalars().first()
            
            if not existing:
                db_loc = Location(
                    id=get_uuid(),
                    name=code,
                    address=f"Location {code}",
                    timezone="UTC"
                )
                db.add(db_loc)
                updated_locs += 1
            
            if (updated_locs + 1) % 50 == 0:
                print(f"Processed {updated_locs + 1} locations...")
        
        await db.commit()
        print(f"\nSUCCESS: Synced {len(DEPARTMENTS)} departments and added {updated_locs} new locations.")

if __name__ == "__main__":
    asyncio.run(sync_hierarchy())
