from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, Request, BackgroundTasks, Response, Cookie
import logging
logger_auth = logging.getLogger(__name__)
from pydantic import BaseModel
from uuid import UUID
import uuid
from ..utils.uuid_gen import get_uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import cast, String
from ..database.database import get_db, AsyncSessionLocal
from ..schemas.user_schema import (
    UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse, 
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from ..schemas.common_schema import PaginatedResponse
from ..schemas.exit_schema import ExitRequestResponse
from ..schemas.discovery_schema import UserSyncPayload
from ..services import user_service, exit_service, user_sync_service
from ..utils import auth_utils
from ..utils.auth_utils import get_current_user
from ..models.models import AssetAssignment, ByodDevice, ExitRequest, Asset, PasswordResetToken, User, AuditLog
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# Phase 5.2: SSO — real OAuth flows for Google and Azure AD
from ..services.sso_service import SSOService, SSOProvider
from fastapi.responses import RedirectResponse
import secrets as _secrets

# Legacy stub config kept for reference only (real config now in sso_service.py)
_SSO_PROVIDERS = SSOProvider.SUPPORTED

STAFF_ROLES = ["ADMIN", "SUPPORT", "MANAGER"]

async def check_user_list_access(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user is authorized to view user list.
    ADMIN sees all. SUPPORT/MANAGER sees department.
    """
    if current_user.role in STAFF_ROLES:
        return current_user
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only Staff (ADMIN, SUPPORT, MANAGER) can view the user list"
    )

async def check_ADMIN(
    current_user = Depends(get_current_user)
):
    """
    Dependency to verify user is an Admin or System Admin.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Admin privileges"
        )
    return current_user

async def check_MANAGER(
    current_user = Depends(get_current_user)
):
    """
    Dependency to verify user is a Manager.
    """
    if current_user.position != "MANAGER" and current_user.role != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Manager privileges"
        )
    return current_user

async def check_IT_MANAGEMENT(
    current_user = Depends(get_current_user)
):
    """
    Dependency to verify user is IT Management (SUPPORT in IT) or Admin.
    """
    is_admin = current_user.role == "ADMIN"
    is_it_staff = (
        (current_user.dept_obj.name.upper() if current_user.dept_obj else str(current_user.department).upper()) == "IT" or 
        str(current_user.domain).upper() == "IT"
    )
                     
    if not (is_admin or is_it_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires IT Management or IT Support privileges"
        )
    return current_user

