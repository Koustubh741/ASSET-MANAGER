# Asset Manager – Company Deployment Guide

This guide covers the steps and decisions you need when deploying the ITSM Asset Manager to your company environment.

---

## 1. Pre-deployment checklist

### 1.1 Security (do before any production deploy)

| Step | Action | Why |
|------|--------|-----|
| **SECRET_KEY** | Generate a strong random key and set it in production `.env`. Never use the default or commit it. | Used for JWT signing; weak key = compromised auth. |
| **Database password** | Use a strong, unique password for `POSTGRES_PASSWORD` / `DATABASE_URL`. | Defaults in docker-compose (e.g. `1234`) are for dev only. |
| **DEBUG** | Set `DEBUG=False` in production. | Avoids exposing stack traces and internal errors. |
| **CORS** | Add your company frontend URL(s) to `allow_origins` in `backend/app/main.py`. | Only your app should call the API; localhost is for dev. |
| **.env** | Never commit `.env`. Use `.env.example` as a template; fill real values on the server. | Prevents leaking secrets. |

**Generate a SECRET_KEY (one-time):**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 1.2 CORS – allow your company frontend

In **`backend/app/main.py`**, extend `allow_origins` with your real frontend URL(s), e.g.:

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add your company URLs, e.g.:
    "https://assets.yourcompany.com",
    "https://it.yourcompany.internal",
],
```

Use HTTPS in production. Avoid `"*"` in production.

---

## 2. Choose how you will run it

### Option A: Docker (recommended for consistency)

- **Backend + DB:** Use existing `backend/docker-compose.yml` and `backend/Dockerfile`.
- **Before deploy:** Create a production override or separate compose file that:
  - Uses strong `POSTGRES_PASSWORD` and `DATABASE_URL`.
  - Sets `DEBUG=False`.
  - Injects `SECRET_KEY` and other env from a production `.env` (not committed).
- **Frontend:** Build the Next.js app and serve it (see Section 4). You can run it in Docker too (add a `Dockerfile` and service in compose) or on the same server with Node.

**Steps:**

1. On the server, clone/copy the repo (no `.env` in repo).
2. In `backend/`, create `.env` from `.env.example` and fill production values.
3. (Optional) Use a `docker-compose.prod.yml` that overrides env and removes dev defaults.
4. Run:
   ```bash
   cd backend
   docker-compose up -d db    # start DB first
   # Run migrations (see Section 3)
   docker-compose up -d backend
   ```
5. Run DB migrations from inside the backend container or from a host with `DATABASE_URL` set (Section 3).

### Option B: Bare metal / existing servers

- **Database:** Install PostgreSQL 13+ on a server. Create database and user; set `DATABASE_URL` accordingly.
- **Backend:** Python 3.9+, install deps from `backend/requirements.txt`, run with uvicorn (e.g. behind Gunicorn + reverse proxy).
- **Frontend:** Build Next.js and serve via Node or a static/server setup (Section 4).

---

## 3. Database setup and migrations

1. **Create DB and user (if not using Docker default):**
   - Create database (e.g. `ITSM`).
   - Create a dedicated user with limited privileges (not superuser in production).

2. **Run Alembic migrations:**
   ```bash
   cd backend
   # Set DATABASE_URL in .env or export it
   alembic upgrade head
   ```

3. **Optional seed data:**
   - Use your existing scripts under `backend/scripts/` (e.g. seed users, stock) only if needed and after migrations.
   - Ensure at least one super-admin account exists for first login (e.g. as used in `verify_workflow_e2e.py` / seed).

4. **Backups:** Schedule regular PostgreSQL backups (pg_dump or your company’s backup tool) before and after deployments.

---

## 4. Frontend build and API URL

1. **Set production API URL:**
   - In `frontend/.env` (or env on the server), set:
     ```bash
     NEXT_PUBLIC_API_URL=https://api-assets.yourcompany.com
     ```
   - Use the URL where the backend will be reachable (same server or separate).

2. **Build and run:**
   ```bash
   cd frontend
   npm ci
   npm run build
   npm run start
   ```
   Or run `npm run dev` only for temporary/testing; production should use `build` + `start`.

3. **Serving:** Run behind HTTPS (reverse proxy, e.g. Nginx or company load balancer). Point the company URL (e.g. `https://assets.yourcompany.com`) to this Next.js process.

---

## 5. Production environment variables summary

**Backend (e.g. `backend/.env` or container env):**

| Variable | Production guidance |
|----------|---------------------|
| `DATABASE_URL` | Full URL to production PostgreSQL (strong password). |
| `SECRET_KEY` | Random secret (see 1.1). |
| `ALGORITHM` | Keep `HS256` unless you change code. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | e.g. 1440 (24h) or per policy. |
| `DEBUG` | `False`. |
| `COLLECT_API_TOKEN` | If you use Collect integration; keep secret. |
| `PORT` / `HOST` | e.g. 8000, 0.0.0.0 if behind proxy. |

**If using AD/LDAP sync** (`backend/scripts/ad_sync_agent.py`):

- `AD_AGENT_ID`, `LDAP_SERVER`, `LDAP_USER`, `LDAP_PASSWORD`, `LDAP_BASE_DN`, and optional group DNs. Configure and run the agent on a schedule (e.g. cron/task scheduler).

**Frontend:**

- `NEXT_PUBLIC_API_URL` = production backend URL (HTTPS).

---

## 6. Reverse proxy and HTTPS

- Put **Nginx** (or company reverse proxy) in front of:
  - Backend: e.g. `https://api-assets.yourcompany.com` → `http://localhost:8000`.
  - Frontend: e.g. `https://assets.yourcompany.com` → Next.js (e.g. `http://localhost:3000`).
- Use company TLS certificates or Let’s Encrypt; redirect HTTP → HTTPS.

---

## 7. Post-deployment

| Step | Action |
|------|--------|
| **Smoke test** | Log in via UI, open a few key flows (e.g. asset list, one request). |
| **Logs** | Ensure backend logs (and `exception.log` if used) are monitored and rotated. |
| **Backups** | Automated DB backups; test restore once. |
| **Updates** | Plan for dependency and security updates (Python, Node, Postgres). |
| **AD/LDAP** | If used, confirm sync schedule and that roles map correctly. |

---

## 8. Quick reference – minimal production steps

1. Set **SECRET_KEY**, strong DB password, **DEBUG=False**.
2. Add production **CORS** origins in `main.py`.
3. Create **backend/.env** from `.env.example` (never commit real `.env`).
4. Start **PostgreSQL** (Docker or existing).
5. Run **`alembic upgrade head`** in backend.
6. Start **backend** (Docker or uvicorn).
7. Set **NEXT_PUBLIC_API_URL** for frontend, then **`npm run build`** and **`npm run start`** (or serve via Docker).
8. Put both behind **HTTPS** and restrict **CORS** to your domain(s).

Use this as your company deployment checklist and adjust URLs and env names to match your environment.
