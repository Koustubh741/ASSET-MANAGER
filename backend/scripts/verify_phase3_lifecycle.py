import asyncio
import httpx
from datetime import datetime

API_URL = "http://localhost:8000/api/v1"

async def test_phase3_lifecycle():
    print("--- Phase 3 Lifecycle Integration Test ---")
    
    async with httpx.AsyncClient() as client:
        # Step 1: Login as Operations (Requestor)
        res = await client.post(f"{API_URL}/auth/login", data={"username": "coo@enterprise.com", "password": "password123"})
        ops_token = res.json().get("access_token")
        ops_headers = {"Authorization": f"Bearer {ops_token}"}
        
        # Step 2: Login as Legal (Receiver)
        res = await client.post(f"{API_URL}/auth/login", data={"username": "legalmgr@cachedigitch.com", "password": "password123"})
        legal_token = res.json().get("access_token")
        legal_headers = {"Authorization": f"Bearer {legal_token}"}
        
        # Step 3: Login as Finance (Transferred Receiver)
        res = await client.post(f"{API_URL}/auth/login", data={"username": "finance_mgr@enterprise.com", "password": "password123"})
        finance_token = res.json().get("access_token")
        finance_headers = {"Authorization": f"Bearer {finance_token}"}
        
        # Get Group IDs
        groups_res = await client.get(f"{API_URL}/groups/", headers=ops_headers)
        groups_data = groups_res.json()
        print(f"DEBUG: groups_data: {groups_data}")
        groups = groups_data.get('items', groups_data) if isinstance(groups_data, dict) else groups_data
        
        legal_group_id = next((g['id'] for g in groups if isinstance(g, dict) and g.get('name') == 'Legal Department'), None)
        finance_group_id = next((g['id'] for g in groups if isinstance(g, dict) and g.get('name') == 'Finance Department'), None)
        
        print(f"DEBUG: Legal Group ID: {legal_group_id}")
        print(f"DEBUG: Finance Group ID: {finance_group_id}")
        
        if not legal_group_id or not finance_group_id:
            print("ERROR: Could not find required assignment groups.")
            return

        print("\n[Scenario A] Ticket Creation (Ops -> Legal)")
        ticket_data = {
            "subject": "Phase 3 Test: Contract Review",
            "description": "Urgent review needed.",
            "priority": "Medium",
            "assignment_group_id": legal_group_id
        }
        create_res = await client.post(f"{API_URL}/tickets/", json=ticket_data, headers=ops_headers)
        ticket = create_res.json()
        ticket_id = ticket['id']
        initial_sla = ticket.get('sla_deadline')
        print(f"Created Ticket ID: {ticket_id}")
        print(f"Initial SLA Deadline (Standard): {initial_sla}")
        
        print("\n[Scenario B] Priority Escalation")
        # Legal Manager downgrades SLA (Priority Escalation)
        update_res = await client.patch(f"{API_URL}/tickets/{ticket_id}", json={"priority": "Critical"}, headers=legal_headers)
        updated_ticket = update_res.json()
        new_sla = updated_ticket.get('sla_deadline')
        print(f"Updated Priority: {updated_ticket['priority']}")
        print(f"New SLA Deadline (Critical): {new_sla}")
        if initial_sla == new_sla:
            print("WARNING: SLA Deadline did not recalculate on priority change!")
            
        print("\n[Scenario C] Technician Delegation")
        # Assign to self (Classic Connect)
        legal_res = await client.get(f"{API_URL}/auth/me", headers=legal_headers)
        tech_id = legal_res.json()['id']
        assign_res = await client.patch(f"{API_URL}/tickets/{ticket_id}", json={"assigned_to_id": tech_id}, headers=legal_headers)
        print(f"Assigned to: {assign_res.json().get('assigned_to_id', 'FAILED')} (Expected: {tech_id})")
        print(f"Status changed to: {assign_res.json().get('status')}")

        print("\n[Scenario D] Re-Routing (Legal -> Finance)")
        # Legal realizes this needs Finance budget.
        reroute_res = await client.patch(f"{API_URL}/tickets/{ticket_id}", json={"assignment_group_id": finance_group_id}, headers=legal_headers)
        rerouted_ticket = reroute_res.json()
        print(f"New Assignment Group: {rerouted_ticket.get('assignment_group_name')}")
        print(f"Assigned Technician cleared? : {'YES' if not rerouted_ticket.get('assigned_to_id') else 'NO (GHOST ASSIGNMENT BUG)'}")

        print("\n[Scenario E] Resolution")
        # Finance manager resolves it
        resolve_res = await client.patch(f"{API_URL}/tickets/{ticket_id}", json={"status": "RESOLVED"}, headers=finance_headers)
        resolved_ticket = resolve_res.json()
        print(f"Final Status: {resolved_ticket.get('status')}")
        print(f"Resolution Percentage: {resolved_ticket.get('resolution_percentage')}%")

        print("\n--- Summary ---")
        print("Please review warnings above to identify required code fixes.")

if __name__ == "__main__":
    asyncio.run(test_phase3_lifecycle())
