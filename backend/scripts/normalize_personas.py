import asyncio
import sys
import os
import json
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add root and backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import User, Department

async def normalize_personas():
    async with AsyncSessionLocal() as db:
        try:
            # 1. Load the Mapping
            mapping_path = os.path.join(os.getcwd(), 'backend', 'scratch', 'persona_mapping_v3.json')
            if not os.path.exists(mapping_path):
                print(f"Mapping not found at {mapping_path}")
                return
                
            with open(mapping_path, 'r') as f:
                persona_map = json.load(f)
                
            # 2. Get All Users with Department objects
            result = await db.execute(select(User).options(selectinload(User.dept_obj)))
            users = result.scalars().all()
            print(f"Normalizing {len(users)} users...")
            
            # 3. Define Standard Generic Personas
            GENERIC_SET = {
                "HEAD", "MANAGER", "EXECUTIVE", "SENIOR_EXECUTIVE", "ASSISTANT_MANAGER", "JUNIOR_EXECUTIVE", "SUPPORT_LEAD", "TRAINER"
            }
            
            updated_count = 0
            for user in users:
                original_persona = user.persona
                dept = user.dept_obj
                
                if not dept:
                    # If no dept object, attempt a fallback to generic or skip
                    current_p = (user.persona or "").upper()
                    if current_p and current_p in GENERIC_SET:
                        user.persona = current_p
                    if original_persona != user.persona:
                        updated_count += 1
                    continue
                    
                # Pre-normalization: Standardize Department Names
                dept_name = dept.name.upper()
                if dept_name == "TECHNOLOGY":
                    dept_name = "IT"
                    
                valid_list = persona_map.get(dept_name, [])
                valid_values = {p['value'] for p in valid_list}
                
                # Clean current persona string
                cp_raw = (user.persona or "").upper().strip()
                current_persona = cp_raw.replace(" ", "_").replace("-", "_").replace("/", "_")
                
                # 1. Check if current is already valid for dept
                if current_persona in valid_values:
                    user.persona = current_persona
                    if original_persona != user.persona:
                        updated_count += 1
                    continue
                
                # 2. Check if current is a generic role
                if current_persona in GENERIC_SET:
                    user.persona = current_persona
                    if original_persona != user.persona:
                        updated_count += 1
                    continue
                    
                # 3. Attempt to find best match in the valid list (prefix or substring)
                best_match = None
                for p in valid_list:
                    if current_persona in p['value'] or p['value'] in current_persona:
                        best_match = p['value']
                        break
                
                if best_match:
                    user.persona = best_match
                else:
                    # 4. Default fallback based on hierarchy or position
                    if user.position == "MANAGER":
                        user.persona = "MANAGER"
                    else:
                        user.persona = "EXECUTIVE"
                
                if original_persona != user.persona:
                    updated_count += 1
                
            await db.commit()
            print(f"Normalization complete. {updated_count} users updated.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error during normalization: {e}")

if __name__ == "__main__":
    asyncio.run(normalize_personas())
