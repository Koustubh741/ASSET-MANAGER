# Port Blocking – How to Test

## 1. Start backend and frontend

```powershell
# Terminal 1 – Backend (from project root)
cd D:\ASSET-MANAGER\backend
# Optional: set env if you use a different DB
# $env:DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/itsm"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 – Frontend
cd D:\ASSET-MANAGER\frontend
npm run dev
```

- Backend: http://127.0.0.1:8000  
- Frontend: http://localhost:3000 (or 3001)  
- API docs: http://127.0.0.1:8000/docs  

---

## 2. Test via the UI (admin flow)

1. **Login**  
   Open http://localhost:3000/login and sign in as a user with admin rights (e.g. ADMIN or SYSTEM_ADMIN).

2. **Open Port Policies**  
   Go to:  
   **http://localhost:3000/security/port-policies**

3. **Create a policy**  
   - Name: e.g. `Block RDP (test)`  
   - Scope: **Host**  
   - Direction: **Inbound**  
   - Protocol: **TCP**  
   - Port: **3389**  
   - Action: **Block**  
   - Enabled: on  
   - Click **Create Policy**.

4. **Check the list**  
   The new policy should appear in the table. Click its row.

5. **Assign a target (single device)**  
   On the policy detail page, under **Assign New Target**:  
   - Type: **Host Asset**  
   - Identifier: an asset UUID from your Assets list (e.g. open `/assets`, click an asset, copy ID from URL like `/assets/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).  
   - Click **Assign Target**.  
   The policy should show under **Assigned Targets**.

6. **Or assign to an agent (many devices)**  
   - Type: **Agent**  
   - Identifier: `agent-local` or `agent-server`  
   - Click **Assign Target**.

7. **Optional – from Agents page**  
   Go to http://localhost:3000/agents, click **Port Policies** on an agent card.  
   You should land on `/security/port-policies?agentId=...` with the list filtered to that agent’s policies (if any are assigned).

---

## 3. Test admin API with curl (no UI)

Get a JWT after login, then call the API.

**Login (get token):**

```powershell
$body = @{ username = "admin@example.com"; password = "YourPassword" } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
$token = $r.access_token
```

**List policies:**

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/port-policies" -Headers @{ Authorization = "Bearer $token" }
```

**Create policy (JSON body):**

```powershell
$policy = @{
  name = "Block RDP test"
  description = "Test policy"
  scope_type = "HOST"
  direction = "INBOUND"
  protocol = "TCP"
  port = 3389
  action = "BLOCK"
  priority = 100
  enabled = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/port-policies" -Method Post -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body $policy
```

Use the returned `id` for the next calls.

**Assign target (e.g. agent):**

```powershell
$targets = @(
  @{ target_type = "AGENT"; target_ref_id = "agent-local"; display_name = "Local Discovery"; scope = "INDIVIDUAL" }
) | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/port-policies/<POLICY_ID>/targets" -Method Post -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body $targets
```

Replace `<POLICY_ID>` with the policy UUID.

---

## 4. Test agent-facing API (desired + report)

Agents use **X-Agent-Key** (or HMAC headers). Default secret: `agent_secret_key_2026`.

**Get desired policies for an agent:**

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/agents/agent-local/port-policies/desired?agent_type=LOCAL_DISCOVERY" -Headers @{ "X-Agent-Key" = "agent_secret_key_2026" }
```

You should get `agent_id`, `config_hash`, and `rules` (empty until a policy is assigned to that agent).

**Report enforcement (after you have a policy + target):**

```powershell
$report = @{
  agent_id = "agent-local"
  items = @(
    @{ policy_id = "<POLICY_UUID>"; target_id = "<TARGET_UUID>"; status = "APPLIED"; applied_config_hash = "abc123" }
  )
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/agents/agent-local/port-policies/report" -Method Post -Headers @{ "X-Agent-Key" = "agent_secret_key_2026"; "Content-Type" = "application/json" } -Body $report
```

Use real `policy_id` and `target_id` from the policy detail page (target IDs are in Assigned Targets; policy ID in the URL).

After reporting, open the policy detail page again and check **Per-Agent Enforcement** – you should see the reported status and last reported time.

---

## 5. Quick checklist

| What to test              | How |
|---------------------------|-----|
| UI – list policies        | Open `/security/port-policies`, see table (may be empty). |
| UI – create policy        | Fill form, submit, see new row in table. |
| UI – policy detail        | Click a policy row, see edit form + targets + enforcement. |
| UI – assign target         | On detail, assign Host Asset or Agent, see it under Assigned Targets. |
| UI – agents link           | Agents page → Port Policies on a card → filtered list. |
| API – list (admin)         | GET `/api/v1/port-policies` with Bearer token. |
| API – create (admin)       | POST `/api/v1/port-policies` with JSON body + Bearer token. |
| API – desired (agent)      | GET `.../agents/agent-local/port-policies/desired` with X-Agent-Key. |
| API – report (agent)       | POST `.../agents/agent-local/port-policies/report` with X-Agent-Key + body. |
| Enforcement in UI          | After report, policy detail shows status in Per-Agent Enforcement. |

---

## 6. Troubleshooting

- **401 on admin API** – Use a valid JWT (login again and use the new `access_token`).  
- **401 on agent API** – Use header `X-Agent-Key: agent_secret_key_2026` (or your `AGENT_SECRET`).  
- **403 on admin API** – User must have role ADMIN or SYSTEM_ADMIN.  
- **Empty desired rules** – Assign the policy to target type AGENT with `target_ref_id = agent-local` (or the agent you call with), then call desired again.  
- **Migration not applied** – Run: `cd backend; alembic upgrade head`.
