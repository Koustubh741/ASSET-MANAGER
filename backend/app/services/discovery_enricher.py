from typing import List, Tuple, Optional, Dict, Any
import logging
import re

logger = logging.getLogger(__name__)

# First match wins — order from most-specific to least-specific
VENDOR_PATTERNS: List[Tuple[List[str], str]] = [
    (["cisco"],                              "Cisco"),
    (["juniper"],                            "Juniper"),
    (["aruba"],                              "Aruba"),
    (["hp", "hewlett-packard", "hpe", "procurve"], "HP"),
    (["ubiquiti", "unifi", "uap"],           "Ubiquiti"),
    (["mikrotik", "routeros"],               "MikroTik"),
    (["palo alto", "panos"],                 "Palo Alto"),
    (["fortinet", "fortigate"],              "Fortinet"),
    (["checkpoint", "check point"],          "Check Point"),
    (["sonicwall"],                          "SonicWall"),
    (["watchguard"],                         "WatchGuard"),
    (["sophos"],                             "Sophos"),
    (["dell"],                               "Dell Inc."),
    (["brother"],                            "Brother"),
    (["canon"],                              "Canon"),
    (["epson"],                              "Epson"),
    (["xerox"],                              "Xerox"),
    (["vmware", "esxi"],                     "VMware"),
    (["apple", "macintosh"],                  "Apple"),
    (["microsoft", "surface"],               "Microsoft"),
    (["lenovo"],                             "Lenovo"),
    (["ricoh"],                              "Ricoh"),
    (["kyocera"],                            "Kyocera"),
    (["konica", "minolta"],                  "Konica Minolta"),
    (["netgear", "readynas"],                "Netgear"),
    (["synology"],                           "Synology"),
    (["qnap"],                               "QNAP"),
]

TYPE_PATTERNS: List[Tuple[List[str], str]] = [
    (["firewall", "asa", "sonicwall", "watchguard",
      "palo alto", "security appliance", "checkpoint",
      "fortigate"],                           "Firewall"),
    (["printer", "laserjet", "designjet",
      "officejet", "deskjet", "pagewide",
      "jetdirect", "multi-environment",
      "copier", "mfp", "imagerunner"],        "Printer"),
    (["switch", "catalyst", "edgeos",
      "procurve", "powerconnect"],            "Switch"),
    (["router", "gateway", "routeros"],       "Router"),
    (["ap", "access point", "wireless",
      "wifi", "wlan", "unifi"],               "Access Point"),
    (["server", "esxi", "linux",
      "windows server", "vmware", "proliant", "poweredge"], "Server"),
    (["laptop", "notebook", "thinkpad", "macbook", "latitude"], "Laptop"),
    (["ups", "apc", "smart-ups", "eaton", "cyberpower"],      "UPS"),
    (["camera", "hikvision", "axis", "dahua"],                "IP Camera"),
    (["phone", "voip", "polycom", "yealink", "avaya"],        "IP Phone"),
]

SERIAL_PREFIXES: Dict[str, str] = {
    "FG": "Fortinet",
    "FGT": "Fortinet",
    "CP": "Check Point",
    "PA": "Palo Alto",
    "CN": "Cisco",
    "FMX": "Dell Inc.",
    "CSB": "Dell Inc.",
    "BTH": "Brother",
    "S2": "Microsoft",
    "PF": "Lenovo",
}

