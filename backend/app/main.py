from fastapi import FastAPI, Request, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from .database.database import get_db, test_async_connection, get_connection_info
from .models.models import AuditLog, Asset
import traceback
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from .routers import upload, workflows, disposal, audit, assets, auth, tickets, asset_requests, users, reference, financials
from .scheduler import scheduler, setup_patch_scheduler_jobs
from .config.settings import settings
from contextlib import asynccontextmanager
import asyncio


# ── Rotating Exception Logger (5 MB max, 3 backups) ──────────────────────────
_exc_file_handler = RotatingFileHandler(
    "exception.log",
    maxBytes=5 * 1024 * 1024,   # 5 MB
    backupCount=3,
    encoding="utf-8"
)
_exc_file_handler.setLevel(logging.ERROR)
_exc_file_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s:\n%(message)s\n"
))
logging.getLogger("app.exceptions").addHandler(_exc_file_handler)
logging.getLogger("app.exceptions").setLevel(logging.ERROR)
_exc_logger = logging.getLogger("app.exceptions")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.start()
    setup_patch_scheduler_jobs()       # Phase 3 + 6: register patch sync & snapshot jobs
    print("INFO:     APScheduler started")
    _log_registered_routes()
    try:
        yield
    except asyncio.CancelledError:
        pass  # Graceful shutdown on Ctrl+C; avoid traceback from our code
    finally:
        try:
            scheduler.shutdown()
            print("INFO:     APScheduler shut down")
        except Exception:
            pass

# Create FastAPI app instance
app = FastAPI(
    title="ITSM Asset Management API",
    description="Asset Management API for ITSM Platform (Asynchronous)",
    version="1.1.0",
    lifespan=lifespan
)

# Enterprise API Router
from .api.v1.router import api_router
from .routers import financials as financials_router
app.include_router(api_router, prefix="/api/v1")
# Ensure procurement-summary is always registered (avoids 404 if router load order varies)
app.include_router(financials_router.router, prefix="/api/v1")

# Explicit route so GET /api/v1/financials/procurement-summary always exists (workaround for 404)
app.add_api_route(
    "/api/v1/financials/procurement-summary",
    financials_router.get_procurement_summary,
    methods=["GET"],
    response_model=financials_router.ProcurementSummaryResponse,
    name="get_procurement_summary_explicit",
)

def _log_registered_routes():
    """Log key routes at startup so we can verify procurement-summary etc. are registered."""
    try:
        from fastapi.routing import APIRoute
        financial_routes = [r.path for r in app.routes if isinstance(r, APIRoute) and "financial" in r.path]
        if "/api/v1/financials/procurement-summary" in financial_routes:
            print("INFO:     GET /api/v1/financials/procurement-summary is registered")
        else:
            print("WARNING:  GET /api/v1/financials/procurement-summary NOT in registered routes:", financial_routes)
    except Exception as e:
        print("INFO:     Route check skipped:", e)

# Suppress favicon 404s
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return JSONResponse(content={})

# Suppress Chrome DevTools 404s
@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
async def chrome_devtools():
    return JSONResponse(content={})

# Configure CORS
# In production, we should only allow specific origins.
# For development, we keep common localhost ports.
origins = [
    settings.FRONTEND_URL,
    settings.BACKEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add any additional origins from environment if provided (comma-separated)
if settings.ADDITIONAL_CORS_ORIGINS:
    origins.extend([o.strip() for o in settings.ADDITIONAL_CORS_ORIGINS.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debug Exception Handler - Only catch non-HTTP exceptions
from fastapi.exceptions import HTTPException as FastAPIHTTPException

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    # Don't catch HTTPException - let FastAPI handle it properly
    if isinstance(exc, FastAPIHTTPException):
        raise exc
    
    # Log to rotating file handler (max 5MB, 3 backups)
    _exc_logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "traceback": traceback.format_exc(),
                "type": type(exc).__name__
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

from fastapi.exceptions import ResponseValidationError

@app.exception_handler(ResponseValidationError)
async def validation_exception_handler(request: Request, exc: ResponseValidationError):
    with open("serialization_errors.log", "a", encoding="utf-8") as f:
        f.write(f"--- FAILED ON {request.method} {request.url} ---\n")
        f.write(str(exc) + "\n")
    return JSONResponse(
        status_code=500,
        content={"detail": "Response Serialization Error", "errors": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )


# All routers are now registered through the versioned api_router above


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ITSM Asset Management API",
        "version": "1.1.0 (Async)",
        "docs": "/docs",
        "health": "/health"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": app.version,
        "checks": {
            "api": "ok"
        }
    }
    
    # Check Database
    try:
        import asyncio
        is_db_up = await asyncio.wait_for(test_async_connection(), timeout=3.0)
        if is_db_up:
            health_status["checks"]["database"] = "connected"
        else:
            health_status["checks"]["database"] = "error"
            health_status["status"] = "degraded"
    except Exception:
        health_status["checks"]["database"] = "exception"
        health_status["status"] = "degraded"
        
    # Check Redis (Optional dependency but good for prod)
    try:
        from .utils.cache import dashboard_cache
        client = await dashboard_cache.get_client()
        import asyncio
        is_redis_up = await asyncio.wait_for(client.ping(), timeout=2.0)
        if is_redis_up:
            health_status["checks"]["redis"] = "connected"
        else:
             health_status["checks"]["redis"] = "disconnected"
             health_status["status"] = "degraded"
    except Exception:
        health_status["checks"]["redis"] = "unavailable"
        # Don't fail the whole health check if Redis is down, but mark as degraded
        health_status["status"] = "degraded"
        
    return health_status

@app.get("/api/v1/collect-status")
async def collect_status():
    return {"status": "modular_router_active"}

@app.get("/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """
    Check database connectivity (Asynchronous).
    """
    try:
        result = await db.execute(text("SELECT current_database(), version()"))
        row = result.fetchone()
        db_name, version = row
        
        info = get_connection_info()
        return {
            "status": "connected",
            "database": db_name,
            "version": version,
            "info": info
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
