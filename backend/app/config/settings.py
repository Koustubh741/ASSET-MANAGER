from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    APP_NAME: str = "ITSM Asset Management API"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: Optional[str] = None
    DATABASE_HOST: str = "127.0.0.1"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "ITSM"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "Koustubh@123"
    
    # Security
    SECRET_KEY: str = "development-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    
    # External Integrations
    COLLECT_API_TOKEN: Optional[str] = None
    
    # Agent Framework
    BACKEND_URL: str = "http://127.0.0.1:8000"
    BACKEND_SSL_VERIFY: bool = False
    AGENT_SECRET: str = "agent_secret_key_2026"
    
    # Mission Agent Identities
    LOCAL_AGENT_ID: str = "agent-local"
    CLOUD_AGENT_ID: str = "00000000-0000-0000-0000-000000000002"
    SAAS_AGENT_ID: str = "agent-saas"
    AD_AGENT_ID: str = "agent-ad"
    
    # Server
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    FRONTEND_URL: str = "http://localhost:3000"
    ADDITIONAL_CORS_ORIGINS: Optional[str] = None
    
    # Agent Configuration Encryption
    ENCRYPTION_KEY: str = "wYt4J9IKbzURuQd95aiUVdR3jdhvwCyQPWIZmf0BPU0="
    
    # Cloud: AWS (Note: Keys are optional if using IAM Instance Profiles or ECS Task Roles)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    ENABLED_PROVIDERS: str = "aws"
    
    # Cloud: Azure / M365 (Note: Credentials optional if using Managed Identity)
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    AZURE_SUBSCRIPTION_ID: Optional[str] = None
    
    # SaaS: Google Workspace (Note: Path optional if using Workload Identity Federation)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_CUSTOMER_ID: Optional[str] = None
    
    # Directory: AD / LDAP
    LDAP_SERVER: Optional[str] = None
    LDAP_USER: Optional[str] = None
    LDAP_PASSWORD: Optional[str] = None
    LDAP_BASE_DN: Optional[str] = None
    LDAP_DOMAIN: Optional[str] = None
    LDAP_USE_SSL: bool = True
    
    # Infrastructure: Celery & Redis
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/0"
    CELERY_TASK_ALWAYS_EAGER: bool = False

settings = Settings()
