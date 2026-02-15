"""
saas_discovery_agent_production.py — Production-Ready SaaS License Discovery Agent

Discovers and syncs SaaS licenses from Google Workspace and Microsoft 365 to a central backend.

Features:
  - Parallel provider execution
  - Rate limiting for external APIs
  - HMAC request signing
  - Comprehensive metrics and progress tracking
  - Graceful shutdown handling
  - SSL/TLS with configurable verification
  - Robust error handling with custom exceptions
  - Dry-run mode for testing

Environment Variables:
  Required:
    AGENT_SECRET          — Backend authentication key
    SAAS_AGENT_ID         — UUID for this SaaS collector instance
  
  Optional:
    BACKEND_URL           — Backend host[:port] (default: 127.0.0.1:8000)
    BACKEND_SSL_VERIFY    — Set to 'false' to disable SSL verification (dev only)
    HTTP_TIMEOUT          — Backend request timeout in seconds (default: 15)
    HTTP_RETRIES          — Max retry attempts (default: 3)
    HTTP_RETRY_DELAY      — Delay between retries in seconds (default: 2.0)
    EXT_API_TIMEOUT       — External API timeout in seconds (default: 30)
    EXT_API_RATE_LIMIT    — Max external API requests per minute (default: 60)
    PROVIDER_WORKERS      — Max parallel provider workers (default: 2)
  
  Google Workspace:
    GOOGLE_APPLICATION_CREDENTIALS — Path to service account JSON
    GOOGLE_CUSTOMER_ID             — Customer ID (default: my_customer)
  
  Microsoft 365:
    AZURE_TENANT_ID       — Azure AD tenant ID
    AZURE_CLIENT_ID       — Application client ID
    AZURE_CLIENT_SECRET   — Application client secret

Version: 3.0.0
"""

import json
import http.client
import os
import sys
import ssl
import argparse
import logging
import time
import hmac
import hashlib
import signal
import threading
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type
from collections import deque, Counter
from dotenv import load_dotenv

# ══════════════════════════════════════════════════════════════════════════════
# PART 1: CORE INFRASTRUCTURE
# ══════════════════════════════════════════════════════════════════════════════

# ── Environment & Logging ─────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("saas_discovery_agent")


# ── Custom Exceptions ─────────────────────────────────────────────────────────
class SaaSDiscoveryError(Exception):
    """Base exception for SaaS discovery errors."""
    pass


class ConfigurationError(SaaSDiscoveryError):
    """Configuration validation error."""
    pass


class AuthenticationError(SaaSDiscoveryError):
    """Authentication/authorization failed."""
    pass


class APIError(SaaSDiscoveryError):
    """External API error."""
    pass


class BackendError(SaaSDiscoveryError):
    """Backend communication error."""
    pass


