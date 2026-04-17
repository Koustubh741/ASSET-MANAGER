from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List, Union, Dict, Any
from datetime import datetime
from uuid import UUID

def normalize_field_value(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    # Standardize common acronyms
    if v.upper() in ["IT", "HR"]:
        return v.upper()
    return v.strip().title()

# Functional Persona Mapping for Validation
PERSONA_MAP = {
    "ADMIN": ["AC_TECHNICIAN", "ADMIN_HEAD", "ADMIN_MANAGER", "DRIVER", "ELECTRICIAN", "FACILITY_MANAGER", "HK", "INTERNAL_SECURITY", "MIS_EXECUTIVE", "OFFICE_BOY", "RDC__HUB_MANAGER", "RECEPTIONIST", "SENIOR_EXECUTIVE"],
    "B&M": ["ASST_DIV_HEAD", "ASST_DIV_PD_HEAD", "BUYER", "CAD_JR.EXECUTIVE", "CAD_PATTERN_MASTER", "CAT_PLANNER", "DEPT_HEAD", "DIV_HEAD", "FAB_DIV_HEAD", "FAB_HEAD", "FAB_JR.EXECUTIVE", "HELPER", "JR_EXECUTIVE", "JR_DZNR", "LOCATION_HEAD", "LOCATION_QC_BUYER_EDP", "MARKET_BUYER", "MDM_HEAD", "MDM_JR.EXECUTIVE", "MDM_SR.EXECUTIVE", "MERCHANT", "OB_JR.EXECUTIVE", "OB_HEAD", "PATTERN_MASTER", "PC_ASST_HEAD", "PC_HEAD", "PD_HEAD", "PO_OFFICER", "PRD_HEAD", "QC_DIV_HEAD", "QC_HEAD", "SAMPLING_HEAD", "SR_EXECUTIVE", "SUB_DIV", "SUB_DIV_PD_DZNR_HEAD", "T&A", "TAILOR"],
    "BD": ["ASSISTANT_BD_HEAD", "BD_HEAD", "EXECUTIVE", "REGIONAL_MANAGER"],
    "F&A": ["ASSISTANT_MANAGER", "CFO", "DGM", "EXECUTIVE", "JUNIOR_EXECUTIVE", "MANAGER", "SENIOR_EXECUTIVE"],
    "HR": ["ASSISTANT_HR_HEAD", "ASSISTANT_MANAGER", "EXECUTIVE", "HR_HEAD", "MANAGER", "SENIOR_EXECUTIVE", "TRAINER"],
    "INVENTORY": ["ASSISTANT_MANAGER", "EXECUTIVE", "JUNIOR_EXECUTIVE", "MANAGER", "SENIOR_EXECUTIVE"],
    "IT": ["ABAP_LEAD", "ABAPER", "AI_ENGINEER", "ANALYTICS_LEAD", "ASSISTANT_HEAD_ERP_APPS_NON_SAP", "AXAPTA_SUPPORT_MANAGER", "BASIS_HEAD", "CIO", "DATA_ANALYST", "DBA", "DEVELOPER", "DIGITAL_TRANSFORMATION__HEAD", "DT_ASSISTANT", "EA_TO_CIO", "EA_TO_HEAD_ERP_APPS___SAP", "EXECUTIVE", "FICO_FUNCTIONAL", "HEAD_ERP_APPS___SAP", "HEAD_ERP_APPS_NON_SAP", "HEAD_IT_PROCUREMENT_&_NEGOTIATIONS", "HEAD_IT_SECURITY_&_COMPLIANCE", "HEAD_PMO", "HEAD_IT_SUPPORT", "INFRA_HEAD", "JUNIOR_EXECUTIVE", "MANAGEMENT_TRAINEE", "MM_FUNCTIONAL", "NSO_IT_SUPPORT_EXECUTIVE", "PM_NON_SAP", "PM_SAP", "PMO_MT", "PROCUREMENT_ASSISTANT", "PS_FUNCTIONAL", "SECURITY_ENGINEER", "SENIOR_EXECUTIVE", "WM_FUNCTIONAL"],
    "LEGAL & COMPANY SECRETARY": ["ASST._CS", "ASST._MANAGER", "HEAD_CS"],
    "LOSS PREVENTION": ["ASSISTANT_MANAGER", "CCTV_HEAD", "CCTV_TECHNICIAN", "CLUSTER_LP", "EXECUTIVE", "MANAGER", "MIS_EXECUTIVE", "REGIONAL_LP", "ZONAL_LP"],
    "MARKETING": ["CUSTOMER_CARE_EXECUTIVE", "EXECUTIVE", "GRAPHIC_DESIGNER", "JUNIOR_EXECUTIVE", "MANAGEMENT_TRAINEE", "NSO_VERTICAL_HEAD", "SENIOR_EXECUTIVE"],
    "NSO": ["ASSISTANT_NSO_HEAD", "CLUSTER_MANAGER", "CLUSTER_LP", "EXECUTIVE", "HR_MANAGER", "MANAGER", "NSO_AUDIT_HEAD", "NSO_FINANCE_HEAD", "NSO_HEAD", "NSO_HR_HEAD", "NSO_MARKETING_HEAD", "NSO_PLANNING_HEAD", "NSO_SCM_HEAD", "NSO_SUPPORT_HEAD", "REGIONAL_MANAGER"],
    "PLANNING": ["ASSISTANT_MANAGER", "EXECUTIVE", "MANAGER", "SENIOR_EXECUTIVE"],
    "PROJECT": ["ASSISTANT_MANAGER", "ASSISTANT_PROJECT_HEAD", "EXECUTIVE", "MANAGER", "MIS_EXECUTIVE", "PROJECT_HEAD", "SENIOR_EXECUTIVE", "SENIOR_MANAGER", "SUPERVISOR"],
    "RETAIL": ["ASSISTANT_RETAIL_PLANNING_HEAD", "ASSISTANT_TO_RETAIL_HEAD", "ASSISTANT_TO_ZONAL_SUPPORT_HEAD", "ASSISTANT_ZONAL_MANAGER", "CLUSTER_MANAGER", "CLUSTER_PLANNER", "MIS_EXECUTIVE", "REGIONAL_MANAGER", "REGIONAL_PLANNER", "RETAIL_HEAD", "RETAIL_PLANNING_HEAD", "ZONAL_MANAGER", "ZONAL_PLANNER", "ZONAL_SUPPORT_HEAD"],
    "RETAIL OPERATION": ["ASM", "BENCH_ASM", "BENCH_SM", "CASHIER", "CUSTOMER_RETURN", "ELECTRICIAN", "FM", "HK", "INTERNAL_SECURITY", "LOBM", "LP", "NAPS_LOBM", "SECURITY_GUARD", "SM", "TINNY_WINNY_LOBM"],
    "SCM": ["ASST._DEPT._HEAD", "ASST._MANAGER", "ASST.DC_HEAD", "DC_HEAD", "DEPT_HEAD", "DEPT._HEAD", "DIV_HEAD", "DRIVER", "DRIVER_HELPER", "ELECTRICIAN", "EXECUTIVE", "HEAD_SCM", "HUB_INCHARGE", "HUB_CORDINATOR", "INTERNAL", "LADY_GUARD", "LP", "LPO", "MANAGEMENT_TRAINEE", "MANAGER", "MT", "OPTR", "RLPO", "SENIOR_EXECUTIVE", "SENIOR_LPO", "SUPERVISOR", "TL", "TRANSPORT_MANAGER"],
}

GENERIC_PERSONAS = {"HEAD", "MANAGER", "EXECUTIVE", "SENIOR_EXECUTIVE", "ASSISTANT_MANAGER", "JUNIOR_EXECUTIVE", "SUPPORT_LEAD", "TRAINER"}

# DEPARTMENT SCHEMAS
class DepartmentResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    parent_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    dept_metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

# USER SCHEMAS
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "END_USER"
    status: str = "PENDING"  # PENDING | ACTIVE | EXITING | DISABLED
    position: Optional[str] = None  # MANAGER | TEAM_MEMBER
    domain: Optional[str] = None  # DATA_AI | CLOUD | SECURITY | DEVELOPMENT
    department: Optional[str] = None
    department_id: Optional[UUID] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    persona: Optional[str] = None
    protocol_id: Optional[str] = None
    
    # Retail Structural Data
    loc_type: Optional[str] = None
    sub_dept: Optional[str] = None
    designation: Optional[str] = None

    plan: str = "STARTER"  # STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE

    @field_validator("department", "domain", mode="before")
    @classmethod
    def validate_normalization(cls, v: Optional[str]) -> Optional[str]:
        return normalize_field_value(v)

    @field_validator("persona", mode="before")
    @classmethod
    def validate_persona(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        normalized = v.strip().upper().replace(" ", "_").replace("-", "_").replace("/", "_")
        
        # Root Fix: We allow generic personas OR specifically mapped personas.
        # Strict validation against department occurs in the service layer.
        return normalized

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    position: Optional[str] = None
    domain: Optional[str] = None
    department: Optional[str] = None
    department_id: Optional[UUID] = None
    location: Optional[str] = None
    company: Optional[str] = None
    company_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    persona: Optional[str] = None
    protocol_id: Optional[str] = None
    loc_type: Optional[str] = None
    sub_dept: Optional[str] = None
    designation: Optional[str] = None
    plan: Optional[str] = None
    password: Optional[str] = None # In real app, handle password change securely

class UserResponse(UserBase):
    id: Union[UUID, str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    dept_obj: Optional[DepartmentResponse] = None

    model_config = ConfigDict(from_attributes=True)


# LOGIN SCHEMAS
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
