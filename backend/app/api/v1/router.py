from fastapi import APIRouter
from app.routers import upload, workflows, disposal, audit, auth, tickets, asset_requests, assets, users, reference, financials, locations, software, maintenance, collect, agents, alerts

api_router = APIRouter()

# routers already define their own prefixes
api_router.include_router(upload.router)
api_router.include_router(workflows.router)
api_router.include_router(disposal.router)
api_router.include_router(audit.router)
api_router.include_router(auth.router)
api_router.include_router(tickets.router)
api_router.include_router(asset_requests.router)
api_router.include_router(assets.router)
api_router.include_router(users.router)
api_router.include_router(reference.router)
api_router.include_router(financials.router)
api_router.include_router(locations.router)
api_router.include_router(software.router)
api_router.include_router(maintenance.router)
api_router.include_router(collect.router)
api_router.include_router(agents.router)
api_router.include_router(alerts.router)