# ── Configuration Management ──────────────────────────────────────────────────
@dataclass
class AgentConfig:
    """Centralized configuration with validation."""
    
    # Backend
    backend_host: str
    agent_secret: str
    agent_id: str
    ssl_verify: bool = True
    
    # HTTP settings
    timeout_sec: int = 15
    max_retries: int = 3
    retry_delay: float = 2.0
    
    # External API settings
    ext_api_timeout: int = 30
    ext_api_rate_limit: int = 60
    
    # Concurrency
    provider_workers: int = 2
    
    @classmethod
    def from_env(cls, dry_run: bool = False) -> "AgentConfig":
        """Load and validate configuration from environment variables."""
        
        # Required variables (unless dry-run)
        if not dry_run:
            agent_secret = os.getenv("AGENT_SECRET")
            agent_id = os.getenv("SAAS_AGENT_ID")
            
            if not agent_secret:
                raise ConfigurationError("AGENT_SECRET environment variable is required")
            if not agent_id:
                raise ConfigurationError("SAAS_AGENT_ID environment variable is required")
        else:
            agent_secret = os.getenv("AGENT_SECRET", "dry-run-secret")
            agent_id = os.getenv("SAAS_AGENT_ID", "dry-run-agent-id")
        
        # Parse backend URL
        backend_url = os.getenv("BACKEND_URL", "127.0.0.1:8000")
        backend_host = backend_url.replace("https://", "").replace("http://", "").rstrip("/")
        
        return cls(
            backend_host=backend_host,
            agent_secret=agent_secret,
            agent_id=agent_id,
            ssl_verify=os.getenv("BACKEND_SSL_VERIFY", "true").lower() != "false",
            timeout_sec=int(os.getenv("HTTP_TIMEOUT", "15")),
            max_retries=int(os.getenv("HTTP_RETRIES", "3")),
            retry_delay=float(os.getenv("HTTP_RETRY_DELAY", "2.0")),
            ext_api_timeout=int(os.getenv("EXT_API_TIMEOUT", "30")),
            ext_api_rate_limit=int(os.getenv("EXT_API_RATE_LIMIT", "60")),
            provider_workers=int(os.getenv("PROVIDER_WORKERS", "2")),
        )
    
    def validate(self):
        """Validate configuration values."""
        if self.max_retries < 1:
            raise ConfigurationError("max_retries must be >= 1")
        if self.timeout_sec < 1:
            raise ConfigurationError("timeout_sec must be >= 1")
        if self.ext_api_timeout < 1:
            raise ConfigurationError("ext_api_timeout must be >= 1")
        if self.provider_workers < 1:
            raise ConfigurationError("provider_workers must be >= 1")
        if self.ext_api_rate_limit < 1:
            raise ConfigurationError("ext_api_rate_limit must be >= 1")
    
    def make_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context based on configuration."""
        ctx = ssl.create_default_context()
        if not self.ssl_verify:
            logger.warning("⚠️  SSL verification DISABLED. Not for production use!")
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        return ctx


# ── Metrics Collection ────────────────────────────────────────────────────────
@dataclass
class DiscoveryMetrics:
    """Collect and track discovery metrics."""
    
    providers_attempted: int = 0
    providers_succeeded: int = 0
    providers_failed: int = 0
    
    licenses_discovered: int = 0
    licenses_synced: int = 0
    licenses_failed: int = 0
    
    sync_errors_by_status: Counter = field(default_factory=Counter)
    discovery_time_by_provider: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self, agent_id: str = "agent-saas") -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "agent_id": agent_id,
            "providers": {
                "attempted": self.providers_attempted,
                "succeeded": self.providers_succeeded,
                "failed": self.providers_failed,
            },
            "licenses": {
                "discovered": self.licenses_discovered,
                "synced": self.licenses_synced,
                "failed": self.licenses_failed,
            },
            "errors_by_status": dict(self.sync_errors_by_status),
            "discovery_times": self.discovery_time_by_provider,
        }
    
    def log_summary(self):
        """Log comprehensive metrics summary."""
        logger.info("═" * 70)
        logger.info("SaaS Discovery Summary:")
        logger.info("─" * 70)
        logger.info(f"  Providers: {self.providers_succeeded}/{self.providers_attempted} succeeded")
        logger.info(f"  Licenses: {self.licenses_synced}/{self.licenses_discovered} synced successfully")
        logger.info(f"  Failed syncs: {self.licenses_failed}")
        
        if self.sync_errors_by_status:
            logger.info("  Errors by HTTP status:")
            for status, count in self.sync_errors_by_status.most_common():
                logger.info(f"    HTTP {status}: {count}")
        
        if self.discovery_time_by_provider:
            logger.info("  Discovery times:")
            for provider, duration in sorted(self.discovery_time_by_provider.items()):
                logger.info(f"    {provider}: {duration:.2f}s")
        
        logger.info("═" * 70)


# ── Progress Tracker ──────────────────────────────────────────────────────────
class ProgressTracker:
    """Track and display progress for long-running operations."""
    
    def __init__(self, total: int, name: str = "Progress"):
        self.total = total
        self.completed = 0
        self.start_time = time.time()
        self.name = name
        self.lock = threading.Lock()
    
    def update(self, increment: int = 1):
        """Update progress counter."""
        with self.lock:
            self.completed += increment
            elapsed = time.time() - self.start_time
            rate = self.completed / elapsed if elapsed > 0 else 0
            eta = (self.total - self.completed) / rate if rate > 0 else 0
            
            logger.info(
                f"{self.name}: {self.completed}/{self.total} "
                f"({100*self.completed/self.total:.1f}%) "
                f"[{rate:.1f}/s] ETA: {int(eta)}s"
            )


# ── Rate Limiter ──────────────────────────────────────────────────────────────
class RateLimiter:
    """Token bucket rate limiter for external API calls."""
    
    def __init__(self, max_requests: int, time_window: float = 60.0):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self.lock = threading.Lock()
    
    def acquire(self):
        """Wait until a request slot is available."""
        with self.lock:
            now = time.time()
            
            # Remove requests outside time window
            while self.requests and self.requests[0] < now - self.time_window:
                self.requests.popleft()
            
            # Wait if at capacity
            if len(self.requests) >= self.max_requests:
                sleep_time = self.time_window - (now - self.requests[0]) + 0.1
                if sleep_time > 0:
                    logger.debug(f"Rate limit reached, waiting {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                    return self.acquire()
            
            self.requests.append(now)


# ── Graceful Shutdown Handler ────────────────────────────────────────────────
class GracefulShutdown:
    """Handle shutdown signals gracefully."""
    
    def __init__(self):
        self.shutdown_requested = False
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        logger.warning(f"⚠️  Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True
    
    def should_continue(self) -> bool:
        """Check if operation should continue."""
        return not self.shutdown_requested


# ── Utility Functions ─────────────────────────────────────────────────────────
def utcnow() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int with fallback."""
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.debug(f"Could not convert '{value}' to int, using default {default}")
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float with fallback."""
    try:
        return float(value)
    except (TypeError, ValueError):
        logger.debug(f"Could not convert '{value}' to float, using default {default}")
        return default


def parse_iso_date(date_str: Optional[str]) -> Optional[str]:
    """Parse ISO datetime string to YYYY-MM-DD format."""
    if not date_str:
        return None
    
    try:
        # Handle various ISO formats
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except (ValueError, AttributeError):
        logger.debug(f"Could not parse date string: {date_str}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 1
# ══════════════════════════════════════════════════════════════════════════════


def get_auth_headers(config: AgentConfig) -> Dict[str, str]:
    """Generate authenticated headers with timestamp and HMAC signature."""
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Create HMAC signature for additional security
    message = f"{config.agent_id}:{timestamp}"
    signature = hmac.new(
        config.agent_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "Content-Type": "application/json",
        "X-Agent-Key": config.agent_secret,
        "X-Agent-ID": config.agent_id,
        "X-Agent-Timestamp": timestamp,
        "X-Agent-Signature": signature,
    }

def report_metrics(config: AgentConfig, metrics: DiscoveryMetrics) -> bool:
    """Send final operational metrics to the backend endpoint."""
    logger.info("Reporting operational metrics to backend...")
    
    body = json.dumps(metrics.to_dict())
    headers = get_auth_headers(config)
    
    ssl_context = config.make_ssl_context()
    conn: Optional[http.client.HTTPSConnection] = None
    try:
        conn = http.client.HTTPSConnection(
            config.backend_host,
            timeout=config.timeout_sec,
            context=ssl_context
        )
        conn.request("POST", "/api/v1/collect/metrics", body=body, headers=headers)
        response = conn.getresponse()
        response.read()
        return response.status == 200
    except Exception as e:
        logger.error(f"Failed to report metrics: {e}")
        return False
    finally:
        if conn:
            conn.close()


def build_saas_payload(
    platform: str,
    licenses: List[Dict[str, Any]],
    config: AgentConfig
) -> Dict[str, Any]:
    """Build structured SaaS discovery payload."""
    return {
        "agent_id": config.agent_id,
        "platform": platform,
        "licenses": licenses,
        "metadata": {
            "collector_version": "3.0.0-production",
            "scan_time": utcnow().isoformat(),
        },
    }


def check_backend_health(config: AgentConfig) -> bool:
    """Verify backend is accessible before starting discovery."""
    logger.info("Checking backend health...")
    
    conn: Optional[http.client.HTTPSConnection] = None
    try:
        ssl_context = config.make_ssl_context()
        conn = http.client.HTTPSConnection(
            config.backend_host,
            timeout=5,
            context=ssl_context
        )
        
        headers = {"X-Agent-Key": config.agent_secret}
        conn.request("GET", "/api/v1/health", headers=headers)
        response = conn.getresponse()
        response.read()  # Consume response body
        
        if response.status == 200:
            logger.info("✓ Backend is healthy")
            return True
        else:
            logger.warning(f"Backend health check returned HTTP {response.status}")
            return False
            
    except Exception as e:
        logger.error(f"Backend health check failed: {e}")
        return False
    finally:
        if conn:
            conn.close()


def send_to_backend(
    platform: str,
    licenses: List[Dict[str, Any]],
    config: AgentConfig,
    metrics: DiscoveryMetrics,
    dry_run: bool = False
) -> bool:
    """
    Send SaaS licenses to backend with retry logic.
    
    Args:
        platform: Platform name (e.g., "Google Workspace", "Microsoft 365")
        licenses: List of license dictionaries
        config: Agent configuration
        metrics: Metrics tracker
        dry_run: If True, print payload without sending
    
    Returns:
        True on success, False on failure
    """
    if dry_run:
        payload = build_saas_payload(platform, licenses, config)
        logger.info(f"[DRY-RUN] Would send {len(licenses)} licenses for '{platform}':")
        logger.info(json.dumps(payload, indent=2))
        return True
    
    if not licenses:
        logger.warning(f"No licenses to sync for '{platform}'")
        return True
    
    payload = build_saas_payload(platform, licenses, config)
    body = json.dumps(payload)
    
    ssl_context = config.make_ssl_context()
    
    for attempt in range(1, config.max_retries + 1):
        conn: Optional[http.client.HTTPSConnection] = None
        try:
            # Get fresh headers with current timestamp for each attempt
            headers = get_auth_headers(config)
            headers["Content-Length"] = str(len(body.encode("utf-8")))
            
            conn = http.client.HTTPSConnection(
                config.backend_host,
                timeout=config.timeout_sec,
                context=ssl_context
            )
            
            conn.request("POST", "/api/v1/collect/saas", body=body, headers=headers)
            response = conn.getresponse()
            resp_body = response.read().decode("utf-8", errors="replace")
            
            # Success
            if response.status == 200:
                try:
                    result = json.loads(resp_body)
                    license_ids = result.get("ids", [])
                    logger.info(
                        f"✓ Synced {len(licenses)} licenses for '{platform}'. "
                        f"Backend IDs: {len(license_ids)}"
                    )
                except json.JSONDecodeError:
                    logger.info(f"✓ Synced {len(licenses)} licenses for '{platform}'")
                
                metrics.licenses_synced += len(licenses)
                return True
            
            # Client error - don't retry
            elif response.status in (400, 401, 403, 422):
                logger.error(
                    f"Backend rejected '{platform}' payload (HTTP {response.status}): {resp_body}"
                )
                metrics.sync_errors_by_status[response.status] += 1
                metrics.licenses_failed += len(licenses)
                return False
            
            # Server error or other - retry
            else:
                logger.warning(
                    f"Attempt {attempt}/{config.max_retries} — "
                    f"HTTP {response.status} for '{platform}': {resp_body}"
                )
                metrics.sync_errors_by_status[response.status] += 1
        
        except (http.client.HTTPException, OSError, TimeoutError) as e:
            logger.warning(
                f"Attempt {attempt}/{config.max_retries} — "
                f"Connection error for '{platform}': {e}"
            )
        except Exception:
            logger.exception(f"Unexpected error sending '{platform}' payload")
            metrics.licenses_failed += len(licenses)
            return False
        finally:
            if conn:
                conn.close()
        
        # Exponential backoff with jitter
        if attempt < config.max_retries:
            delay = config.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
            jitter = delay * 0.1  # 10% jitter
            sleep_time = delay + (time.time() % jitter)
            logger.info(f"Retrying in {sleep_time:.1f}s...")
            time.sleep(sleep_time)
    
    logger.error(f"All {config.max_retries} attempts failed for '{platform}'")
    metrics.licenses_failed += len(licenses)
    return False


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 2
# ══════════════════════════════════════════════════════════════════════════════


_PROVIDER_REGISTRY: Dict[str, Type["SaaSProvider"]] = {}


def register_provider(cls: Type["SaaSProvider"]) -> Type["SaaSProvider"]:
    """
    Class decorator to register a SaaS provider.
    
    Usage:
        @register_provider
        class MyProvider(SaaSProvider):
            @staticmethod
            def name() -> str:
                return "myprovider"
    """
    provider_name = cls.name()
    if provider_name in _PROVIDER_REGISTRY:
        raise ValueError(f"Provider '{provider_name}' is already registered")
    
    _PROVIDER_REGISTRY[provider_name] = cls
    logger.debug(f"Registered SaaS provider: '{provider_name}'")
    return cls


def get_registered_providers() -> List[str]:
    """Get list of all registered provider names."""
    return list(_PROVIDER_REGISTRY.keys())


def build_providers(
    names: Optional[List[str]] = None,
    config: Optional[AgentConfig] = None
) -> List["SaaSProvider"]:
    """
    Instantiate providers by name.
    
    Args:
        names: List of provider names to instantiate (None = all)
        config: Agent configuration to pass to providers
    
    Returns:
        List of instantiated provider objects
    """
    names = names or list(_PROVIDER_REGISTRY.keys())
    providers: List["SaaSProvider"] = []
    
    for name in names:
        cls = _PROVIDER_REGISTRY.get(name)
        if cls is None:
            logger.error(
                f"Unknown provider '{name}'. Available: {', '.join(_PROVIDER_REGISTRY.keys())}"
            )
            continue
        
        try:
            provider = cls(config) if config else cls()
            providers.append(provider)
        except Exception:
            logger.exception(f"Failed to instantiate provider '{name}'")
    
    return providers


# ── License Schema ────────────────────────────────────────────────────────────
@dataclass
class SaaSLicense:
    """Normalized SaaS license representation."""
    
    name: str
    vendor: str
    seat_count: int
    cost: float = 0.0
    expiry_date: Optional[str] = None  # YYYY-MM-DD format
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for backend payload."""
        return {
            "name": self.name,
            "vendor": self.vendor,
            "seat_count": self.seat_count,
            "cost": self.cost,
            "expiry_date": self.expiry_date,
        }
    
    def validate(self) -> bool:
        """Validate license data."""
        if not self.name or not self.vendor:
            logger.warning(
                f"Invalid license: name='{self.name}' vendor='{self.vendor}'"
            )
            return False
        
        if self.seat_count < 0:
            logger.warning(f"Invalid seat_count: {self.seat_count} for {self.name}")
            return False
        
        if self.cost < 0:
            logger.warning(f"Invalid cost: {self.cost} for {self.name}")
            return False
        
        return True


