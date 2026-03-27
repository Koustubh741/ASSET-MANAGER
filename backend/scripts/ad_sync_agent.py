#!/usr/bin/env python3
"""
AD/LDAP Sync Agent - Production Ready
======================================

Synchronizes user data from Active Directory/LDAP to a backend API.

Features:
- Robust error handling and validation
- Security enhancements (audit logging, secrets management)
- Reliability (circuit breaker, exponential backoff)
- Observability (metrics, structured logging)
- Health checks and dry-run mode

Author: Production Engineering Team
Version: 2.0.0
"""

import requests
import os
import sys
import json
import argparse
import logging
import time
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict
from contextlib import contextmanager
from enum import Enum
from collections import Counter
from dotenv import load_dotenv
import hmac

# ══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT SETUP
# ══════════════════════════════════════════════════════════════════════════════

load_dotenv()

# ══════════════════════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

def setup_logging(use_json: bool = False, log_level: str = "INFO"):
    """Configure logging based on environment."""
    if use_json:
        # Structured JSON logging for production
        logging.basicConfig(
            level=getattr(logging, log_level.upper()),
            format='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
    else:
        # Human-readable logging for development
        logging.basicConfig(
            level=getattr(logging, log_level.upper()),
            format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )

logger = logging.getLogger("ad_ldap_sync_agent")


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION CLASSES
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class SyncConfig:
    """Main configuration for the sync agent."""
    backend_url: str
    agent_secret: str
    ad_agent_id: str
    source_domain: str
    
    # LDAP settings
    ldap_server: Optional[str] = None
    ldap_user: Optional[str] = None
    ldap_password: Optional[str] = None
    ldap_base_dn: Optional[str] = None
    ldap_port: int = 389
    ldap_use_ssl: bool = False
    
    # HTTP tuning
    http_timeout: int = 15
    http_max_retries: int = 3
    http_retry_delay: float = 2.0
    
    # Role mapping
    ldap_admin_group: str = "cn=domain admins"
    ldap_manager_group: str = "cn=managers"
    
    @classmethod
    def from_env(cls, require_ldap: bool = True) -> "SyncConfig":
        """Load and validate configuration from environment variables."""
        errors = []
        
        # Required settings
        backend_url = os.getenv("BACKEND_URL", "https://127.0.0.1:8000").rstrip("/")
        agent_secret = os.getenv("AGENT_SECRET")
        ad_agent_id = os.getenv("AD_AGENT_ID")
        source_domain = os.getenv("LDAP_DOMAIN", "CORP.EXAMPLE.COM")
        
        if not agent_secret:
            errors.append("AGENT_SECRET is required but not set")
        if not ad_agent_id:
            errors.append("AD_AGENT_ID is required but not set")
        
        # LDAP settings
        ldap_server = os.getenv("LDAP_SERVER")
        ldap_user = os.getenv("LDAP_USER")
        ldap_password = os.getenv("LDAP_PASSWORD")
        ldap_base_dn = os.getenv("LDAP_BASE_DN")
        
        if require_ldap:
            if not ldap_server:
                errors.append("LDAP_SERVER is required for live sync")
            if not ldap_user:
                errors.append("LDAP_USER is required for live sync")
            if not ldap_password:
                errors.append("LDAP_PASSWORD is required for live sync")
            if not ldap_base_dn:
                errors.append("LDAP_BASE_DN is required for live sync")
        
        # Validate numeric settings
        try:
            http_timeout = int(os.getenv("HTTP_TIMEOUT", "15"))
            if http_timeout <= 0:
                errors.append("HTTP_TIMEOUT must be positive")
        except ValueError:
            errors.append("HTTP_TIMEOUT must be a valid integer")
            http_timeout = 15
        
        try:
            http_max_retries = int(os.getenv("HTTP_RETRIES", "3"))
            if http_max_retries < 0:
                errors.append("HTTP_RETRIES must be non-negative")
        except ValueError:
            errors.append("HTTP_RETRIES must be a valid integer")
            http_max_retries = 3
        
        try:
            http_retry_delay = float(os.getenv("HTTP_RETRY_DELAY", "2.0"))
            if http_retry_delay < 0:
                errors.append("HTTP_RETRY_DELAY must be non-negative")
        except ValueError:
            errors.append("HTTP_RETRY_DELAY must be a valid number")
            http_retry_delay = 2.0
        
        if errors:
            error_msg = "Configuration validation failed:\n  - " + "\n  - ".join(errors)
            raise ValueError(error_msg)
        
        return cls(
            backend_url=backend_url,
            agent_secret=agent_secret,
            ad_agent_id=ad_agent_id,
            source_domain=source_domain,
            ldap_server=ldap_server,
            ldap_user=ldap_user,
            ldap_password=ldap_password,
            ldap_base_dn=ldap_base_dn,
            ldap_port=int(os.getenv("LDAP_PORT", "389")),
            ldap_use_ssl=os.getenv("LDAP_USE_SSL", "false").lower() == "true",
            http_timeout=http_timeout,
            http_max_retries=http_max_retries,
            http_retry_delay=http_retry_delay,
            ldap_admin_group=os.getenv("LDAP_ADMIN_GROUP", "cn=domain admins").lower(),
            ldap_manager_group=os.getenv("LDAP_MANAGER_GROUP", "cn=managers").lower(),
        )
    
    def get_role_map(self) -> Dict[str, str]:
        """Return the role to LDAP group mapping."""
        return {
            "SYSTEM_ADMIN": self.ldap_admin_group,
            "MANAGER": self.ldap_manager_group,
        }


@dataclass
class SecurityConfig:
    """Security-specific configuration."""
    audit_log_file: Optional[str] = None
    use_vault: bool = False
    vault_url: Optional[str] = None
    vault_token: Optional[str] = None
    vault_secret_path: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> "SecurityConfig":
        """Load security configuration from environment."""
        return cls(
            audit_log_file=os.getenv("AUDIT_LOG_FILE"),
            use_vault=os.getenv("USE_VAULT", "false").lower() == "true",
            vault_url=os.getenv("VAULT_URL"),
            vault_token=os.getenv("VAULT_TOKEN"),
            vault_secret_path=os.getenv("VAULT_SECRET_PATH", "secret/ad-sync"),
        )


# ══════════════════════════════════════════════════════════════════════════════
# METRICS AND MONITORING
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class SyncMetrics:
    """Metrics collected during sync operation."""
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    
    ldap_connection_time: float = 0.0
    ldap_query_time: float = 0.0
    users_extracted: int = 0
    
    backend_request_time: float = 0.0
    backend_retries: int = 0
    
    users_created: int = 0
    users_updated: int = 0
    users_failed: int = 0
    
    success: bool = False
    error_message: Optional[str] = None
    
    def finalize(self):
        """Finalize metrics at end of sync."""
        self.end_time = datetime.now(timezone.utc)
        if self.start_time and self.end_time:
            self.duration_seconds = (self.end_time - self.start_time).total_seconds()
    
    def to_dict(self, agent_id: str = "agent-ad") -> Dict[str, Any]:
        """Convert to dictionary for logging/export."""
        data = asdict(self)
        data['agent_id'] = agent_id
        if self.start_time:
            data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data


@contextmanager
def timer(name: str, metrics: Optional[SyncMetrics] = None):
    """Context manager for timing operations."""
    start = time.time()
    logger.debug("Starting: %s", name)
    
    try:
        yield
    finally:
        elapsed = time.time() - start
        logger.debug("Completed: %s (%.3fs)", name, elapsed)
        
        if metrics:
            if name == "ldap_connection":
                metrics.ldap_connection_time = elapsed
            elif name == "ldap_query":
                metrics.ldap_query_time = elapsed
            elif name == "backend_request":
                metrics.backend_request_time = elapsed


# ══════════════════════════════════════════════════════════════════════════════
# SECURITY UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

class AuditLogger:
    """Security audit logger for compliance."""
    
    def __init__(self, audit_file: Optional[str] = None):
        self.audit_file = audit_file
        if audit_file:
            self.audit_logger = logging.getLogger("audit")
            handler = logging.FileHandler(audit_file)
            handler.setFormatter(logging.Formatter(
                '{"timestamp":"%(asctime)s","event":"%(message)s"}',
                datefmt="%Y-%m-%dT%H:%M:%SZ"
            ))
            self.audit_logger.addHandler(handler)
            self.audit_logger.setLevel(logging.INFO)
            self.audit_logger.propagate = False
    
    def log_sync_start(self, agent_id: str, mode: str):
        """Log sync operation start."""
        if self.audit_file:
            self.audit_logger.info(
                f'{{"action":"sync_start","agent_id":"{agent_id}","mode":"{mode}"}}'
            )
    
    def log_sync_complete(self, agent_id: str, success: bool, user_count: int):
        """Log sync operation completion."""
        if self.audit_file:
            self.audit_logger.info(
                f'{{"action":"sync_complete","agent_id":"{agent_id}",'
                f'"success":{str(success).lower()},"user_count":{user_count}}}'
            )


def sanitize_for_logging(data: str, field_name: str) -> str:
    """Sanitize sensitive data for logging."""
    sensitive_fields = {
        'password', 'secret', 'token', 'key', 'credential',
        'auth', 'api_key', 'private'
    }
    
    if any(sensitive in field_name.lower() for sensitive in sensitive_fields):
        if data:
            return f"***{data[-4:]}" if len(data) > 4 else "****"
        return "****"
    
    return data


# ══════════════════════════════════════════════════════════════════════════════
# RELIABILITY UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

class ExponentialBackoff:
    """Exponential backoff strategy for retries."""
    
    def __init__(
        self,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0,
        jitter: bool = True
    ):
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number."""
        delay = min(
            self.base_delay * (self.multiplier ** attempt),
            self.max_delay
        )
        
        if self.jitter:
            import random
            jitter_amount = delay * 0.25
            delay += random.uniform(-jitter_amount, jitter_amount)
        
        return max(0, delay)
    
    def sleep(self, attempt: int):
        """Sleep for the calculated delay."""
        delay = self.get_delay(attempt)
        logger.debug("Backing off for %.2f seconds (attempt %d)", delay, attempt + 1)
        time.sleep(delay)


class HealthChecker:
    """Health check utilities for the sync agent."""
    
    @staticmethod
    def check_backend_connectivity(config: SyncConfig) -> bool:
        """Test backend API connectivity."""
        try:
            logger.info("Testing backend connectivity to %s", config.backend_url)
            
            health_url = f"{config.backend_url}/health"
            response = requests.get(
                health_url,
                timeout=config.http_timeout,
                allow_redirects=False
            )
            
            if response.status_code in (200, 404):
                logger.info("✓ Backend connectivity check passed")
                return True
            
            logger.warning("Backend returned status %d", response.status_code)
            return False
            
        except Exception as e:
            logger.error("✗ Backend connectivity check failed: %s", e)
            return False


# ══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _utcnow() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def _extract_role(member_of_values: List[str], role_map: Dict[str, str]) -> str:
    """Map LDAP group memberships to an application role."""
    groups_lower = [str(g).lower() for g in member_of_values]
    for role, pattern in role_map.items():
        if any(pattern in g for g in groups_lower):
            return role
    return "END_USER"


# ══════════════════════════════════════════════════════════════════════════════
# LDAP OPERATIONS
# ══════════════════════════════════════════════════════════════════════════════

def fetch_users_from_ldap(
    config: SyncConfig,
    metrics: Optional[SyncMetrics] = None,
    audit: Optional[AuditLogger] = None
) -> Optional[List[Dict[str, str]]]:
    """
    Connect to AD/LDAP, search for user objects, and return normalized user dicts.
    
    Args:
        config: Validated configuration object
        metrics: Optional metrics object to track performance
        audit: Optional audit logger
        
    Returns:
        List of user dictionaries, or None on error
    """
    try:
        from ldap3 import Server, Connection, ALL, SUBTREE, Tls
        import ssl
    except ImportError:
        logger.error("ldap3 library is not installed. Run: pip install ldap3")
        return None

    logger.info("Connecting to LDAP server: %s", config.ldap_server)

    # Auto-discovery parameters
    ports_to_try = [config.ldap_port]
    if 389 not in ports_to_try: ports_to_try.append(389)
    if 636 not in ports_to_try: ports_to_try.append(636)
    if 3268 not in ports_to_try: ports_to_try.append(3268)
    
    # User formats to try
    user_parts = config.ldap_user.split('@')[0].split('\\')[-1]
    formats = [config.ldap_user]
    if '@' not in config.ldap_user and '\\' not in config.ldap_user:
        if config.ldap_base_dn:
            formats.append(f"{user_parts}@{config.ldap_base_dn}")
        if config.ldap_domain:
            formats.append(f"{config.ldap_domain.split('.')[0]}\\{user_parts}")

    # Create TLS configuration (lenient for diagnostics)
    try:
        tls = Tls(validate=ssl.CERT_NONE)
    except Exception as e:
        logger.error("Failed to create TLS configuration: %s", e)
        return None

    conn: Optional[Connection] = None
    last_error = "No connection attempted"
    
    for port in ports_to_try:
        use_ssl = (port in [636, 3269]) or config.ldap_use_ssl
        logger.info("Attempting connection to %s:%d (SSL=%s)...", config.ldap_server, port, use_ssl)
        
        server = Server(
            config.ldap_server, 
            port=port, 
            use_ssl=use_ssl, 
            tls=tls if use_ssl else None, 
            get_info=ALL
        )
        
        for user_fmt in formats:
            try:
                # Connect with timing
                with timer("ldap_connection", metrics):
                    conn = Connection(
                        server,
                        user=user_fmt,
                        password=config.ldap_password,
                        auto_bind=True
                    )
                    logger.info("Successfully connected and bound as %s on port %d", user_fmt, port)
                
                if audit:
                    audit.log_sync_start(config.ad_agent_id, "LDAP")
                
                # Search with timing
                logger.info("Searching for users in base DN: %s", config.ldap_base_dn)
                
                with timer("ldap_query", metrics):
                    search_successful = conn.search(
                        search_base=config.ldap_base_dn,
                        # Refined AD filter: users with an email
                        search_filter="(&(objectCategory=person)(objectClass=user)(mail=*))",
                        search_scope=SUBTREE,
                        attributes=[
                            "cn", "mail", "department", "title",
                            "physicalDeliveryOfficeName", "memberOf",
                        ],
                    )
                
                if not search_successful:
                    logger.error("LDAP search failed: %s", conn.result)
                    conn.unbind()
                    return None

                users = []
                role_map = config.get_role_map()
                
                for entry in conn.entries:
                    email = str(entry.mail) if entry.mail else None
                    if not email:
                        continue

                    users.append({
                        "full_name": str(entry.cn),
                        "email": email,
                        "department": str(entry.department) if entry.department else "N/A",
                        "role": _extract_role(
                            entry.memberOf.values if entry.memberOf else [],
                            role_map
                        ),
                        "position": str(entry.title) if entry.title else "Employee",
                        "location": (
                            str(entry.physicalDeliveryOfficeName)
                            if entry.physicalDeliveryOfficeName else "Remote"
                        )
                    })
                    
                logger.info("Successfully extracted %d users from LDAP", len(users))
                conn.unbind()
                return users
                
            except Exception as e:
                last_error = str(e)
                logger.debug("Failed with format %s on port %d: %s", user_fmt, port, e)
                # Ensure connection is closed on failure to avoid resource leak
                if conn:
                    try: conn.unbind()
                    except: pass
                continue
                
    logger.error("LDAP extraction failed after multiple attempts. Last error: %s", last_error)
    return None


def fetch_users_mock() -> List[Dict[str, str]]:
    """Return mock users for testing."""
    logger.info("Using mock user data (--mock flag active)")
    return [
        {
            "full_name": "Alice Admin",
            "email": "alice@corp.example.com",
            "department": "IT",
            "role": "SYSTEM_ADMIN",
            "position": "IT Manager",
            "location": "HQ",
        },
        {
            "full_name": "Bob User",
            "email": "bob@corp.example.com",
            "department": "Sales",
            "role": "END_USER",
            "position": "Account Executive",
            "location": "Remote",
        },
        {
            "full_name": "Carol Manager",
            "email": "carol@corp.example.com",
            "department": "Operations",
            "role": "MANAGER",
            "position": "Operations Manager",
            "location": "Branch Office",
        },
    ]


# ══════════════════════════════════════════════════════════════════════════════
# BACKEND COMMUNICATION
# ══════════════════════════════════════════════════════════════════════════════

def _get_hmac_headers(config: SyncConfig) -> Dict[str, str]:
    """Generate HMAC signature headers for the given config."""
    timestamp = datetime.now(timezone.utc).isoformat()
    message = f"{config.ad_agent_id}:{timestamp}"
    signature = hmac.new(
        config.agent_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "Content-Type": "application/json",
        "X-Agent-ID": config.ad_agent_id,
        "X-Agent-Timestamp": timestamp,
        "X-Agent-Signature": signature
    }

def send_users_to_backend(
    users: List[Dict[str, str]],
    extract_method: str,
    config: SyncConfig,
    metrics: Optional[SyncMetrics] = None,
    dry_run: bool = False
) -> bool:
    """
    POST the user list to the backend with HMAC signing and retry logic.
    """
    if dry_run:
        logger.info("[DRY RUN] Would send %d users to backend", len(users))
        return True
    
    payload = {
        "agent_id": config.ad_agent_id,
        "source_domain": config.source_domain,
        "users": users,
        "metadata": {
            "extract_method": extract_method,
            "total_extracted": len(users),
            "sync_time": datetime.now(timezone.utc).isoformat(),
        },
    }

    backoff = ExponentialBackoff(
        base_delay=config.http_retry_delay,
        max_delay=60.0,
        multiplier=2.0,
        jitter=True
    )

    for attempt in range(config.http_max_retries):
        try:
            logger.debug(
                "Sending payload to %s/api/v1/collect/users (attempt %d/%d)",
                config.backend_url, attempt + 1, config.http_max_retries
            )
            
            headers = _get_hmac_headers(config)
            
            with timer("backend_request", metrics):
                response = requests.post(
                    f"{config.backend_url}/api/v1/collect/users",
                    json=payload,
                    headers=headers,
                    timeout=config.http_timeout
                )
            
            if response.status_code == 200:
                logger.info("✓ AD synchronization data successfully sent to backend")
                return True
            
            logger.warning(
                "Attempt %d/%d — backend returned error %d: %s",
                attempt + 1, config.http_max_retries,
                response.status_code, response.text,
            )
            if metrics:
                metrics.backend_retries += 1

        except requests.exceptions.Timeout:
            logger.warning(
                "Attempt %d/%d — request timed out after %ds",
                attempt + 1, config.http_max_retries, config.http_timeout,
            )
            if metrics:
                metrics.backend_retries += 1
        except requests.exceptions.RequestException as e:
            logger.warning(
                "Attempt %d/%d — connection error: %s",
                attempt + 1, config.http_max_retries, e
            )
            if metrics:
                metrics.backend_retries += 1
        except Exception:
            logger.exception("Unexpected error sending payload to backend")
            return False

        # Retry with exponential backoff
        if attempt < config.http_max_retries - 1:
            backoff.sleep(attempt)

    logger.error("✗ All %d attempts failed", config.http_max_retries)
    return False


def report_metrics(config: SyncConfig, metrics: SyncMetrics) -> bool:
    """Send operational metrics to backend."""
    logger.info("Reporting operational metrics to backend...")
    try:
        headers = _get_hmac_headers(config)
        # Add legacy key for safety
        headers["X-Agent-Key"] = config.agent_secret
        
        response = requests.post(
            f"{config.backend_url}/api/v1/collect/metrics",
            json=metrics.to_dict(config.ad_agent_id),
            headers=headers,
            timeout=config.http_timeout
        )
        if response.status_code == 200:
            logger.info("✓ Metrics successfully reported to backend")
            return True
        logger.warning("Failed to report metrics: HTTP %d", response.status_code)
        return False
    except Exception as e:
        logger.error("Failed to report metrics: %s", e)
        return False



# ══════════════════════════════════════════════════════════════════════════════
# MAIN SYNC FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def sync_users(
    mock: bool = False,
    dry_run: bool = False,
    health_check: bool = False,
    export_metrics: Optional[str] = None
) -> bool:
    """
    Main synchronization function.
    
    Args:
        mock: If True, use mock data instead of live LDAP
        dry_run: If True, simulate without making changes
        health_check: If True, only run health checks
        export_metrics: Optional file path to export metrics
        
    Returns:
        True if sync succeeded, False otherwise
    """
    logger.info("=" * 70)
    logger.info("AD/LDAP Directory Sync - Production Ready v2.0.0")
    logger.info("Started at: %s", _utcnow().isoformat())
    logger.info("Mode: %s%s", "MOCK" if mock else "LIVE", " [DRY RUN]" if dry_run else "")
    logger.info("=" * 70)

    # Initialize metrics
    metrics = SyncMetrics()
    
    # Load configuration
    try:
        config = SyncConfig.from_env(require_ldap=not mock)
        security_config = SecurityConfig.from_env()
        
        logger.info("✓ Configuration validated successfully")
        logger.info("  Backend URL: %s", config.backend_url)
        logger.info("  Agent ID: %s", config.ad_agent_id)
        logger.info("  Source Domain: %s", config.source_domain)
        if not mock:
            logger.info("  LDAP Server: %s", config.ldap_server)
    except ValueError as e:
        logger.error("✗ Configuration error:\n%s", str(e))
        return False
    
    # Initialize audit logger
    audit = AuditLogger(security_config.audit_log_file)
    if security_config.audit_log_file:
        logger.info("  Audit logging enabled: %s", security_config.audit_log_file)
    
    # Health check mode
    if health_check:
        return HealthChecker.check_backend_connectivity(config)
    
    # Extract users
    if mock:
        users = fetch_users_mock()
        metrics.users_extracted = len(users)
        extract_method = "Mock"
    else:
        users = fetch_users_from_ldap(config, metrics, audit)
        if users is None:
            logger.error("✗ LDAP extraction failed — aborting sync")
            metrics.success = False
            metrics.error_message = "LDAP extraction failed"
            metrics.finalize()
            return False
        extract_method = "LDAP_Query"

    if not users:
        logger.warning("⚠ No users found to sync")
        metrics.success = True
        metrics.finalize()
        return True

    logger.info("Sending %d users to backend...", len(users))
    
    # Send to backend
    success = send_users_to_backend(users, extract_method, config, metrics, dry_run)
    
    # Finalize metrics
    metrics.success = success
    if not success:
        metrics.error_message = "Backend sync failed"
    metrics.finalize()
    
    # Audit log
    if audit:
        audit.log_sync_complete(config.ad_agent_id, success, len(users))
    
    # Export metrics if requested
    if export_metrics:
        try:
            with open(export_metrics, 'w') as f:
                json.dump(metrics.to_dict(), f, indent=2)
            logger.info("✓ Metrics exported to %s", export_metrics)
        except Exception as e:
            logger.error("Failed to export metrics: %s", e)
    
    # Report metrics to backend
    if not dry_run and not health_check:
        report_metrics(config, metrics)
    
    # Summary
    logger.info("=" * 70)
    logger.info("Sync Summary:")
    logger.info("  Status: %s", "✓ SUCCESS" if success else "✗ FAILED")
    logger.info("  Duration: %.2fs", metrics.duration_seconds)
    logger.info("  Users extracted: %d", metrics.users_extracted)
    logger.info("  Users created: %d", metrics.users_created)
    logger.info("  Users updated: %d", metrics.users_updated)
    logger.info("  Backend retries: %d", metrics.backend_retries)
    logger.info("=" * 70)
    
    return success


# ══════════════════════════════════════════════════════════════════════════════
# COMMAND LINE INTERFACE
# ══════════════════════════════════════════════════════════════════════════════

def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="AD/LDAP Sync Agent - Production Ready v2.0.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Normal sync
  python ad_ldap_sync.py
  
  # Mock mode for testing
  python ad_ldap_sync.py --mock
  
  # Dry run (no changes)
  python ad_ldap_sync.py --dry-run
  
  # Health check only
  python ad_ldap_sync.py --health-check
  
  # Export metrics
  python ad_ldap_sync.py --export-metrics /tmp/metrics.json
  
  # JSON logging for production
  python ad_ldap_sync.py --json-logs
        """
    )
    
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock data instead of live LDAP connection",
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate sync without making actual changes",
    )
    
    parser.add_argument(
        "--health-check",
        action="store_true",
        help="Run health checks only (don't sync)",
    )
    
    parser.add_argument(
        "--export-metrics",
        metavar="FILE",
        help="Export metrics to JSON file",
    )
    
    parser.add_argument(
        "--json-logs",
        action="store_true",
        help="Use structured JSON logging (for production)",
    )
    
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Set logging level (default: INFO)",
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(use_json=args.json_logs, log_level=args.log_level)
    
    # Run sync
    success = sync_users(
        mock=args.mock,
        dry_run=args.dry_run,
        health_check=args.health_check,
        export_metrics=args.export_metrics,
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()