@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def get_users(
    status: str = None,
    department: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_user_list_access)
):
    """
    Get users, optionally filtered by status and department (Asynchronous).
    Staff (SUPPORT/MANAGER) are restricted to their own department if not filtering explicitly.
    """
    try:
        is_admin = getattr(current_user, 'role', '') == 'ADMIN'
        
        # If not admin, force departmental filter if not already provided or if trying to see other departments
        if not is_admin:
            user_dept = getattr(current_user, 'department', None) or getattr(current_user, 'domain', None)
            # If user provides a department, verify it matches theirs
            if department and str(department).lower() != str(user_dept).lower():
                # For non-admins, they can only request their own department
                department = user_dept
            elif not department:
                department = user_dept
            
        users, total = await user_service.get_users(db, status=status, department=department)
        return PaginatedResponse(
            total=total,
            page=1, # Default as these aren't currently used in this endpoint's logic
            size=len(users),
            data=users
        )
    except Exception as e:
        import logging
        logging.error(f"Error in get_users: {str(e)}")
        raise HTTPException(
            status_code=501 if "Greenlet" in str(e) else 500,
            detail=f"User service error: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """
    Get a single user by ID (Asynchronous).
    """
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/register")
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await user_service.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Auto-approve all new sign-ups
    user.status = "ACTIVE"
    return await user_service.create_user(db=db, user=user)


@router.post("/login", response_model=LoginResponse)
async def login(
    background_tasks: BackgroundTasks,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    # ROOT FIX: Explicitly handle potential multi-layer encoding from legacy clients
    from urllib.parse import unquote_plus
    
    # Handle username normalization
    clean_username = unquote_plus(username.strip()).lower()
    # Handle potential double-encoding or special characters in passwords
    clean_password = unquote_plus(password)

    user = await user_service.authenticate_user(db, clean_username, clean_password)
    
    if not user:
        # Check if user exists but is not active
        db_user = await user_service.get_user_by_email(db, clean_username)
        
        # ROOT FIX: Background Audit Logging for Failure
        async def log_failure():
            async with AsyncSessionLocal() as audit_db:
                audit_log = AuditLog(
                    id=get_uuid(),
                    entity_type="USER",
                    entity_id=clean_username,
                    action="LOGIN_FAILED",
                    details={"reason": "Incorrect credentials" if not db_user else f"Status: {db_user.status}"}
                )
                audit_db.add(audit_log)
                await audit_db.commit()

        background_tasks.add_task(log_failure)

        if db_user and db_user.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account is not active (Status: {db_user.status}). Please contact administrator.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ROOT FIX: Background Audit Logging for Success
    async def log_success(u_id, u_email, u_role):
        async with AsyncSessionLocal() as audit_db:
            audit_log = AuditLog(
                id=get_uuid(),
                entity_type="USER",
                entity_id=str(u_id),
                action="LOGIN_SUCCESS",
                performed_by=u_id,
                details={"email": u_email, "role": u_role}
            )
            audit_db.add(audit_log)
            await audit_db.commit()

    background_tasks.add_task(log_success, user.id, user.email, user.role)

    # Create access and refresh tokens
    token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
    access_token = auth_utils.create_access_token(data=token_data)
    refresh_token = auth_utils.create_refresh_token(data=token_data)
    
    # ROOT FIX: Set refresh token and access token as httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax", # Required for cross-origin localhost development
        secure=False    # Set to True in production with HTTPS
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh")
async def refresh_token_endpoint(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str = Cookie(None)
):
    if not refresh_token:
        # Explicitly clear the cookie if it was sent but is null/empty
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = auth_utils.verify_refresh_token(refresh_token)
    except Exception:
        # ROOT FIX: Explicitly clear the invalid cookie on failure
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await user_service.get_user(db, user_id)
    if not user or user.status != "ACTIVE":
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new tokens (Rotation)
    token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
    new_access_token = auth_utils.create_access_token(data=token_data)
    new_refresh_token = auth_utils.create_refresh_token(data=token_data)
    
    # ROOT FIX: Rotate the access and refresh tokens by setting new cookies
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }



@router.post("/logout")
async def logout(response: Response, current_user = Depends(get_current_user)):
    """
    Logout endpoint. Clears the authentication cookies.
    """
    response.delete_cookie("refresh_token")
    response.delete_cookie("access_token")
    return {
        "status": "success",
        "message": "Successfully logged out. Session cookies cleared."
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current authenticated user information.
    Returns the user object associated with the provided JWT token.
    """
    return current_user


@router.api_route("/sync", methods=["GET", "POST"])
async def sync_users_legacy_alias(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Legacy/Semantic Alias for User Synchronization.
    Bridges the /api/auth/sync route (both GET and POST).
    Security is checked manually to avoid middleware deadlocks during browser navigation.
    """
    # 1. Manual Admin Check
    try:
        # Extract token from header or query
        token = request.headers.get("Authorization", "").replace("Bearer ", "") or request.query_params.get("token")
        if not token:
             raise HTTPException(status_code=401, detail="Authentication token required")
             
        user = await auth_utils.get_current_user(token=token)
        if user.role != "ADMIN":
             raise HTTPException(status_code=403, detail="Requires Admin privileges")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    try:
        # 2. Process Payload
        if request.method == "POST":
            data = await request.json()
            payload = UserSyncPayload(**data)
        else:
            payload = UserSyncPayload(
                source_domain="localhost-manual",
                users=[]
            )

        # 3. Trigger Sync
        results = await user_sync_service.sync_ad_users(db, payload)
        return {
            "status": "success",
            "method": request.method,
            "message": f"Successfully synced {results['created']} new and {results['updated']} existing users",
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User sync error: {str(e)}"
        )


class PlanUpdate(BaseModel):
    plan: str  # STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update the current authenticated user's profile information.
    """
    updated_user = await user_service.update_user(db, current_user.id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@router.patch("/me/plan", response_model=UserResponse)
async def update_my_plan(
    body: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Update the current user's plan (for demo/testing). In production, plan would be set by billing.
    """
    # Root Fix: Demo endpoint - allows self plan update for testing; restrict to admin or remove in production
    valid_plans = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]
    if body.plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {valid_plans}")
    updated_user = await user_service.update_user(db, current_user.id, UserUpdate(plan=body.plan))
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@router.get("/sso/status")
async def sso_status():
    """
    Returns which SSO providers are configured (have credentials in .env).
    Safe to call from the login page to conditionally show SSO buttons.
    """
    return {
        "google": SSOService.is_configured(SSOProvider.GOOGLE),
        "azure":  SSOService.is_configured(SSOProvider.AZURE),
    }


@router.get("/sso/login/{provider}")
async def sso_login(provider: str):
    """
    Phase 5.2: Redirect the browser to the real OAuth consent screen.
    Supported providers: google, azure
    """
    if provider not in _SSO_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported SSO provider: {provider!r}")

    if not SSOService.is_configured(provider):
        raise HTTPException(
            status_code=503,
            detail=f"{provider.title()} SSO is not configured. Add credentials to .env."
        )

    state = _secrets.token_urlsafe(16)
    auth_url = SSOService.get_authorization_url(provider, state=state)
    # Return URL so the frontend can redirect (avoids CORS issues with direct 302)
    return {"provider": provider, "redirect_url": auth_url, "state": state}


@router.get("/sso/{provider}/callback", response_model=LoginResponse)
async def sso_callback(
    provider: str,
    response: Response,
    code: str = Query(..., description="Authorization code from the OAuth provider"),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Phase 5.2: Exchange the authorization code for user info, upsert the user
    in the database, and return a standard JWT access token.
    """
    if provider not in _SSO_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported SSO provider: {provider!r}")

    if not SSOService.is_configured(provider):
        raise HTTPException(status_code=503, detail=f"{provider.title()} SSO credentials not configured.")

    try:
        user_info = await SSOService.exchange_code(provider, code)
    except Exception as e:
        logger_auth.error("SSO code exchange failed for %s: %s", provider, e)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to authenticate with {provider.title()}: {e}"
        )

    if not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Provider did not return an email address.")

    # Upsert user (find by SSO id, then by email, then create)
    user = await user_service.sync_sso_user(
        db,
        sso_provider=provider,
        sso_id=user_info["sso_id"],
        email=user_info["email"],
        full_name=user_info["full_name"],
    )

    token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
    access_token  = auth_utils.create_access_token(data=token_data)
    refresh_token = auth_utils.create_refresh_token(data=token_data)

    # ROOT FIX: Set tokens as httpOnly cookies for SSO
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )

    return {
        "access_token":  access_token,
        "token_type":    "bearer",
        "user":          user,
    }


@router.post("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """
    Activate a user account.
    """
    activated_user = await user_service.activate_user(db, user_id)
    if not activated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return activated_user


@router.post("/users/{user_id}/exit", response_model=UserResponse)
async def initiate_exit(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """
    Initiate user exit / resignation workflow (Asynchronous).
    """
    try:
        user = await user_service.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Update user status to EXITING
        user.status = "EXITING"

        # 1. Get assignments from history table
        result_asn = await db.execute(select(AssetAssignment).filter(AssetAssignment.user_id == user_id))
        assignments = result_asn.scalars().all()
        
        # 2. Get direct current assignments from Asset table
        result_assets = await db.execute(select(Asset).filter(
            (Asset.assigned_to == str(user_id)) | (Asset.assigned_to == user.full_name) | (Asset.assigned_to == user.email)
        ))
        direct_assets = result_assets.scalars().all()
        
        assets_snapshot = []
        seen_asset_ids = set()
        
        for a in direct_assets:
            if str(a.id) not in seen_asset_ids:
                assets_snapshot.append({
                    "asset_id": str(a.id),
                    "asset_name": a.name,
                    "asset_type": a.type,
                    "location": a.location,
                    "assigned_at": a.assignment_date.isoformat() if a.assignment_date else None,
                })
                seen_asset_ids.add(str(a.id))
        
        for a in assignments:
            if str(a.asset_id) not in seen_asset_ids:
                asset_obj_res = await db.execute(select(Asset).filter(Asset.id == a.asset_id))
                asset_obj = asset_obj_res.scalars().first()
                assets_snapshot.append({
                    "asset_id": str(a.asset_id),
                    "asset_name": asset_obj.name if asset_obj else "Unknown Asset",
                    "asset_type": asset_obj.type if asset_obj else "Unknown",
                    "location": a.location,
                    "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
                })
                seen_asset_ids.add(str(a.asset_id))

        result_byod = await db.execute(select(ByodDevice).filter(ByodDevice.owner_id == user_id))
        byod_devices = result_byod.scalars().all()

        byod_snapshot = [
            {
                "device_id": str(d.id),
                "device_model": d.device_model,
                "os_version": d.os_version,
                "serial_number": d.serial_number,
                "compliance_status": d.compliance_status,
            }
            for d in byod_devices
        ]

        exit_request = ExitRequest(
            id=get_uuid(),
            user_id=user_id,
            status="OPEN",
            assets_snapshot=assets_snapshot,
            byod_snapshot=byod_snapshot,
        )
        db.add(exit_request)
        await db.commit()
        await db.refresh(user)

        return user
    except Exception as e:
        import traceback
        with open("d:/ASSET-MANAGER/debug_errors.log", "a") as f:
            f.write(f"\n--- INITIATE EXIT ERROR ---\n{str(e)}\n")
            traceback.print_exc(file=f)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/users/{user_id}/disable", response_model=UserResponse)
async def disable_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """
    Final step of exit workflow (Asynchronous).
    """
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # PRE-CHECK: Ensure no assets are assigned
    from sqlalchemy import func
    due_assets_res = await db.execute(select(func.count(Asset.id)).filter(
        (Asset.assigned_to == str(user.id)) | (Asset.assigned_to == user.full_name) | (Asset.assigned_to == user.email)
    ))
    due_assets = due_assets_res.scalar()
    
    due_byod_res = await db.execute(select(func.count(ByodDevice.id)).filter(ByodDevice.owner_id == user.id))
    due_byod = due_byod_res.scalar()

    if due_assets > 0 or due_byod > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot deactivate user. User still has {due_assets} company assets and {due_byod} BYOD devices."
        )

    user.status = "DISABLED"
    await db.commit()
    await db.refresh(user)

    return user

async def check_exit_access(
    current_user = Depends(auth_utils.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Allow access to System Admin, Support Agents, and Managers via JWT token.
    Normalized for Phase 2 base roles.
    """
    allowed_roles = ["ADMIN", "SUPPORT", "MANAGER"]
    if current_user.role not in allowed_roles:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role {current_user.role} not authorized for exit processing"
        )
    return current_user

@router.get("/exit-requests", response_model=list[ExitRequestResponse])
async def get_exit_requests(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_exit_access)
):
    try:
        print(f"DEBUG: get_exit_requests called by {admin_user.email} role={admin_user.role}")
        # Join with User to get details
        query = select(ExitRequest, User).join(User, ExitRequest.user_id == User.id)
        if status:
            query = query.filter(ExitRequest.status == status)
        result = await db.execute(query)
        rows = result.all()
        
        res = []
        for exit_req, user in rows:
            res.append({
                "id": exit_req.id,
                "user_id": exit_req.user_id,
                "status": exit_req.status,
                "assets_snapshot": exit_req.assets_snapshot,
                "byod_snapshot": exit_req.byod_snapshot,
                "created_at": exit_req.created_at,
                "updated_at": exit_req.updated_at,
                "user_name": user.full_name,
                "user_email": user.email,
                "user_department": user.dept_obj.name if user.dept_obj else user.department,
            })
            
        print(f"DEBUG: Found {len(res)} exit requests")
        return res
    except Exception as e:
        import traceback
        with open("d:/ASSET-MANAGER/debug_errors.log", "a") as f:
            f.write(f"\n--- EXIT REQ ERROR ---\n{str(e)}\n")
            traceback.print_exc(file=f)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exit-requests/{exit_request_id}/process-assets")
async def process_exit_assets(
    exit_request_id: UUID,
    db: AsyncSession = Depends(get_db),
    manager = Depends(check_exit_access)
):
    # Phase 2: Decoupled Role check
    if manager.role not in ["SUPPORT", "MANAGER", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
    
    result = await db.execute(select(ExitRequest).filter(ExitRequest.id == exit_request_id))
    exit_request = result.scalars().first()
    if not exit_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exit request not found")
    
    # Process assets from snapshot
    assets_processed = []
    if exit_request.assets_snapshot:
        for asset_snapshot in exit_request.assets_snapshot:
            asset_id = asset_snapshot.get("asset_id")
            if asset_id:
                ares = await db.execute(select(Asset).filter(Asset.id == asset_id))
                asset = ares.scalars().first()
                if asset:
                    asset.status = "In Stock"
                    asset.assigned_to = None
                    asset.assigned_by = None
                    asset.assignment_date = None
                    assets_processed.append(asset_id)
        
    if exit_request.status == "BYOD_PROCESSED":
        exit_request.status = "READY_FOR_COMPLETION"
    elif exit_request.status == "OPEN":
        exit_request.status = "ASSETS_PROCESSED"
    
    await db.commit()
    await db.refresh(exit_request)
    return {"status": "success", "assets_processed": assets_processed, "exit_request_status": exit_request.status}

@router.post("/exit-requests/{exit_request_id}/process-byod")
async def process_exit_byod(
    exit_request_id: UUID,
    db: AsyncSession = Depends(get_db),
    it_manager = Depends(check_exit_access)
):
    if it_manager.role not in ["SUPPORT", "MANAGER", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
    
    result = await db.execute(select(ExitRequest).filter(ExitRequest.id == exit_request_id))
    exit_request = result.scalars().first()
    if not exit_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exit request not found")
    
    byod_processed = []
    if exit_request.byod_snapshot:
        for byod_snapshot in exit_request.byod_snapshot:
            device_id = byod_snapshot.get("device_id")
            if device_id:
                bres = await db.execute(select(ByodDevice).filter(ByodDevice.id == device_id))
                byod = bres.scalars().first()
                if byod:
                    byod.compliance_status = "DE_REGISTERED"
                    byod_processed.append(device_id)
        
    if exit_request.status == "ASSETS_PROCESSED":
        exit_request.status = "READY_FOR_COMPLETION"
    elif exit_request.status == "OPEN":
        exit_request.status = "BYOD_PROCESSED"
    
    await db.commit()
    await db.refresh(exit_request)
    return {"status": "success", "byod_processed": byod_processed}

@router.post("/exit-requests/{exit_request_id}/complete")
async def complete_exit_request(
    exit_request_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    result = await db.execute(select(ExitRequest).filter(cast(ExitRequest.id, String) == str(exit_request_id)))
    exit_request = result.scalars().first()
    if not exit_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    
    user = await user_service.get_user(db, exit_request.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Verify Assets reclamation
    if exit_request.assets_snapshot:
        for asset_info in exit_request.assets_snapshot:
            asset_id = asset_info.get("asset_id")
            if asset_id:
                ares = await db.execute(select(Asset).filter(Asset.id == asset_id))
                asset = ares.scalars().first()
                if asset and (asset.assigned_to in [str(user.id), user.full_name, user.email]):
                     raise HTTPException(status_code=403, detail=f"Asset {asset.name} still assigned")

    # Verify BYOD
    if exit_request.byod_snapshot:
        for byod_info in exit_request.byod_snapshot:
            device_id = byod_info.get("device_id")
            if device_id:
                bres = await db.execute(select(ByodDevice).filter(ByodDevice.id == device_id))
                byod = bres.scalars().first()
                if byod and byod.compliance_status not in ["DE_REGISTERED", "DECOMMISSIONED"]:
                    raise HTTPException(status_code=403, detail="BYOD still active")
    
    exit_request.status = "COMPLETED"
    user.status = "DISABLED"
    await db.commit()
    return {"status": "success"}

@router.post("/users/{user_id}/finalize-exit")
async def finalize_user_exit(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    try:
        summary = await exit_service.handle_user_exit(db, user_id, actor_id=admin_user.id)
        return {"status": "success", "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Handle forgot password request. 
    Generates a secure token and saves it. 
    In professional production, this would send an email.
    """
    user = await user_service.get_user_by_email(db, request.email)
    if not user:
        # For security, we don't reveal if the user exists
        return {"message": "If this email is registered, you will receive a reset link."}
    
    # Generate token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # Check for existing valid tokens and mark them as used/inactive? 
    # For now, just create a new one.
    reset_token = PasswordResetToken(
        id=get_uuid(),
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    await db.commit()
    
    # SIMULATION: Log the token so we can use it in Dev/MVP without email server
    print(f"DEBUG: Password reset token for {user.email}: {token}")
    
    return {
        "message": "If this email is registered, you will receive a reset link.",
        "debug_token": token # Return in MVP for easier testing
    }

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset password using a token.
    """
    # Find token
    result = await db.execute(
        select(PasswordResetToken).filter(
            PasswordResetToken.token == request.token,
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > datetime.now(timezone.utc)
        )
    )
    db_token = result.scalars().first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    success = await user_service.update_user_password(db, db_token.user_id, request.new_password)
    if not success:
         raise HTTPException(status_code=500, detail="Failed to update password")
    
    # Mark token as used
    db_token.is_used = True
    await db.commit()
    
    return {"status": "success", "message": "Password has been reset successfully"}