# ── Abstract Provider Base ────────────────────────────────────────────────────
class SaaSProvider(ABC):
    """
    Abstract base class for all SaaS providers.
    
    To add a new provider:
      1. Subclass SaaSProvider
      2. Implement name() and discover()
      3. Decorate with @register_provider
      4. No other changes needed
    """
    
    def __init__(self, config: Optional[AgentConfig] = None):
        self.config = config
        self.rate_limiter: Optional[RateLimiter] = None
        
        if config:
            self.rate_limiter = RateLimiter(
                max_requests=config.ext_api_rate_limit,
                time_window=60.0
            )
    
    @staticmethod
    @abstractmethod
    def name() -> str:
        """Return unique provider name (lowercase)."""
        pass
    
    @abstractmethod
    def discover(self) -> List[SaaSLicense]:
        """
        Discover SaaS licenses from this provider.
        
        Returns:
            List of SaaSLicense objects
        
        Raises:
            AuthenticationError: If authentication fails
            APIError: If API calls fail
        """
        pass
    
    @abstractmethod
    def check_prerequisites(self) -> bool:
        """
        Check if provider prerequisites are met (SDK installed, env vars set).
        
        Returns:
            True if ready to run, False otherwise
        """
        pass
    
    def acquire_rate_limit(self):
        """Acquire rate limit slot before making external API call."""
        if self.rate_limiter:
            self.rate_limiter.acquire()


