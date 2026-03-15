from fastapi import APIRouter, Depends, HTTPException, status, Query, Form
from pydantic import BaseModel
from uuid import UUID
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import cast, String
from ..database.database import get_db
from ..schemas.user_schema import (
    UserCreate, UserResponse, LoginRequest, LoginResponse, 
    RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from ..schemas.exit_schema import ExitRequestResponse
from ..services import user_service, exit_service
from ..utils import auth_utils
from ..utils.auth_utils import get_current_user
from ..models.models import AssetAssignment, ByodDevice, ExitRequest, Asset, PasswordResetToken, User
from datetime import datetime, timedelta
import secrets

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# Simulated SSO Secret (In production, use Env variables)
SSO_CONFIG = {
    "google": {"client_id": "google_id", "auth_url": "https://accounts.google.com/o/oauth2/v2/auth"},
    "azure": {"client_id": "azure_id", "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"},
    "okta": {"client_id": "okta_id", "auth_url": "https://okta.com/oauth2/default/v1/authorize"}
}

async def check_user_list_access(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user is authorized to view user list.
    ADMIN/ADMIN see all. MANAGER sees department.
    """
    if current_user.role == "ADMIN" or current_user.position == "MANAGER":
        return current_user
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only ADMIN, ADMIN, or Managers can view the user list"
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
    Dependency to verify user is IT Management or Admin.
    """
    if current_user.role not in ["IT_MANAGEMENT", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires IT Management privileges"
        )
    return current_user

@router.get("/users", response_model=list[UserResponse])
async def get_users(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_user_list_access)
):
    """
    Get users, optionally filtered by status (Asynchronous).
    Managers only see their department.
    """
    department = None
    if current_user.role != "ADMIN" and current_user.position == "MANAGER":
        department = current_user.department or current_user.domain
        
    users = await user_service.get_users(db, status=status, department=department)
    return users


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
    # All new sign-ups are PENDING until System Admin activates.
    user.status = "PENDING"
    return await user_service.create_user(db=db, user=user)

@router.post("/login", response_model=LoginResponse)
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    normalized_username = username.strip().lower()
    user = await user_service.authenticate_user(db, normalized_username, password)
    if not user:
        # Check if user exists but is not active
        db_user = await user_service.get_user_by_email(db, normalized_username)
        if db_user and db_user.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is not active. Please contact administrator for activation.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Create access and refresh tokens
    token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
    access_token = auth_utils.create_access_token(data=token_data)
    refresh_token = auth_utils.create_refresh_token(data=token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh", response_model=dict)
async def refresh_access_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh the access token using a valid refresh token.
    """
    payload = auth_utils.verify_refresh_token(request.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user still exists and is active
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not active",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    new_access_token = auth_utils.create_access_token(
        data={"sub": user.email, "user_id": str(user.id), "role": user.role}
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(current_user = Depends(get_current_user)):
    """
    Logout endpoint. Since JWT tokens are stateless, the client should
    remove the token from storage. This endpoint confirms the logout action.
    For production, consider implementing a token blacklist using Redis.
    """
    return {
        "status": "success",
        "message": "Successfully logged out. Please remove the token from client storage."
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current authenticated user information.
    Returns the user object associated with the provided JWT token.
    """
    return current_user


class PlanUpdate(BaseModel):
    plan: str  # STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE


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
    user = await user_service.get_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if hasattr(user, "plan"):
        user.plan = body.plan
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/sso/login/{provider}")
async def sso_login(provider: str):
    """
    Initiate SSO login by redirecting to the provider.
    """
    if provider not in SSO_CONFIG:
        raise HTTPException(status_code=400, detail="Unsupported SSO provider")
    
    # In a real app, we would return a RedirectResponse here
    # return RedirectResponse(url=f"{SSO_CONFIG[provider]['auth_url']}?client_id=...")
    redirect_uri = f"http://localhost:3000/login?provider={provider}"
    return {
        "provider": provider,
        "redirect_url": f"{SSO_CONFIG[provider]['auth_url']}?client_id={SSO_CONFIG[provider]['client_id']}&response_type=code&scope=openid%20profile%20email&redirect_uri={redirect_uri}"
    }


@router.get("/sso/callback/{provider}", response_model=LoginResponse)
async def sso_callback(
    provider: str, 
    code: str = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Handle SSO callback after user authenticates with provider.
    """
    if provider not in SSO_CONFIG:
        raise HTTPException(status_code=400, detail="Unsupported SSO provider")
    
    # SIMULATION: In a real app, we would exchange the 'code' for an 'id_token' and 'access_token'
    # For this implementation, we simulate the user data returned by the provider
    if code == "SUCCESS_CODE":
        user_info = {
            "sso_id": f"sso_{provider}_12345",
            "email": "sso_user@example.com",
            "full_name": "SSO Test User"
        }
    else:
        # For simulation, we'll allow the code to be the email for testing
        user_info = {
            "sso_id": f"sso_{provider}_{code}",
            "email": code if "@" in code else f"{code}@example.com",
            "full_name": f"SSO {code}"
        }

    # Sync user with our database
    user = await user_service.sync_sso_user(
        db, 
        sso_provider=provider,
        sso_id=user_info["sso_id"],
        email=user_info["email"],
        full_name=user_info["full_name"]
    )

    # Create tokens (standard JWT flow)
    token_data = {"sub": user.email, "user_id": str(user.id), "role": user.role}
    access_token = auth_utils.create_access_token(data=token_data)
    refresh_token = auth_utils.create_refresh_token(data=token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
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
            id=uuid.uuid4(),
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
    Allow access to System Admin, Asset Manager, and IT Management via JWT token.
    """
    allowed_roles = ["ADMIN", "ASSET_MANAGER", "IT_MANAGEMENT"]
    if current_user.role not in allowed_roles:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role {current_user.role} not authorized"
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
                "user_department": user.department
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
    allowed_roles = ["ASSET_MANAGER", "ASSET_MANAGER", "ADMIN", "ADMIN"]
    if manager.role not in allowed_roles:
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
    if it_manager.role not in ["IT_MANAGEMENT", "ADMIN", "ADMIN"]:
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
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Check for existing valid tokens and mark them as used/inactive? 
    # For now, just create a new one.
    reset_token = PasswordResetToken(
        id=uuid.uuid4(),
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
            PasswordResetToken.expires_at > datetime.utcnow()
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
