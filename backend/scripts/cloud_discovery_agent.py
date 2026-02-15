"""
cloud_discovery_agent_enhanced.py — Universal Multi-Cloud Discovery Agent (Enhanced)

Enhanced features:
  - Parallel provider execution for faster discovery
  - Rate limiting to protect backend
  - Comprehensive metrics and progress tracking
  - Graceful shutdown handling
  - Backend health checks
  - Centralized configuration management
  - Request signing for enhanced security
  - Custom exception hierarchy

Supports ANY cloud provider via a self-registering plugin architecture.
Add a new provider by creating a class that inherits from CloudProvider
and decorating it with @register_provider — no other changes needed.

Built-in providers: AWS, Azure, GCP, DigitalOcean, Oracle Cloud, Alibaba Cloud, Generic JSON.

Environment variables:
  AGENT_SECRET          — Backend auth key (required)
  CLOUD_AGENT_ID        — Agent UUID for this collector (required)
  CLOUD_LOCATION_ID     — Default location UUID (optional)
  BACKEND_URL           — Backend host[:port] (default: 127.0.0.1:8000)
  BACKEND_SSL_VERIFY    — Set to 'false' for self-signed certs in dev
  ENABLED_PROVIDERS     — Comma-separated list of provider names to run
  HTTP_TIMEOUT          — Seconds before backend request times out (default: 15)
  HTTP_RETRIES          — Max retry attempts per asset (default: 3)
  HTTP_RETRY_DELAY      — Seconds between retries (default: 2.0)
  PROVIDER_WORKERS      — Max parallel provider workers (default: 3)
  ASSET_WORKERS         — Max parallel asset sync workers (default: 10)
  MAX_REQUESTS_PER_MIN  — Rate limit for backend requests (default: 100)
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
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type, Counter as CounterType
from collections import deque, Counter
from dotenv import load_dotenv

# ── Environment & logging ─────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("cloud_discovery_agent")


# ── Part 0: Custom Exceptions ─────────────────────────────────────────────────
class CloudDiscoveryError(Exception):
    """Base exception for cloud discovery errors."""
    pass


class ProviderAuthError(CloudDiscoveryError):
    """Authentication/authorization failed for a provider."""
    pass


class ProviderAPIError(CloudDiscoveryError):
    """Provider API returned an error."""
    pass


class BackendError(CloudDiscoveryError):
    """Backend communication error."""
    pass


class ConfigurationError(CloudDiscoveryError):
    """Configuration validation error."""
    pass


# ── Part 0b: Configuration Management ─────────────────────────────────────────
@dataclass
class AgentConfig:
    """Centralized configuration with validation."""
    
    # Backend
    backend_host: str
    agent_secret: str
    agent_id: str
    location_id: Optional[str] = None
    ssl_verify: bool = True
    
    # HTTP
    timeout_sec: int = 15
    max_retries: int = 3
    retry_delay: float = 2.0
    
    # Concurrency
    max_provider_workers: int = 3
    max_asset_workers: int = 10
    
    # Rate limiting
    max_requests_per_minute: int = 100
    
    @classmethod
    def from_env(cls, dry_run: bool = False) -> "AgentConfig":
        """Load configuration from environment variables."""
        if not dry_run:
            if not os.getenv("AGENT_SECRET"):
                raise ConfigurationError("AGENT_SECRET environment variable is required")
            if not os.getenv("CLOUD_AGENT_ID"):
                raise ConfigurationError("CLOUD_AGENT_ID environment variable is required")
        
        backend_url = os.getenv("BACKEND_URL", "127.0.0.1:8000")
        backend_host = backend_url.replace("https://", "").replace("http://", "").rstrip("/")
        
        return cls(
            backend_host=backend_host,
            agent_secret=os.getenv("AGENT_SECRET", "dry-run-secret"),
            agent_id=os.getenv("CLOUD_AGENT_ID", "dry-run-agent"),
            location_id=os.getenv("CLOUD_LOCATION_ID"),
            ssl_verify=os.getenv("BACKEND_SSL_VERIFY", "true").lower() != "false",
            timeout_sec=int(os.getenv("HTTP_TIMEOUT", "15")),
            max_retries=int(os.getenv("HTTP_RETRIES", "3")),
            retry_delay=float(os.getenv("HTTP_RETRY_DELAY", "2.0")),
            max_provider_workers=int(os.getenv("PROVIDER_WORKERS", "3")),
            max_asset_workers=int(os.getenv("ASSET_WORKERS", "10")),
            max_requests_per_minute=int(os.getenv("MAX_REQUESTS_PER_MIN", "100")),
        )
    
    def validate(self):
        """Validate configuration values."""
        if self.max_retries < 1:
            raise ConfigurationError("max_retries must be >= 1")
        if self.timeout_sec < 1:
            raise ConfigurationError("timeout_sec must be >= 1")
        if self.max_provider_workers < 1:
            raise ConfigurationError("max_provider_workers must be >= 1")
        if self.max_asset_workers < 1:
            raise ConfigurationError("max_asset_workers must be >= 1")
        if self.max_requests_per_minute < 1:
            raise ConfigurationError("max_requests_per_minute must be >= 1")
    
    def make_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context based on configuration."""
        ctx = ssl.create_default_context()
        if not self.ssl_verify:
            logger.warning("TLS verification DISABLED (ssl_verify=false). Not for production.")
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        return ctx