class DiscoveryEnricher:
    """
    Centralized logic to normalize and enrich asset data collected from any source.
    """

    @staticmethod
    def sanitize_value(value: Any) -> str:
        """Centralized helper to decode and clean any discovery value (SNMP, WMI, etc)."""
        if not value:
            return ""
        val_str = str(value)
        # Check if it's a hex string (common for sysDescr on some devices)
        if val_str.startswith("0x"):
            try:
                # Remove 0x and decode
                hex_content = val_str[2:]
                return bytes.fromhex(hex_content).decode("utf-8", errors="ignore").strip()
            except (ValueError, TypeError):
                pass
        return val_str.strip()

    @staticmethod
    def detect_model(description: str, current_model: Optional[str] = None) -> str:
        """Extract a more specific model number from a raw description."""
        if not description:
            return current_model or "Unknown Model"
            
        m = (current_model or "Unknown Model")
        # If model is generic or missing, try extracting from description
        if m in ("Unknown Model", "Network Node", "Standard Device"):
            # Matches patterns like CAT9K, C2960, FG100E, CP-8841-K9, etc.
            # We strip common symbols like () or , from parts before checking
            parts = [p.strip("(),") for p in description.split()]
            candidates = []
            for p in parts:
                if re.search(r'\b[A-Z]{1,4}-?[0-9][A-Z0-9_-]{2,}\b', p): # Require at least 2 chars after digit
                    candidates.append(p)
                elif re.search(r'\b[A-Z]{2,}\d{3,}\b', p): # Or classic pattern C2960
                    candidates.append(p)
            
            if candidates:
                # Favor the longest candidate (usually more specific)
                return max(candidates, key=len)
                    
        return m

    def fully_enrich_hardware(self, hardware: Any, metadata: Dict[str, Any]) -> None:
        """
        Universal enrichment pipeline: Sanitize -> Detect Vendor -> Detect Type -> Detect Model.
        Modifies hardware object in-place.
        """
        # 1. Sanitize the main description from metadata or hardware
        raw_desc = metadata.get("snmp_description") or metadata.get("description") or ""
        clean_desc = self.sanitize_value(raw_desc)
        
        # Update metadata if we found something cleaner
        if raw_desc != clean_desc:
            if metadata.get("snmp_description"): 
                metadata["snmp_description"] = clean_desc
            else: 
                metadata["description"] = clean_desc

        # 2. Enrich Vendor
        if not hardware.vendor or hardware.vendor == "Unknown":
            hardware.vendor = self.detect_vendor(clean_desc, hardware.serial, hardware.model)
        
        # 3. Enrich Type
        hardware.type = self.detect_type(clean_desc, hardware.model, hardware.vendor, default=hardware.type or "Desktop")
        
        # 4. Enrich Model
        hardware.model = self.detect_model(clean_desc, hardware.model)
        
        # 5. Normalize Vendor Name
        hardware.vendor = self.normalize_vendor(hardware.vendor)

    @staticmethod
    def detect_vendor(description: str, serial: Optional[str] = None, model: Optional[str] = None) -> str:
        d = (description or "").lower()
        m = (model or "").lower()
        
        # 1. Try description-based matching
        for keywords, vendor in VENDOR_PATTERNS:
            if any(kw in d for kw in keywords) or any(kw in m for kw in keywords):
                return vendor
        
        # 2. Try serial number prefix-based matching
        if serial:
            s = serial.upper()
            for prefix, vendor in SERIAL_PREFIXES.items():
                if s.startswith(prefix):
                    return vendor
            
        return "Unknown"

    @staticmethod
    def detect_type(description: str, model: Optional[str] = None, vendor: Optional[str] = None, default: str = "Desktop") -> str:
        d = (description or "").lower()
        m = (model or "").lower()
        v = (vendor or "").lower()
        
        # Priority mapping for specific networking gear
        if any(kw in d for kw in ["fortigate", "firewall", "checkpoint", "sonicwall"]) or "fortinet" in v:
            return "Firewall"
        if any(kw in d for kw in ["catalyst", "nexus", "procurve", "edgeos"]) or "cisco" in v:
            return "Switch"
        if any(kw in d for kw in ["ap-", "unifi", "aircap", "access point"]) or "ubiquiti" in v:
            return "Access Point"

        # HP printers advertise with 'JETDIRECT' or 'ETHERNET MULTI-ENVIRONMENT' in sysDescr
        if "hp" in v and any(kw in d for kw in ["jetdirect", "multi-environment", "laserjet", "officejet", "deskjet", "pagewide"]):
            return "Printer"

        for keywords, dtype in TYPE_PATTERNS:
            if any(kw in d for kw in keywords) or any(kw in m for kw in keywords):
                return dtype
        return default

    @staticmethod
    def normalize_vendor(vendor: Optional[str]) -> str:
        """Clean up messy vendor names from various discovery tools."""
        if not vendor or vendor.lower() in ("unknown", "n/a", ""):
            return "Unknown"
            
        v = vendor.lower()
        if "vmware" in v: return "VMware"
        if "dell" in v: return "Dell Inc."
        if "cisco" in v: return "Cisco"
        if "hewlett-packard" in v or "hpe" in v or "hp " in v: return "HP"
        if "apple" in v: return "Apple"
        if "microsoft" in v: return "Microsoft"
        if "fortinet" in v: return "Fortinet"
        if "lenovo" in v: return "Lenovo"
        
        return vendor # Return original if no rule matches

    @staticmethod
    def standardize_specs(specs: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure consistent keys for common specifications."""
        mapped = {}
        for k, v in specs.items():
            # Key normalization
            clean_k = k.strip()
            # Canonicalize keys
            k_lower = clean_k.lower()
            if k_lower in ("cpu", "processor_name", "proc", "processor"): clean_k = "Processor"
            elif k_lower in ("ram", "memory", "mem", "total ram"): clean_k = "RAM"
            elif k_lower in ("os", "os_name", "operating_system"): clean_k = "OS"
            elif k_lower in ("sn", "serial", "serial_no", "serial number"): clean_k = "Serial Number"
            elif k_lower in ("storage", "disk", "disk_size"): clean_k = "Storage"
            elif k_lower in ("model", "product_name"): clean_k = "Model"
            elif k_lower in ("vendor", "manufacturer"): clean_k = "OEM Name"
            elif k_lower in ("ip", "ip_address", "management_ip", "management ip"): clean_k = "IP Address"
            
            mapped[clean_k] = v
        return mapped

    @staticmethod
    def clean_specs(specs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Root Fix: Remove placeholder/noise values from the specs dict and
        format SNMP uptime timeticks into a human-readable string.

        Placeholder rules:
        - "Agent ID"  → drop if zeroed UUID (all zeros)
        - "AD User"   → drop if "Unknown"
        - "AD Domain" → drop if "LOCAL"
        - Any value   → drop if None or empty string

        Uptime rule:
        - If "Uptime" is a pure digit string > 4 chars, treat it as SNMP
          hundredths-of-a-second timeticks and convert to e.g. "17d 12h 5m".
        """
        ZEROED_UUID = "00000000-0000-0000-0000-000000000000"
        PLACEHOLDER_MAP = {
            "Agent ID":  {ZEROED_UUID},
            "AD User":   {"Unknown", "unknown"},
            "AD Domain": {"LOCAL", "local"},
        }

        cleaned: Dict[str, Any] = {}
        for k, v in specs.items():
            # Drop None / empty
            if v is None or v == "":
                continue

            str_v = str(v).strip()

            # Drop known placeholder values
            banned = PLACEHOLDER_MAP.get(k)
            if banned and str_v in banned:
                continue

            # Uptime: convert SNMP timeticks (1/100 s) to human-readable
            if k == "Uptime" and str_v.isdigit() and len(str_v) > 4:
                total_sec = int(str_v) // 100
                days, rem = divmod(total_sec, 86400)
                hours, rem = divmod(rem, 3600)
                minutes, _ = divmod(rem, 60)
                parts: list[str] = []
                if days:
                    parts.append(f"{days}d")
                if hours:
                    parts.append(f"{hours}h")
                if minutes or not parts:
                    parts.append(f"{minutes}m")
                cleaned[k] = " ".join(parts)
                continue

            cleaned[k] = v
        return cleaned

    @staticmethod
    def merge_specs(existing: Optional[Dict[str, Any]], incoming: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge specs without losing existing data. 
        Higher priority to non-empty incoming data.
        """
        if not existing:
            return incoming
            
        merged = dict(existing)
        for k, v in incoming.items():
            # If incoming value is useful, update it
            if v and v not in ("N/A", "Unknown", "0 GB", 0):
                merged[k] = v
            # If existing key is missing or placeholder, use incoming
            elif k not in merged or merged[k] in (None, "", "N/A", "Unknown"):
                merged[k] = v
                
        return merged

discovery_enricher = DiscoveryEnricher()
