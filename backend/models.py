"""
Proxy for unified SQLAlchemy models.
Ensures legacy scripts and the FastAPI app use the same class definitions and MetaData.
"""
from app.models.models import (
    User,
    Asset,
    AssetAssignment,
    AssetInventory,
    ByodDevice,
    ExitRequest,
    PasswordResetToken,
    Ticket,
    AuditLog,
    Location,
    SoftwareLicense,
    AssetRequest,
    PurchaseRequest,
    PurchaseOrder,
    PurchaseInvoice,
    ProcurementLog,
    MaintenanceRecord,
    ApiToken,
    AssetRelationship,
    DiscoveredSoftware,
    AgentConfiguration,
    AgentSchedule,
    DiscoveryScan,
    DiscoveryDiff,
    UserPreference,
    AiAgentConfig,
    ChatMessage,
    Notification,
    NotificationType
)