# ── Part 0c: Metrics Collection ──────────────────────────────────────────────
@dataclass
class DiscoveryMetrics:
    """Collect metrics during discovery."""
    
    providers_attempted: int = 0
    providers_succeeded: int = 0
    providers_failed: int = 0
    
    assets_discovered: int = 0
    assets_valid: int = 0
    assets_invalid: int = 0
    assets_synced: int = 0
    assets_failed: int = 0
    
    sync_errors_by_status: CounterType = field(default_factory=Counter)
    discovery_time_by_provider: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self, agent_id: str = "agent-cloud") -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "agent_id": agent_id,
            "providers": {
                "attempted": self.providers_attempted,
                "succeeded": self.providers_succeeded,
                "failed": self.providers_failed,
            },
            "assets": {
                "discovered": self.assets_discovered,
                "valid": self.assets_valid,
                "invalid": self.assets_invalid,
                "synced": self.assets_synced,
                "failed": self.assets_failed,
            },
            "errors_by_status": dict(self.sync_errors_by_status),
            "discovery_times": self.discovery_time_by_provider,
        }
    
    def log_summary(self):
        """Log a summary of metrics."""
        logger.info("=" * 60)
        logger.info("Discovery Summary:")
        logger.info(f"  Providers: {self.providers_succeeded}/{self.providers_attempted} succeeded")
        logger.info(f"  Assets: {self.assets_synced}/{self.assets_valid} synced successfully")
        logger.info(f"  Invalid assets: {self.assets_invalid}")
        logger.info(f"  Failed syncs: {self.assets_failed}")
        if self.sync_errors_by_status:
            logger.info("  Errors by status code:")
            for status, count in self.sync_errors_by_status.most_common():
                logger.info(f"    HTTP {status}: {count}")
        if self.discovery_time_by_provider:
            logger.info("  Discovery times:")
            for provider, duration in sorted(self.discovery_time_by_provider.items()):
                logger.info(f"    {provider}: {duration:.2f}s")
        logger.info("=" * 60)


# ── Part 0d: Progress Tracker ─────────────────────────────────────────────────
class ProgressTracker:
    """Track and display discovery progress."""
    
    def __init__(self, total: int, name: str = "Progress"):
        self.total = total
        self.completed = 0
        self.start_time = time.time()
        self.name = name
        self.lock = threading.Lock()
        self.last_log_time = 0
        self.log_interval = 5  # Log every 5 seconds
    
    def update(self, increment: int = 1):
        """Update progress counter."""
        with self.lock:
            self.completed += increment
            now = time.time()
            
            # Only log if enough time has passed or we're done
            if now - self.last_log_time >= self.log_interval or self.completed >= self.total:
                self.last_log_time = now
                elapsed = now - self.start_time
                rate = self.completed / elapsed if elapsed > 0 else 0
                eta = (self.total - self.completed) / rate if rate > 0 else 0
                
                logger.info(
                    f"{self.name}: {self.completed}/{self.total} "
                    f"({100*self.completed/self.total:.1f}%) "
                    f"[{rate:.1f}/s] "
                    f"ETA: {int(eta)}s"
                )


# ── Part 0e: Rate Limiter ─────────────────────────────────────────────────────
class RateLimiter:
    """Token bucket rate limiter for backend requests."""
    
    def __init__(self, max_requests: int, time_window: float = 60.0):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self.lock = threading.Lock()
    
    def acquire(self):
        """Wait until a request slot is available."""
        with self.lock:
            now = time.time()
            
            # Remove old requests outside time window
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


