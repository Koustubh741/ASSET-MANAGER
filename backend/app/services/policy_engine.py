"""
BYOD Policy Engine - evaluates device compliance against security policies.
"""
import os
import re
from typing import Dict, Any, List, Optional
from pathlib import Path


def _load_policies() -> Dict[str, Any]:
    """Load policy config from YAML. Falls back to defaults if file missing."""
    try:
        import yaml
        config_path = Path(__file__).resolve().parent.parent.parent / "config" / "byod_policies.yaml"
        if config_path.exists():
            with open(config_path, "r") as f:
                return yaml.safe_load(f) or {}
    except Exception:
        pass
    return {
        "compliance_checks": {
            "encryption": {"required": True, "remediation": "Enable full-disk encryption"},
            "password_policy": {"required": True, "remediation": "Set screen lock"},
            "os_version": {"required": True, "remediation": "Upgrade OS"},
            "security_patch_level": {"required": True, "remediation": "Install updates"},
            "remote_wipe": {"required": True, "remediation": "Accept MDM profile"},
            "unauthorized_apps": {"required": False, "remediation": "Remove flagged apps"},
        },
        "os_minimums": {"windows": "10.0", "macos": "13.0", "ios": "16.0", "android": "12"},
    }


def _detect_platform(os_version: str, device_model: str) -> str:
    """Detect platform from os_version or device_model."""
    if not os_version:
        return "unknown"
    v = (os_version or "").lower()
    m = (device_model or "").lower()
    if "win" in v or "windows" in v or "win" in m:
        return "windows"
    if "mac" in v or "macos" in v or "os x" in v or "mac" in m:
        return "macos"
    if "ios" in v or "iphone" in m or "ipad" in m:
        return "ios"
    if "android" in v or "android" in m:
        return "android"
    return "unknown"


def _parse_version(ver_str: str) -> tuple:
    """Parse version string to tuple for comparison. Extracts first version pattern (e.g. 14, 10.0.19045) from strings like 'macOS 14', 'Windows 10'."""
    if not ver_str:
        return (0, 0, 0)
    s = str(ver_str).strip()
    match = re.search(r"(\d+(?:\.\d+)*)", s)
    if match:
        s = match.group(1)
    parts = []
    for p in s.replace("-", ".").split("."):
        try:
            parts.append(int(p))
        except ValueError:
            parts.append(0)
    return tuple(parts[:4]) if len(parts) >= 4 else tuple(parts + [0] * (4 - len(parts)))


def evaluate_compliance(
    device_model: str,
    os_version: str,
    force_compliant: bool = False,
) -> Dict[str, Any]:
    """
    Evaluate device against security policies.

    Args:
        device_model: Device model string (e.g. "MacBook Pro", "Dell XPS")
        os_version: OS version string (e.g. "macOS 14", "Windows 11")
        force_compliant: If True, return all checks as passed (for testing)

    Returns:
        Dict with compliance_checks, all_compliant, remediation_steps
    """
    policies = _load_policies()
    checks_config = policies.get("compliance_checks", {})
    platform = _detect_platform(os_version, device_model)

    compliance_checks: Dict[str, bool] = {}
    remediation_steps: List[str] = []

    if force_compliant:
        for name in checks_config:
            compliance_checks[name] = True
        return {
            "compliance_checks": compliance_checks,
            "all_compliant": True,
            "remediation_steps": [],
            "platform": platform,
        }

    # Simulate check results (in production, integrate with MDM API)
    # Default: pass encryption, password, remote_wipe; pass os/patches if we can parse
    for name, cfg in checks_config.items():
        required = cfg.get("required", True)
        remediation = cfg.get("remediation", "")
        passed = True

        if name == "unauthorized_apps":
            # Optional check - simulate pass for now
            passed = True
        elif name == "os_version" and platform != "unknown":
            os_mins = policies.get("os_minimums", {})
            min_ver = os_mins.get(platform, "0")
            try:
                dev_ver = _parse_version(os_version or "0")
                min_ver_t = _parse_version(min_ver)
                passed = dev_ver >= min_ver_t
            except Exception:
                passed = True
        elif name == "security_patch_level":
            passed = True  # Would check patch date from MDM

        compliance_checks[name] = passed
        if not passed and required and remediation:
            remediation_steps.append(remediation)

    required_checks = [k for k, c in checks_config.items() if c.get("required", True)]
    all_compliant = all(compliance_checks.get(k, False) for k in required_checks)

    return {
        "compliance_checks": compliance_checks,
        "all_compliant": all_compliant,
        "remediation_steps": remediation_steps,
        "platform": platform,
    }