# ── Provider Discovery Runner ─────────────────────────────────────────────────
def run_provider_discovery(
    provider: SaaSProvider,
    metrics: DiscoveryMetrics,
    shutdown: GracefulShutdown
) -> List[SaaSLicense]:
    """
    Run discovery for a single provider with timing and error handling.
    
    Args:
        provider: Provider instance
        metrics: Metrics tracker
        shutdown: Shutdown handler
    
    Returns:
        List of discovered licenses (empty on error)
    """
    if not shutdown.should_continue():
        return []
    
    provider_name = provider.name()
    
    # Check prerequisites
    if not provider.check_prerequisites():
        logger.info(f"[{provider_name}] Prerequisites not met, skipping")
        return []
    
    logger.info(f"[{provider_name}] Starting discovery...")
    start_time = time.time()
    
    try:
        licenses = provider.discover()
        duration = time.time() - start_time
        
        # Validate licenses
        valid_licenses = [lic for lic in licenses if lic.validate()]
        invalid_count = len(licenses) - len(valid_licenses)
        
        if invalid_count > 0:
            logger.warning(
                f"[{provider_name}] Filtered {invalid_count} invalid licenses"
            )
        
        metrics.discovery_time_by_provider[provider_name] = duration
        metrics.providers_succeeded += 1
        metrics.licenses_discovered += len(valid_licenses)
        
        logger.info(
            f"[{provider_name}] Discovered {len(valid_licenses)} licenses "
            f"in {duration:.2f}s"
        )
        
        return valid_licenses
    
    except AuthenticationError as e:
        logger.error(f"[{provider_name}] Authentication failed: {e}")
        metrics.providers_failed += 1
        return []
    
    except APIError as e:
        logger.error(f"[{provider_name}] API error: {e}")
        metrics.providers_failed += 1
        return []
    
    except Exception:
        logger.exception(f"[{provider_name}] Unexpected error during discovery")
        metrics.providers_failed += 1
        return []