# ── Part 0f: Graceful Shutdown Handler ───────────────────────────────────────
class GracefulShutdown:
    """Handle shutdown signals gracefully."""
    
    def __init__(self):
        self.shutdown_requested = False
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        logger.warning(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True
    
    def should_continue(self) -> bool:
        """Check if operation should continue."""
        return not self.shutdown_requested


# ── Part 1: Provider Registry ─────────────────────────────────────────────────
_PROVIDER_REGISTRY: Dict[str, Type["CloudProvider"]] = {}


def register_provider(cls: Type["CloudProvider"]) -> Type["CloudProvider"]:
    """
    Class decorator that registers a CloudProvider subclass by its .name property.

    Usage:
        @register_provider
        class MyCloudProvider(CloudProvider):
            @staticmethod
            def _static_name() -> str:
                return "mycloud"
            ...
    """
    instance_name = cls._static_name()
    if instance_name in _PROVIDER_REGISTRY:
        raise ValueError(
            f"Provider '{instance_name}' is already registered. "
            "Each provider must have a unique name."
        )
    _PROVIDER_REGISTRY[instance_name] = cls
    logger.debug("Registered cloud provider: '%s'", instance_name)
    return cls


def get_registered_providers() -> List[str]:
    """Return the names of all registered providers."""
    return list(_PROVIDER_REGISTRY.keys())


def build_providers(
    names: Optional[List[str]] = None,
    extra_kwargs: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List["CloudProvider"]:
    """
    Instantiate providers by name.
    - names=None means all registered providers.
    - extra_kwargs maps provider_name → constructor kwargs.
    """
    names = names or list(_PROVIDER_REGISTRY.keys())
    extra_kwargs = extra_kwargs or {}
    providers: List["CloudProvider"] = []

    for name in names:
        cls = _PROVIDER_REGISTRY.get(name)
        if cls is None:
            logger.error(
                "Unknown provider '%s'. Available: %s",
                name, ", ".join(_PROVIDER_REGISTRY.keys()),
            )
            continue
        try:
            providers.append(cls(**extra_kwargs.get(name, {})))
        except Exception:
            logger.exception("Failed to instantiate provider '%s'.", name)

    return providers


# ── Part 2: Standardised Asset Schema ────────────────────────────────────────
@dataclass
class NormalisedAsset:
    """
    Enforced contract between providers and the backend payload builder.
    All providers MUST return a list of NormalisedAsset instances.
    """
    hostname: str
    vendor: str  # e.g. "AWS", "GCP", "Azure"
    type: str = "Cloud Instance"
    model: str = "Generic Instance"
    serial: Optional[str] = None  # None = unknown; never a fake UUID
    ip: Optional[str] = None
    specs: Dict[str, Any] = field(default_factory=dict)

    def validate(self) -> bool:
        """Return False and log a warning if required fields are missing."""
        if not self.hostname or not self.vendor:
            logger.warning(
                "Asset validation failed — hostname='%s' vendor='%s'",
                self.hostname, self.vendor,
            )
            return False
        return True


# ── Abstract base ─────────────────────────────────────────────────────────────
class CloudProvider(ABC):
    """
    Base class for all cloud discovery plugins.

    To add a new provider:
      1. Subclass CloudProvider
      2. Implement `_static_name()`, `name`, and `discover()`
      3. Decorate with @register_provider
      4. No other changes required anywhere in this file.
    """

    @staticmethod
    @abstractmethod
    def _static_name() -> str:
        """
        Unique lowercase identifier used by the registry and CLI.
        Must be a static method so register_provider can call it without
        instantiating the class.
        """
        pass

    @property
    def name(self) -> str:
        return self._static_name()

    @abstractmethod
    def discover(self) -> List[NormalisedAsset]:
        """Discover assets and return a list of NormalisedAsset instances."""
        pass


# ── Part 3a: AWS Provider ─────────────────────────────────────────────────────
try:
    import boto3
    from botocore.exceptions import NoCredentialsError, PartialCredentialsError, BotoCoreError
    _BOTO3_AVAILABLE = True
except ImportError:
    _BOTO3_AVAILABLE = False


@register_provider
class AWSProvider(CloudProvider):
    """
    Discovers EC2 instances across one or more AWS regions.

    Required env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (or instance role)
    Optional env vars: AWS_REGIONS (comma-separated, default: us-east-1)
    """

    def __init__(self, regions: Optional[List[str]] = None) -> None:
        raw = os.getenv("AWS_REGIONS", os.getenv("AWS_REGION", "us-east-1"))
        self._regions = regions or [r.strip() for r in raw.split(",")]

    @staticmethod
    def _static_name() -> str:
        return "aws"

    def _discover_region(self, region: str) -> List[NormalisedAsset]:
        ec2 = boto3.client("ec2", region_name=region)
        paginator = ec2.get_paginator("describe_instances")
        
        # 1. Collect all instances first
        instances = []
        for page in paginator.paginate():
            for reservation in page.get("Reservations", []):
                instances.extend(reservation.get("Instances", []))
        
        if not instances:
            return []

        # 2. Collect unique types, AMIs, and Volume IDs for batch fetching
        instance_types = set(i["InstanceType"] for i in instances if "InstanceType" in i)
        image_ids = set(i["ImageId"] for i in instances if "ImageId" in i)
        volume_ids = set()
        for i in instances:
            for mapping in i.get("BlockDeviceMappings", []):
                if "Ebs" in mapping and "VolumeId" in mapping["Ebs"]:
                    volume_ids.add(mapping["Ebs"]["VolumeId"])
        
        # 3. Fetch Instance Type Details (RAM, vCPU)
        type_details = {}
        if instance_types:
            try:
                # AWS allows filtering by instance-type
                chunks = [list(instance_types)[i:i + 100] for i in range(0, len(instance_types), 100)]
                for chunk in chunks:
                    resp = ec2.describe_instance_types(InstanceTypes=chunk)
                    for t in resp.get("InstanceTypes", []):
                        name = t["InstanceType"]
                        memory_mib = t.get("MemoryInfo", {}).get("SizeInMiB", 0)
                        vcpus = t.get("VCpuInfo", {}).get("DefaultVCpus", 0)
                        type_details[name] = {
                            "ram_gb": round(memory_mib / 1024, 2),
                            "vcpus": vcpus
                        }
            except Exception as e:
                logger.warning(f"[AWS] Failed to fetch instance types in {region}: {e}")

        # 4. Fetch AMI Details (OS Name, Platform)
        ami_details = {}
        if image_ids:
            try:
                # AWS allows filtering by image-id
                chunks = [list(image_ids)[i:i + 100] for i in range(0, len(image_ids), 100)]
                for chunk in chunks:
                    resp = ec2.describe_images(ImageIds=chunk)
                    for img in resp.get("Images", []):
                        ami_id = img["ImageId"]
                        # Prioritize Description, then Name, then Platform
                        os_name = img.get("Description") or img.get("Name") or img.get("PlatformDetails") or "Unknown AMI"
                        platform = img.get("PlatformDetails") or img.get("Platform") or "Linux"
                        ami_details[ami_id] = {
                            "os_name": os_name,
                            "platform": platform
                        }
            except Exception as e:
                logger.warning(f"[AWS] Failed to fetch AMIs in {region}: {e}")

        # 5. Fetch Volume Details (Storage Size)
        vol_sizes = {}
        if volume_ids:
            try:
                chunks = [list(volume_ids)[i:i + 100] for i in range(0, len(volume_ids), 100)]
                for chunk in chunks:
                    resp = ec2.describe_volumes(VolumeIds=chunk)
                    for v in resp.get("Volumes", []):
                        vol_sizes[v["VolumeId"]] = v["Size"] # Size is in GiB
            except Exception as e:
                logger.warning(f"[AWS] Failed to fetch volumes in {region}: {e}")

        # 6. Build Assets with Enriched Data
        assets: List[NormalisedAsset] = []
        for instance in instances:
            name_tag = next(
                (t["Value"] for t in instance.get("Tags", []) if t["Key"] == "Name"),
                None,
            )
            
            i_type = instance.get("InstanceType", "unknown")
            ami_id = instance.get("ImageId", "unknown")
            
            # Get enriched data
            specs = type_details.get(i_type, {"ram_gb": 0, "vcpus": 0})
            os_info = ami_details.get(ami_id, {"os_name": "Cloud Native", "platform": "Cloud"})
            
            # Calculate Total Storage
            total_storage = 0
            for mapping in instance.get("BlockDeviceMappings", []):
                if "Ebs" in mapping:
                    vid = mapping["Ebs"].get("VolumeId")
                    total_storage += vol_sizes.get(vid, 0)
            
            # Map platform to broader OS type for UI icon/grouping
            os_platform = os_info["platform"].lower()
            if "windows" in os_platform:
                display_os = "Windows"
            elif "linux" in os_platform or "unix" in os_platform:
                display_os = "Linux"
            else:
                display_os = os_info["platform"]

            assets.append(NormalisedAsset(
                hostname=name_tag or instance["InstanceId"],
                vendor="AWS",
                model=i_type,
                serial=f"AWS-{instance['InstanceId']}",
                ip=instance.get("PrivateIpAddress"),
                specs={
                    "InstanceId": instance["InstanceId"],
                    "Region": region,
                    "VPC": instance.get("VpcId", "N/A"),
                    "State": instance["State"]["Name"],
                    "LaunchTime": instance["LaunchTime"].isoformat(),
                    "Discovery": "AWS Cloud",
                    "RAM": f"{specs['ram_gb']} GB",
                    "Processor": f"{specs['vcpus']} vCPU",
                    "Storage": f"{total_storage} GB" if total_storage > 0 else "N/A",
                    "OS": display_os,
                    "OS_Detail": os_info["os_name"],
                    "ImageID": ami_id
                },
            ))
        return assets

    def discover(self) -> List[NormalisedAsset]:
        if not _BOTO3_AVAILABLE:
            logger.warning("boto3 not installed. Skipping AWS. Run: pip install boto3")
            return []

        all_assets: List[NormalisedAsset] = []
        for region in self._regions:
            logger.info("[AWS] Scanning region: %s", region)
            try:
                assets = self._discover_region(region)
                logger.info("[AWS] Found %d instances in %s.", len(assets), region)
                all_assets.extend(assets)
            except (NoCredentialsError, PartialCredentialsError) as e:
                raise ProviderAuthError(f"[AWS] Credentials error in {region}: {e}") from e
            except BotoCoreError as e:
                raise ProviderAPIError(f"[AWS] SDK error in {region}: {e}") from e
            except Exception:
                logger.exception("[AWS] Unexpected error in region %s.", region)

        return all_assets


# ── Part 3b: Azure Provider ───────────────────────────────────────────────────
try:
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.compute import ComputeManagementClient
    from azure.mgmt.network import NetworkManagementClient
    from azure.core.exceptions import AzureError
    _AZURE_AVAILABLE = True
except ImportError:
    _AZURE_AVAILABLE = False

_AZURE_NIC_WORKERS = int(os.getenv("AZURE_NIC_WORKERS", "10"))


@register_provider
class AzureProvider(CloudProvider):
    """
    Discovers Azure VMs across an entire subscription.

    Required env vars: AZURE_SUBSCRIPTION_ID
    Auth: AZURE_CLIENT_ID + AZURE_CLIENT_SECRET + AZURE_TENANT_ID
          or Managed Identity / Azure CLI session (DefaultAzureCredential)
    """

    @staticmethod
    def _static_name() -> str:
        return "azure"

    def _resolve_ip(
        self,
        network_client: Any,
        nic_id: str,
        vm_name: str,
    ) -> Optional[str]:
        try:
            rg = nic_id.split("/resourceGroups/")[1].split("/")[0]
            nic_name = nic_id.split("/networkInterfaces/")[1]
            nic = network_client.network_interfaces.get(rg, nic_name)
            return nic.ip_configurations[0].private_ip_address if nic.ip_configurations else None
        except Exception:
            logger.debug("[Azure] Could not resolve IP for VM '%s'.", vm_name)
            return None

    def _build_asset(self, vm: Any, network_client: Any) -> NormalisedAsset:
        private_ip: Optional[str] = None
        nics = vm.network_profile.network_interfaces if vm.network_profile else []
        if nics:
            private_ip = self._resolve_ip(network_client, nics[0].id, vm.name)

        return NormalisedAsset(
            hostname=vm.name,
            vendor="Azure",
            model=vm.hardware_profile.vm_size if vm.hardware_profile else "Unknown",
            serial=f"AZ-{vm.vm_id}" if hasattr(vm, "vm_id") and vm.vm_id else None,
            ip=private_ip,
            specs={
                "Location": vm.location,
                "ProvisioningState": vm.provisioning_state,
                "OS": (
                    str(vm.storage_profile.os_disk.os_type)
                    if vm.storage_profile and vm.storage_profile.os_disk
                    else "N/A"
                ),
            },
        )

    def discover(self) -> List[NormalisedAsset]:
        if not _AZURE_AVAILABLE:
            logger.warning("Azure SDK not installed. Skipping. Run: pip install azure-identity azure-mgmt-compute azure-mgmt-network")
            return []

        subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        if not subscription_id:
            logger.error("[Azure] AZURE_SUBSCRIPTION_ID not set. Skipping.")
            return []

        logger.info("[Azure] Scanning subscription: %s", subscription_id)
        assets: List[NormalisedAsset] = []

        try:
            credential = DefaultAzureCredential()
            compute_client = ComputeManagementClient(credential, subscription_id)
            network_client = NetworkManagementClient(credential, subscription_id)
            vms = list(compute_client.virtual_machines.list_all())
            logger.info("[Azure] Found %d VMs. Resolving NICs with %d workers...", len(vms), _AZURE_NIC_WORKERS)

            with ThreadPoolExecutor(max_workers=_AZURE_NIC_WORKERS) as pool:
                futures = {pool.submit(self._build_asset, vm, network_client): vm.name for vm in vms}
                for future in as_completed(futures):
                    try:
                        assets.append(future.result())
                    except Exception:
                        logger.exception("[Azure] Failed building asset for VM '%s'.", futures[future])

        except AzureError as e:
            raise ProviderAPIError(f"[Azure] SDK error: {e}") from e
        except Exception:
            logger.exception("[Azure] Unexpected error.")

        return assets


# ── Part 3c: GCP Provider ─────────────────────────────────────────────────────
try:
    from google.cloud import compute_v1
    from google.auth.exceptions import DefaultCredentialsError
    _GCP_AVAILABLE = True
except ImportError:
    _GCP_AVAILABLE = False


@register_provider
class GCPProvider(CloudProvider):
    """
    Discovers GCP Compute Engine instances across all zones in a project.

    Required env vars: GCP_PROJECT_ID
    Auth: GOOGLE_APPLICATION_CREDENTIALS (service account JSON path)
          or Application Default Credentials (gcloud auth)
    """

    @staticmethod
    def _static_name() -> str:
        return "gcp"

    def discover(self) -> List[NormalisedAsset]:
        if not _GCP_AVAILABLE:
            logger.warning("GCP SDK not installed. Skipping. Run: pip install google-cloud-compute")
            return []

        project_id = os.getenv("GCP_PROJECT_ID")
        if not project_id:
            logger.error("[GCP] GCP_PROJECT_ID not set. Skipping.")
            return []

        logger.info("[GCP] Scanning project: %s", project_id)
        assets: List[NormalisedAsset] = []

        try:
            instances_client = compute_v1.InstancesClient()
            request = compute_v1.AggregatedListInstancesRequest(project=project_id)

            for zone, response in instances_client.aggregated_list(request=request):
                for instance in response.instances or []:
                    # Extract primary internal IP
                    private_ip: Optional[str] = None
                    if instance.network_interfaces:
                        private_ip = instance.network_interfaces[0].network_i_p

                    assets.append(NormalisedAsset(
                        hostname=instance.name,
                        vendor="GCP",
                        model=instance.machine_type.split("/")[-1],
                        serial=f"GCP-{instance.id}" if instance.id else None,
                        ip=private_ip,
                        specs={
                            "Zone": zone,
                            "Status": instance.status,
                            "OS": (
                                instance.disks[0].licenses[0].split("/")[-1]
                                if instance.disks and instance.disks[0].licenses
                                else "N/A"
                            ),
                            "CreationTime": instance.creation_timestamp,
                        },
                    ))

            logger.info("[GCP] Found %d instances.", len(assets))

        except DefaultCredentialsError:
            raise ProviderAuthError("[GCP] No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or run 'gcloud auth application-default login'.") from None
        except Exception:
            logger.exception("[GCP] Unexpected error.")

        return assets


# ── Part 3d: DigitalOcean Provider ────────────────────────────────────────────
try:
    import pydo
    _DIGITALOCEAN_AVAILABLE = True
except ImportError:
    _DIGITALOCEAN_AVAILABLE = False


@register_provider
class DigitalOceanProvider(CloudProvider):
    """
    Discovers DigitalOcean Droplets.

    Required env vars: DIGITALOCEAN_TOKEN
    """

    @staticmethod
    def _static_name() -> str:
        return "digitalocean"

    def discover(self) -> List[NormalisedAsset]:
        if not _DIGITALOCEAN_AVAILABLE:
            logger.warning("pydo not installed. Skipping DigitalOcean. Run: pip install pydo")
            return []

        token = os.getenv("DIGITALOCEAN_TOKEN")
        if not token:
            logger.error("[DigitalOcean] DIGITALOCEAN_TOKEN not set. Skipping.")
            return []

        logger.info("[DigitalOcean] Starting Droplet discovery...")
        assets: List[NormalisedAsset] = []

        try:
            client = pydo.Client(token=token)
            page = 1

            while True:
                response = client.droplets.list(per_page=200, page=page)
                droplets = response.get("droplets", [])
                if not droplets:
                    break

                for droplet in droplets:
                    private_ip = next(
                        (n["ip_address"] for n in droplet.get("networks", {}).get("v4", [])
                         if n["type"] == "private"),
                        None,
                    )
                    assets.append(NormalisedAsset(
                        hostname=droplet["name"],
                        vendor="DigitalOcean",
                        model=droplet.get("size_slug", "Unknown"),
                        serial=f"DO-{droplet['id']}",
                        ip=private_ip,
                        specs={
                            "Region": droplet.get("region", {}).get("slug", "N/A"),
                            "Status": droplet.get("status", "N/A"),
                            "OS": droplet.get("image", {}).get("distribution", "N/A"),
                            "Memory": f"{droplet.get('memory', 0)} MB",
                            "vCPUs": droplet.get("vcpus", "N/A"),
                        },
                    ))
                page += 1

            logger.info("[DigitalOcean] Found %d Droplets.", len(assets))

        except Exception:
            logger.exception("[DigitalOcean] Unexpected error.")

        return assets


# ── Part 3e: Oracle Cloud (OCI) Provider ──────────────────────────────────────
try:
    import oci
    _OCI_AVAILABLE = True
except ImportError:
    _OCI_AVAILABLE = False


@register_provider
class OracleCloudProvider(CloudProvider):
    """
    Discovers Oracle Cloud Infrastructure (OCI) compute instances.

    Required env vars: OCI_COMPARTMENT_ID
    Auth: ~/.oci/config or OCI_CONFIG_FILE env var (standard OCI CLI config)
    """

    @staticmethod
    def _static_name() -> str:
        return "oracle"

    def discover(self) -> List[NormalisedAsset]:
        if not _OCI_AVAILABLE:
            logger.warning("OCI SDK not installed. Skipping Oracle Cloud. Run: pip install oci")
            return []

        compartment_id = os.getenv("OCI_COMPARTMENT_ID")
        if not compartment_id:
            logger.error("[Oracle] OCI_COMPARTMENT_ID not set. Skipping.")
            return []

        logger.info("[Oracle] Scanning compartment: %s", compartment_id)
        assets: List[NormalisedAsset] = []

        try:
            config = oci.config.from_file(os.getenv("OCI_CONFIG_FILE", "~/.oci/config"))
            compute_client = oci.core.ComputeClient(config)
            network_client = oci.core.VirtualNetworkClient(config)

            instances = oci.pagination.list_call_get_all_results(
                compute_client.list_instances, compartment_id
            ).data

            for instance in instances:
                if instance.lifecycle_state == "TERMINATED":
                    continue

                # Resolve primary VNIC private IP
                private_ip: Optional[str] = None
                try:
                    vnic_attachments = oci.pagination.list_call_get_all_results(
                        compute_client.list_vnic_attachments,
                        compartment_id,
                        instance_id=instance.id,
                    ).data
                    if vnic_attachments:
                        vnic = network_client.get_vnic(vnic_attachments[0].vnic_id).data
                        private_ip = vnic.private_ip
                except Exception:
                    logger.debug("[Oracle] Could not resolve IP for instance '%s'.", instance.display_name)

                assets.append(NormalisedAsset(
                    hostname=instance.display_name,
                    vendor="Oracle Cloud",
                    model=instance.shape,
                    serial=f"OCI-{instance.id}",
                    ip=private_ip,
                    specs={
                        "Region": instance.region,
                        "State": instance.lifecycle_state,
                        "AvailabilityDomain": instance.availability_domain,
                        "TimeCreated": str(instance.time_created),
                    },
                ))

            logger.info("[Oracle] Found %d instances.", len(assets))

        except oci.exceptions.ConfigFileNotFound:
            raise ProviderAuthError("[Oracle] OCI config file not found. Configure ~/.oci/config or set OCI_CONFIG_FILE.") from None
        except Exception:
            logger.exception("[Oracle] Unexpected error.")

        return assets


# ── Part 3f: Alibaba Cloud Provider ──────────────────────────────────────────
try:
    from aliyunsdkcore.client import AcsClient
    from aliyunsdkecs.request.v20140526.DescribeInstancesRequest import DescribeInstancesRequest
    _ALIBABA_AVAILABLE = True
except ImportError:
    _ALIBABA_AVAILABLE = False


@register_provider
class AlibabaCloudProvider(CloudProvider):
    """
    Discovers Alibaba Cloud ECS instances.

    Required env vars:
      ALIBABA_ACCESS_KEY_ID, ALIBABA_ACCESS_KEY_SECRET
      ALIBABA_REGION_IDS   — comma-separated region IDs (default: cn-hangzhou)
    """

    @staticmethod
    def _static_name() -> str:
        return "alibaba"

    def discover(self) -> List[NormalisedAsset]:
        if not _ALIBABA_AVAILABLE:
            logger.warning("Alibaba SDK not installed. Skipping. Run: pip install aliyun-python-sdk-ecs")
            return []

        access_key_id = os.getenv("ALIBABA_ACCESS_KEY_ID")
        access_key_secret = os.getenv("ALIBABA_ACCESS_KEY_SECRET")
        regions_raw = os.getenv("ALIBABA_REGION_IDS", "cn-hangzhou")

        if not access_key_id or not access_key_secret:
            logger.error("[Alibaba] ALIBABA_ACCESS_KEY_ID / ALIBABA_ACCESS_KEY_SECRET not set. Skipping.")
            return []

        regions = [r.strip() for r in regions_raw.split(",")]
        logger.info("[Alibaba] Scanning regions: %s", regions)
        assets: List[NormalisedAsset] = []

        for region in regions:
            try:
                client = AcsClient(access_key_id, access_key_secret, region)
                page = 1

                while True:
                    request = DescribeInstancesRequest()
                    request.set_PageSize(100)
                    request.set_PageNumber(page)
                    response = json.loads(client.do_action_with_exception(request))

                    instances = response.get("Instances", {}).get("Instance", [])
                    if not instances:
                        break

                    for inst in instances:
                        private_ip = (
                            inst.get("InnerIpAddress", {}).get("IpAddress", [None])[0]
                        )
                        assets.append(NormalisedAsset(
                            hostname=inst.get("InstanceName", inst["InstanceId"]),
                            vendor="Alibaba Cloud",
                            model=inst.get("InstanceType", "Unknown"),
                            serial=f"ALI-{inst['InstanceId']}",
                            ip=private_ip,
                            specs={
                                "Region": region,
                                "Status": inst.get("Status", "N/A"),
                                "OS": inst.get("OSName", "N/A"),
                                "CPU": inst.get("Cpu", "N/A"),
                                "Memory": f"{inst.get('Memory', 0)} MB",
                                "CreatedAt": inst.get("CreationTime", "N/A"),
                            },
                        ))
                    page += 1

                logger.info("[Alibaba] Found %d instances in %s.", len(assets), region)

            except Exception:
                logger.exception("[Alibaba] Error scanning region '%s'.", region)

        return assets


# ── Part 3g: Generic JSON Provider ────────────────────────────────────────────
@register_provider
class GenericProvider(CloudProvider):
    """
    Accepts pre-formatted JSON from any cloud CLI or custom script.
    Useful for GCP via gcloud CLI, custom on-prem inventories, etc.

    JSON format (file or STDIN):
      [
        {
          "hostname": "my-server",      (required)
          "vendor":   "MyCloud",        (required)
          "model":    "m1.large",       (optional)
          "serial":   "SN-12345",       (optional)
          "ip":       "10.0.0.1",       (optional)
          "specs":    { ... }           (optional)
        }
      ]
    """

    REQUIRED_FIELDS = {"hostname", "vendor"}

    def __init__(self, input_file: Optional[str] = None) -> None:
        if not input_file:
            raise ValueError(
                "GenericProvider requires --file <path> or --stdin."
            )
        self.input_file = input_file

    @staticmethod
    def _static_name() -> str:
        return "generic"

    def _validate(self, item: Any, index: int) -> bool:
        if not isinstance(item, dict):
            logger.warning("[Generic] Item #%d is not a dict — skipping.", index)
            return False
        missing = self.REQUIRED_FIELDS - item.keys()
        if missing:
            logger.warning("[Generic] Item #%d missing fields %s — skipping.", index, missing)
            return False
        return True

    def discover(self) -> List[NormalisedAsset]:
        logger.info("[Generic] Starting discovery from '%s'...", self.input_file)
        raw_data: Any = None
        try:
            if self.input_file == "-":
                raw_data = json.loads(sys.stdin.read())
            else:
                with open(self.input_file, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error("[Generic] Invalid JSON: %s", e)
            return []
        except OSError as e:
            logger.error("[Generic] Cannot open '%s': %s", self.input_file, e)
            return []
        except Exception:
            logger.exception("[Generic] Unexpected read error.")
            return []

        if isinstance(raw_data, dict):
            raw_data = [raw_data]
        if not isinstance(raw_data, list):
            logger.error("[Generic] JSON must be an object or array.")
            return []

        assets: List[NormalisedAsset] = []
        for i, item in enumerate(raw_data):
            if not self._validate(item, i):
                continue
            assets.append(NormalisedAsset(
                hostname=item["hostname"],
                vendor=item["vendor"],
                model=item.get("model", "Generic Instance"),
                serial=item.get("serial"),
                ip=item.get("ip"),
                specs=item.get("specs", {}),
                type=item.get("type", "Cloud Instance"),
            ))

        logger.info("[Generic] Loaded %d valid assets.", len(assets))
        return assets


# ── Part 4: Backend Communication ─────────────────────────────────────────────
def _get_auth_headers(config: AgentConfig) -> Dict[str, str]:
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
    
    body = json.dumps(metrics.to_dict(config.agent_id))
    headers = _get_auth_headers(config)
    headers["Content-Length"] = str(len(body.encode("utf-8")))
    
    ssl_context = config.make_ssl_context()
    if config.ssl_verify:
        conn = http.client.HTTPSConnection(
            config.backend_host,
            timeout=config.timeout_sec,
            context=ssl_context
        )
    else:
        conn = http.client.HTTPConnection(
            config.backend_host,
            timeout=config.timeout_sec
        )

    try:
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


def _build_payload(asset: NormalisedAsset, config: AgentConfig) -> Dict[str, Any]:
    """Convert a NormalisedAsset into the backend DiscoveryPayload schema."""
    return {
        "agent_id": config.agent_id,
        "location_id": config.location_id,
        "hostname": asset.hostname,
        "ip_address": asset.ip,
        "hardware": {
            "cpu": "Cloud vCPU",
            "ram_mb": 0,
            "serial": asset.serial,  # None if unknown — no fake UUID
            "model": asset.model,
            "vendor": asset.vendor,
            "type": asset.type,
        },
        "os": {
            "name": asset.specs.get("OS", "Cloud OS"),
            "version": "Cloud-Native",
            "uptime_sec": 0,
        },
        "software": [],
        "metadata": {
            "cloud_provider": asset.vendor,
            "cloud_specs": asset.specs,
            "collector_version": "3.1.0-enhanced",
            "sync_time": datetime.now(timezone.utc).isoformat(),
        },
    }


def check_backend_health(config: AgentConfig) -> bool:
    """Verify backend is accessible before starting discovery."""
    logger.info("Checking backend health...")
    
    if config.ssl_verify:
        conn = http.client.HTTPSConnection(
            config.backend_host,
            timeout=5,
            context=ssl_context
        )
    else:
        conn = http.client.HTTPConnection(
            config.backend_host,
            timeout=5
        )

    try:
        headers = {"X-Agent-Key": config.agent_secret}
        conn.request("GET", "/health", headers=headers)
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
    asset: NormalisedAsset,
    config: AgentConfig,
    rate_limiter: RateLimiter,
    metrics: DiscoveryMetrics,
    dry_run: bool = False
) -> bool:
    """
    POST a NormalisedAsset to the backend over HTTPS with retry logic.
    Returns True on success (or dry-run), False on failure.
    """
    label = f"{asset.vendor} '{asset.hostname}'"

    if dry_run:
        logger.info("[DRY-RUN] Would send:\n%s", json.dumps(_build_payload(asset, config), indent=2))
        return True

    # Apply rate limiting
    rate_limiter.acquire()

    body = json.dumps(_build_payload(asset, config))
    headers = _get_auth_headers(config)
    headers["Content-Length"] = str(len(body.encode("utf-8")))

    ssl_context = config.make_ssl_context()

    for attempt in range(1, config.max_retries + 1):
        if config.ssl_verify:
            conn = http.client.HTTPSConnection(
                config.backend_host,
                timeout=config.timeout_sec,
                context=ssl_context
            )
        else:
            conn = http.client.HTTPConnection(
                config.backend_host,
                timeout=config.timeout_sec
            )

        try:
            conn.request("POST", "/api/v1/collect", body=body, headers=headers)
            response = conn.getresponse()
            resp_body = response.read().decode("utf-8", errors="replace")
            
            if response.status == 200:
                logger.info("Synced %s.", label)
                return True
            elif response.status in (400, 422):
                logger.error("Backend rejected %s (HTTP %d): %s", label, response.status, resp_body)
                metrics.sync_errors_by_status[response.status] += 1
                return False
            else:
                logger.warning(
                    "Attempt %d/%d — status %d for %s: %s",
                    attempt, config.max_retries, response.status, label, resp_body,
                )
                metrics.sync_errors_by_status[response.status] += 1

        except (http.client.HTTPException, OSError, TimeoutError) as e:
            logger.warning("Attempt %d/%d — connection error for %s: %s", attempt, config.max_retries, label, e)
        except Exception:
            logger.exception("Unexpected error sending %s.", label)
            return False
        finally:
            if conn:
                conn.close()

        if attempt < config.max_retries:
            time.sleep(config.retry_delay)

    logger.error("All %d attempts failed for %s.", config.max_retries, label)
    return False


# ── Part 5: Parallel Discovery ───────────────────────────────────────────────
def run_provider_discovery(
    provider: CloudProvider,
    metrics: DiscoveryMetrics,
    shutdown: GracefulShutdown
) -> List[NormalisedAsset]:
    """Run discovery for a single provider with timing and error handling."""
    if shutdown.should_continue():
        logger.info(f"[{provider.name}] Starting discovery...")
        start_time = time.time()
        
        try:
            assets = provider.discover()
            duration = time.time() - start_time
            
            metrics.discovery_time_by_provider[provider.name] = duration
            metrics.providers_succeeded += 1
            
            logger.info(f"[{provider.name}] Discovered {len(assets)} assets in {duration:.2f}s")
            return assets
            
        except (ProviderAuthError, ProviderAPIError) as e:
            logger.error(f"[{provider.name}] Provider error: {e}")
            metrics.providers_failed += 1
            return []
        except Exception:
            logger.exception(f"[{provider.name}] Unexpected error during discovery")
            metrics.providers_failed += 1
            return []
    return []


def discover_all_providers_parallel(
    providers: List[CloudProvider],
    config: AgentConfig,
    metrics: DiscoveryMetrics,
    shutdown: GracefulShutdown
) -> Dict[str, List[NormalisedAsset]]:
    """Run multiple providers in parallel for faster discovery."""
    results: Dict[str, List[NormalisedAsset]] = {}
    
    metrics.providers_attempted = len(providers)
    
    with ThreadPoolExecutor(max_workers=config.max_provider_workers) as executor:
        future_to_provider = {
            executor.submit(run_provider_discovery, provider, metrics, shutdown): provider.name
            for provider in providers
        }
        
        for future in as_completed(future_to_provider):
            provider_name = future_to_provider[future]
            try:
                assets = future.result()
                results[provider_name] = assets
                metrics.assets_discovered += len(assets)
            except Exception:
                logger.exception(f"Provider '{provider_name}' failed unexpectedly")
                results[provider_name] = []
    
    return results


# ── Part 6: Main Entry Point ─────────────────────────────────────────────────
def main() -> None:
    available = ", ".join(get_registered_providers())

    parser = argparse.ArgumentParser(
        description="Universal Multi-Cloud Discovery Agent (Enhanced)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"Available providers: {available}",
    )
    parser.add_argument(
        "--providers",
        help=f"Comma-separated provider names to run (default: all). Available: {available}",
    )
    parser.add_argument("--file", help="JSON file path for the 'generic' provider")
    parser.add_argument("--stdin", action="store_true", help="Read JSON from STDIN (generic provider)")
    parser.add_argument("--regions", help="Override AWS regions (comma-separated)")
    parser.add_argument("--dry-run", action="store_true", help="Print payloads without sending")
    parser.add_argument("--list-providers", action="store_true", help="List all registered providers and exit")
    parser.add_argument("--skip-health-check", action="store_true", help="Skip backend health check")
    args = parser.parse_args()

    if args.list_providers:
        print("Registered providers:")
        for name in get_registered_providers():
            print(f"  {name}")
        sys.exit(0)

    # Initialize configuration
    try:
        config = AgentConfig.from_env(dry_run=args.dry_run)
        config.validate()
    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e}")
        sys.exit(1)

    # Initialize support systems
    metrics = DiscoveryMetrics()
    shutdown = GracefulShutdown()
    rate_limiter = RateLimiter(
        max_requests=config.max_requests_per_minute,
        time_window=60.0
    )

    logger.info(
        "Universal Cloud Discovery Agent starting at %s%s",
        datetime.now(timezone.utc).isoformat(),
        " [DRY-RUN]" if args.dry_run else "",
    )
    logger.info(f"Configuration: {config.max_provider_workers} provider workers, "
                f"{config.max_asset_workers} asset workers, "
                f"{config.max_requests_per_minute} req/min rate limit")

    # Health check
    if not args.dry_run and not args.skip_health_check:
        if not check_backend_health(config):
            logger.warning("Backend health check failed, continuing anyway...")

    # ── Build provider list ───────────────────────────────────────────────────
    extra_kwargs: Dict[str, Dict[str, Any]] = {}

    if args.file:
        provider_names = ["generic"]
        extra_kwargs["generic"] = {"input_file": args.file}
    elif args.stdin:
        provider_names = ["generic"]
        extra_kwargs["generic"] = {"input_file": "-"}
    else:
        if args.providers:
            provider_names = [p.strip() for p in args.providers.split(",")]
        else:
            env_providers = os.getenv("ENABLED_PROVIDERS", "")
            provider_names = (
                [p.strip() for p in env_providers.split(",")]
                if env_providers else list(_PROVIDER_REGISTRY.keys())
            )
        # Exclude generic from auto-run (needs explicit --file/--stdin)
        provider_names = [p for p in provider_names if p != "generic"]

        if args.regions:
            extra_kwargs["aws"] = {"regions": [r.strip() for r in args.regions.split(",")]}

    providers = build_providers(provider_names, extra_kwargs)
    if not providers:
        logger.error("No valid providers could be initialised. Exiting.")
        sys.exit(1)

    # ── Parallel Discovery ────────────────────────────────────────────────────
    logger.info(f"Running {len(providers)} providers in parallel...")
    
    all_assets_by_provider = discover_all_providers_parallel(
        providers, config, metrics, shutdown
    )

    # Flatten and validate assets
    all_assets: List[NormalisedAsset] = []
    for provider_name, assets in all_assets_by_provider.items():
        for asset in assets:
            if asset.validate():
                all_assets.append(asset)
                metrics.assets_valid += 1
            else:
                metrics.assets_invalid += 1

    if not all_assets:
        logger.info("=" * 60)
        logger.info("Provider discovery successful, but no running assets were found.")
        logger.info("Verification: AWS credentials and permissions are valid.")
        logger.info("=" * 60)
        metrics.log_summary()
        if not args.dry_run:
            report_metrics(config, metrics)
        sys.exit(0)

    logger.info(f"Total valid assets to sync: {len(all_assets)}")

    # ── Parallel Asset Sync with Progress Tracking ───────────────────────────
    progress = ProgressTracker(len(all_assets), "Syncing assets")

    def sync_asset(asset: NormalisedAsset) -> bool:
        """Wrapper for syncing with progress tracking."""
        if not shutdown.should_continue():
            return False
        
        result = send_to_backend(asset, config, rate_limiter, metrics, dry_run=args.dry_run)
        progress.update()
        return result

    logger.info(f"Syncing assets with {config.max_asset_workers} workers...")
    
    with ThreadPoolExecutor(max_workers=config.max_asset_workers) as executor:
        futures = [executor.submit(sync_asset, asset) for asset in all_assets]
        
        for future in as_completed(futures):
            if not shutdown.should_continue():
                logger.warning("Shutdown requested, cancelling remaining syncs...")
                break
            
            try:
                if future.result():
                    metrics.assets_synced += 1
                else:
                    metrics.assets_failed += 1
            except Exception:
                logger.exception("Unexpected error in asset sync")
                metrics.assets_failed += 1

    # ── Summary & Metrics ────────────────────────────────────────────────────
    metrics.log_summary()

    if not args.dry_run:
        report_metrics(config, metrics)

    if shutdown.shutdown_requested:
        logger.warning("Discovery interrupted by shutdown signal")
        sys.exit(130)  # 128 + SIGINT

    if metrics.assets_failed > 0:
        logger.warning(f"{metrics.assets_failed} assets failed to sync")
        sys.exit(1)

    logger.info("Discovery completed successfully!")
    sys.exit(0)


if __name__ == "__main__":
    main()