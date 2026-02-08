from fastapi import FastAPI, Request, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from .database.database import get_db, test_connection, get_connection_info
from .models.models import AuditLog, Asset
import traceback
from datetime import datetime
import os
from .routers import upload, workflows, disposal, audit, assets, auth, tickets, asset_requests, users, reference, financials

# Create FastAPI app instance
app = FastAPI(
    title="ITSM Asset Management API",
    description="Asset Management API for ITSM Platform (Asynchronous)",
    version="1.1.0"
)

# Enterprise API Router
from .api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")

# Suppress favicon 404s
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return JSONResponse(content={})

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
    
    print(f"ERROR: {exc}")
    traceback.print_exc()
    with open("exception.log", "a") as f:
        f.write(f"\n--- {datetime.now()} ---\n")
        f.write(traceback.format_exc())
    
    is_debug = os.getenv("DEBUG", "false").lower() == "true"
    content = {"detail": "Internal Server Error"}
    if is_debug:
        content["detail"] = str(exc)
        content["traceback"] = traceback.format_exc()
        
    return JSONResponse(
        status_code=500,
        content=content,
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"}
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
    return {"status": "healthy"}

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