def discover_all_providers_parallel(
    providers: List[SaaSProvider],
    config: AgentConfig,
    metrics: DiscoveryMetrics,
    shutdown: GracefulShutdown
) -> Dict[str, List[SaaSLicense]]:
    """
    Run multiple providers in parallel.
    
    Args:
        providers: List of provider instances
        config: Agent configuration
        metrics: Metrics tracker
        shutdown: Shutdown handler
    
    Returns:
        Dictionary mapping provider name to list of licenses
    """
    results: Dict[str, List[SaaSLicense]] = {}
    metrics.providers_attempted = len(providers)
    
    if not providers:
        return results
    
    logger.info(f"Running {len(providers)} providers in parallel...")
    
    with ThreadPoolExecutor(max_workers=config.provider_workers) as executor:
        future_to_provider = {
            executor.submit(run_provider_discovery, provider, metrics, shutdown): provider.name()
            for provider in providers
        }
        
        for future in as_completed(future_to_provider):
            provider_name = future_to_provider[future]
            
            if not shutdown.should_continue():
                logger.warning("Shutdown requested, cancelling remaining providers...")
                break
            
            try:
                licenses = future.result()
                results[provider_name] = licenses
            except Exception:
                logger.exception(f"Provider '{provider_name}' failed unexpectedly")
                results[provider_name] = []
    
    return results


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 3
# ══════════════════════════════════════════════════════════════════════════════

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    _GOOGLE_SDK_AVAILABLE = True
except ImportError:
    _GOOGLE_SDK_AVAILABLE = False


@register_provider
class GoogleWorkspaceProvider(SaaSProvider):
    """
    Google Workspace license discovery provider.
    
    Environment variables:
        GOOGLE_APPLICATION_CREDENTIALS — Path to service account JSON
        GOOGLE_CUSTOMER_ID — Customer ID (default: my_customer)
    
    Required OAuth scopes:
        - https://www.googleapis.com/auth/apps.licensing
        - https://www.googleapis.com/auth/admin.directory.subscription.readonly
    """
    
    # Products to discover
    PRODUCTS = [
        "Google-Apps",
        "Google-Drive-Storage", 
        "Google-Vault"
    ]
    
    SCOPES = [
        "https://www.googleapis.com/auth/apps.licensing",
        "https://www.googleapis.com/auth/admin.directory.subscription.readonly",
    ]
    
    @staticmethod
    def name() -> str:
        return "google"
    
    def check_prerequisites(self) -> bool:
        """Check if Google SDK is installed and credentials are configured."""
        if not _GOOGLE_SDK_AVAILABLE:
            logger.warning(
                "[Google] Google SDK not installed. "
                "Run: pip install google-auth google-api-python-client"
            )
            return False
        
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not creds_path:
            logger.warning(
                "[Google] GOOGLE_APPLICATION_CREDENTIALS not set. Skipping."
            )
            return False
        
        if not os.path.exists(creds_path):
            logger.error(
                f"[Google] Credentials file not found at '{creds_path}'"
            )
            return False
        
        return True
    
    def _get_credentials(self):
        """Load and return service account credentials."""
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        try:
            return service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=self.SCOPES
            )
        except Exception as e:
            raise AuthenticationError(
                f"Failed to load Google credentials from '{creds_path}': {e}"
            ) from e
    
    def _get_expiry_date(
        self,
        reseller_service,
        customer_id: str,
        product_id: str
    ) -> Optional[str]:
        """
        Attempt to fetch real expiry date from Reseller API.
        
        Returns:
            Expiry date in YYYY-MM-DD format, or None if unavailable
        """
        try:
            self.acquire_rate_limit()
            
            subscription = reseller_service.subscriptions().get(
                customerId=customer_id,
                subscriptionId=product_id
            ).execute()
            
            trial_end = subscription.get("trialSettings", {}).get("trialEndTime")
            if trial_end:
                # trialEndTime is in milliseconds
                dt = datetime.fromtimestamp(int(trial_end) / 1000, tz=timezone.utc)
                return dt.strftime("%Y-%m-%d")
            
            return None
            
        except HttpError as e:
            # 404 = no subscription found, not an error
            if e.resp.status == 404:
                logger.debug(
                    f"[Google] No subscription found for {product_id} (this is normal)"
                )
            else:
                logger.debug(
                    f"[Google] Could not fetch expiry for {product_id}: {e}"
                )
            return None
        
        except Exception as e:
            logger.debug(
                f"[Google] Unexpected error fetching expiry for {product_id}: {e}"
            )
            return None
    
    def _discover_product(
        self,
        licensing_service,
        reseller_service,
        customer_id: str,
        product_id: str
    ) -> Optional[SaaSLicense]:
        """
        Discover licenses for a single Google product.
        
        Args:
            licensing_service: Google Licensing API service
            reseller_service: Google Reseller API service
            customer_id: Google customer ID
            product_id: Product identifier
        
        Returns:
            SaaSLicense object if licenses found, None otherwise
        """
        try:
            self.acquire_rate_limit()
            
            # Fetch license assignments
            result = licensing_service.licenseAssignments().listForProduct(
                productId=product_id,
                customerId=customer_id
            ).execute()
            
            assignments = result.get("items", [])
            
            if not assignments:
                logger.debug(f"[Google] No licenses found for {product_id}")
                return None
            
            # Try to get expiry date
            expiry_date = self._get_expiry_date(
                reseller_service,
                customer_id,
                product_id
            )
            
            return SaaSLicense(
                name=f"{product_id} Subscription",
                vendor="Google",
                seat_count=len(assignments),
                cost=0.0,
                expiry_date=expiry_date
            )
            
        except HttpError as e:
            # Log but don't fail - one product error shouldn't stop others
            logger.warning(
                f"[Google] HTTP error fetching {product_id}: "
                f"{e.resp.status} {e.reason}"
            )
            raise APIError(
                f"Google API error for {product_id}: {e.resp.status}"
            ) from e
        
        except Exception as e:
            logger.error(f"[Google] Unexpected error fetching {product_id}: {e}")
            raise APIError(f"Unexpected error for {product_id}") from e
    
    def discover(self) -> List[SaaSLicense]:
        """Discover all Google Workspace licenses."""
        customer_id = os.getenv("GOOGLE_CUSTOMER_ID", "my_customer")
        
        logger.info(f"[Google] Starting discovery for customer: {customer_id}")
        
        # Get credentials and build services
        try:
            creds = self._get_credentials()
            
            licensing_service = build("licensing", "v1", credentials=creds)
            
            # Reseller API may not be available for all accounts
            try:
                reseller_service = build("reseller", "v1", credentials=creds)
            except Exception as e:
                logger.debug(
                    f"[Google] Reseller API not available: {e}. "
                    "Expiry dates will be null."
                )
                reseller_service = None
                
        except Exception as e:
            raise AuthenticationError(f"Failed to initialize Google services: {e}") from e
        
        # Discover each product
        licenses: List[SaaSLicense] = []
        
        for product_id in self.PRODUCTS:
            try:
                license_obj = self._discover_product(
                    licensing_service,
                    reseller_service,
                    customer_id,
                    product_id
                )
                
                if license_obj:
                    licenses.append(license_obj)
                    logger.debug(
                        f"[Google] Found {license_obj.seat_count} seats "
                        f"for {product_id}"
                    )
                    
            except APIError as e:
                # Log and continue to next product
                logger.warning(f"[Google] Skipping {product_id} due to error: {e}")
                continue
        
        logger.info(
            f"[Google] Discovery complete. Found {len(licenses)} product types "
            f"with {sum(lic.seat_count for lic in licenses)} total seats."
        )
        
        return licenses


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 4
# ══════════════════════════════════════════════════════════════════════════════

try:
    import requests
    from requests.exceptions import RequestException
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False


@register_provider
class Microsoft365Provider(SaaSProvider):
    """
    Microsoft 365 license discovery provider.
    
    Environment variables:
        AZURE_TENANT_ID — Azure AD tenant ID
        AZURE_CLIENT_ID — Application (client) ID
        AZURE_CLIENT_SECRET — Application client secret
    
    Required API permissions:
        - Organization.Read.All
        - Directory.Read.All
    """
    
    TOKEN_URL_TEMPLATE = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
    
    @staticmethod
    def name() -> str:
        return "m365"
    
    def check_prerequisites(self) -> bool:
        """Check if requests library is installed and credentials are configured."""
        if not _REQUESTS_AVAILABLE:
            logger.warning(
                "[M365] 'requests' library not installed. "
                "Run: pip install requests"
            )
            return False
        
        tenant_id = os.getenv("AZURE_TENANT_ID")
        client_id = os.getenv("AZURE_CLIENT_ID")
        client_secret = os.getenv("AZURE_CLIENT_SECRET")
        
        if not all([tenant_id, client_id, client_secret]):
            logger.warning(
                "[M365] Missing credentials. Required: "
                "AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"
            )
            return False
        
        return True
    
    def _acquire_token(self) -> str:
        """
        Acquire OAuth access token using client credentials flow.
        
        Returns:
            Access token string
        
        Raises:
            AuthenticationError: If token acquisition fails
        """
        tenant_id = os.getenv("AZURE_TENANT_ID")
        client_id = os.getenv("AZURE_CLIENT_ID")
        client_secret = os.getenv("AZURE_CLIENT_SECRET")
        
        token_url = self.TOKEN_URL_TEMPLATE.format(tenant_id=tenant_id)
        token_data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
        }
        
        try:
            self.acquire_rate_limit()
            
            timeout = self.config.ext_api_timeout if self.config else 30
            response = requests.post(
                token_url,
                data=token_data,
                timeout=timeout
            )
            response.raise_for_status()
            token_json = response.json()
            
            access_token = token_json.get("access_token")
            if not access_token:
                error_desc = token_json.get(
                    "error_description",
                    token_json.get("error", "Unknown error")
                )
                raise AuthenticationError(
                    f"Token response missing access_token: {error_desc}"
                )
            
            logger.debug("[M365] Successfully acquired access token")
            return access_token
            
        except RequestException as e:
            raise AuthenticationError(
                f"Failed to acquire Microsoft Graph token: {e}"
            ) from e
        except Exception as e:
            raise AuthenticationError(
                f"Unexpected error acquiring token: {e}"
            ) from e
    
    def _fetch_subscribed_skus(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Fetch subscribed SKUs from Microsoft Graph API.
        
        Args:
            access_token: OAuth access token
        
        Returns:
            List of SKU dictionaries
        
        Raises:
            APIError: If API request fails
        """
        url = f"{self.GRAPH_API_BASE}/subscribedSkus"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            self.acquire_rate_limit()
            
            timeout = self.config.ext_api_timeout if self.config else 30
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            
            data = response.json()
            skus = data.get("value", [])
            
            logger.debug(f"[M365] Fetched {len(skus)} subscribed SKUs")
            return skus
            
        except RequestException as e:
            raise APIError(
                f"Failed to fetch M365 subscribed SKUs: {e}"
            ) from e
        except Exception as e:
            raise APIError(
                f"Unexpected error fetching SKUs: {e}"
            ) from e
    
    def _fetch_subscription_expiry(
        self,
        access_token: str
    ) -> Dict[str, str]:
        """
        Fetch subscription expiry dates from directory/subscriptions endpoint.
        
        Args:
            access_token: OAuth access token
        
        Returns:
            Dictionary mapping SKU ID to expiry date (YYYY-MM-DD)
        """
        url = f"{self.GRAPH_API_BASE}/directory/subscriptions"
        headers = {"Authorization": f"Bearer {access_token}"}
        expiry_map: Dict[str, str] = {}
        
        try:
            self.acquire_rate_limit()
            
            timeout = self.config.ext_api_timeout if self.config else 30
            response = requests.get(url, headers=headers, timeout=timeout)
            
            # This endpoint may return 403 if permissions are insufficient
            if response.status_code == 403:
                logger.debug(
                    "[M365] Insufficient permissions for directory/subscriptions. "
                    "Expiry dates will be null."
                )
                return expiry_map
            
            response.raise_for_status()
            data = response.json()
            
            for sub in data.get("value", []):
                sku_id = sub.get("skuId")
                expiry_str = sub.get("nextLifecycleDateTime")
                
                if sku_id and expiry_str:
                    expiry_date = parse_iso_date(expiry_str)
                    if expiry_date:
                        expiry_map[sku_id] = expiry_date
            
            logger.debug(
                f"[M365] Fetched expiry dates for {len(expiry_map)} subscriptions"
            )
            
        except RequestException as e:
            logger.debug(
                f"[M365] Could not fetch subscription expiry data: {e}. "
                "Expiry dates will be null."
            )
        except Exception as e:
            logger.debug(
                f"[M365] Unexpected error fetching expiry data: {e}"
            )
        
        return expiry_map
    
    def discover(self) -> List[SaaSLicense]:
        """Discover all Microsoft 365 licenses."""
        tenant_id = os.getenv("AZURE_TENANT_ID")
        
        logger.info(f"[M365] Starting discovery for tenant: {tenant_id}")
        
        # Acquire access token
        access_token = self._acquire_token()
        
        # Fetch subscribed SKUs
        skus = self._fetch_subscribed_skus(access_token)
        
        if not skus:
            logger.info("[M365] No subscribed SKUs found")
            return []
        
        # Fetch subscription expiry dates
        expiry_map = self._fetch_subscription_expiry(access_token)
        
        # Build license list
        licenses: List[SaaSLicense] = []
        
        for sku in skus:
            sku_id = sku.get("skuId")
            sku_name = sku.get("skuPartNumber", "Unknown M365 SKU")
            consumed_units = sku.get("consumedUnits", 0)
            
            # Safe integer conversion
            seat_count = safe_int(consumed_units, default=0)
            
            # Get expiry date if available
            expiry_date = expiry_map.get(sku_id) if sku_id else None
            
            license_obj = SaaSLicense(
                name=sku_name,
                vendor="Microsoft",
                seat_count=seat_count,
                cost=0.0,
                expiry_date=expiry_date
            )
            
            licenses.append(license_obj)
            
            logger.debug(
                f"[M365] Found {seat_count} seats for {sku_name}"
                + (f" (expires {expiry_date})" if expiry_date else "")
            )
        
        total_seats = sum(lic.seat_count for lic in licenses)
        logger.info(
            f"[M365] Discovery complete. Found {len(licenses)} SKUs "
            f"with {total_seats} total seats."
        )
        
        return licenses


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 5
# ══════════════════════════════════════════════════════════════════════════════


def main():
    """Main entry point for SaaS discovery agent."""
    
    # ── Parse CLI arguments ───────────────────────────────────────────────────
    parser = argparse.ArgumentParser(
        description="Production-Ready SaaS License Discovery Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Available providers: {', '.join(get_registered_providers())}

Environment variables:
  Required: AGENT_SECRET, SAAS_AGENT_ID
  Optional: BACKEND_URL, HTTP_TIMEOUT, PROVIDER_WORKERS, etc.

Examples:
  # Run all providers
  python saas_discovery_agent.py
  
  # Run specific providers
  python saas_discovery_agent.py --providers google m365
  
  # Dry-run mode (no backend sync)
  python saas_discovery_agent.py --dry-run
  
  # Skip health check
  python saas_discovery_agent.py --skip-health-check
        """
    )
    
    parser.add_argument(
        "--providers",
        nargs="+",
        choices=get_registered_providers(),
        help="Which SaaS providers to run (default: all available)",
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print payloads without sending to backend",
    )
    
    parser.add_argument(
        "--skip-health-check",
        action="store_true",
        help="Skip backend health check at startup",
    )
    
    parser.add_argument(
        "--list-providers",
        action="store_true",
        help="List all registered providers and exit",
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="SaaS Discovery Agent v3.0.0-production",
    )
    
    args = parser.parse_args()
    
    # ── List providers and exit ───────────────────────────────────────────────
    if args.list_providers:
        print("Registered SaaS providers:")
        for provider_name in get_registered_providers():
            print(f"  • {provider_name}")
        sys.exit(0)
    
    # ── Load and validate configuration ───────────────────────────────────────
    try:
        config = AgentConfig.from_env(dry_run=args.dry_run)
        config.validate()
    except ConfigurationError as e:
        logger.critical(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    # ── Initialize support systems ────────────────────────────────────────────
    metrics = DiscoveryMetrics()
    shutdown = GracefulShutdown()
    
    logger.info("═" * 70)
    logger.info("SaaS License Discovery Agent v3.0.0")
    logger.info(f"Started at: {utcnow().isoformat()}")
    if args.dry_run:
        logger.info("🔍 DRY-RUN MODE (no backend sync)")
    logger.info("─" * 70)
    logger.info(f"Configuration:")
    logger.info(f"  Backend: {config.backend_host}")
    logger.info(f"  Agent ID: {config.agent_id}")
    logger.info(f"  Provider workers: {config.provider_workers}")
    logger.info(f"  External API rate limit: {config.ext_api_rate_limit}/min")
    logger.info(f"  SSL verification: {'enabled' if config.ssl_verify else 'DISABLED'}")
    logger.info("═" * 70)
    
    # ── Backend health check ──────────────────────────────────────────────────
    if not args.dry_run and not args.skip_health_check:
        if not check_backend_health(config):
            logger.warning("⚠️  Backend health check failed, continuing anyway...")
    
    # ── Build provider list ───────────────────────────────────────────────────
    provider_names = args.providers or get_registered_providers()
    providers = build_providers(provider_names, config)
    
    if not providers:
        logger.error("❌ No valid providers could be initialized")
        sys.exit(1)
    
    logger.info(f"Initialized {len(providers)} provider(s): {', '.join(p.name() for p in providers)}")
    
    # ── Parallel provider discovery ──────────────────────────────────────────
    logger.info("")
    logger.info("Starting parallel provider discovery...")
    logger.info("─" * 70)
    
    licenses_by_provider = discover_all_providers_parallel(
        providers, config, metrics, shutdown
    )
    
    # Check if shutdown was requested
    if shutdown.shutdown_requested:
        logger.warning("⚠️  Discovery interrupted by shutdown signal")
        metrics.log_summary()
        sys.exit(130)  # 128 + SIGINT
    
    # ── Sync to backend ───────────────────────────────────────────────────────
    logger.info("")
    logger.info("Starting backend synchronization...")
    logger.info("─" * 70)
    
    sync_results: Dict[str, bool] = {}
    
    for provider_name, licenses in licenses_by_provider.items():
        if not licenses:
            logger.info(f"[{provider_name}] No licenses to sync, skipping")
            sync_results[provider_name] = True
            continue
        
        if shutdown.should_continue():
            # Convert SaaSLicense objects to dicts
            license_dicts = [lic.to_dict() for lic in licenses]
            
            # Determine platform display name
            platform_map = {
                "google": "Google Workspace",
                "m365": "Microsoft 365",
            }
            platform = platform_map.get(provider_name, provider_name.title())
            
            success = send_to_backend(
                platform=platform,
                licenses=license_dicts,
                config=config,
                metrics=metrics,
                dry_run=args.dry_run
            )
            
            sync_results[provider_name] = success
        else:
            logger.warning("⚠️  Shutdown requested, skipping remaining syncs...")
            break
    
    # ── Final summary & Metrics ───────────────────────────────────────────────
    logger.info("")
    metrics.log_summary()
    
    if not args.dry_run:
        report_metrics(config, metrics)
    
    # ── Exit with appropriate code ────────────────────────────────────────────
    failed_providers = [name for name, success in sync_results.items() if not success]
    
    if shutdown.shutdown_requested:
        logger.warning("⚠️  Agent interrupted by shutdown signal")
        sys.exit(130)
    
    if failed_providers:
        logger.error(f"❌ The following providers failed: {', '.join(failed_providers)}")
        sys.exit(1)
    
    if metrics.licenses_failed > 0:
        logger.warning(f"⚠️  {metrics.licenses_failed} license(s) failed to sync")
        sys.exit(1)
    
    logger.info("✅ SaaS Discovery Agent completed successfully")
    sys.exit(0)


if __name__ == "__main__":
    main()


# ══════════════════════════════════════════════════════════════════════════════
# END OF PART 6
# ══════════════════════════════════════════════════════════════════════════════