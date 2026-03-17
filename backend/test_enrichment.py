from backend.app.services.discovery_enricher import discovery_enricher
import logging

logging.basicConfig(level=logging.INFO)

def test_enrichment():
    print("=== Testing DiscoveryEnricher ===")
    
    # 1. Test Vendor Normalization
    print("\n1. Testing Vendor Normalization:")
    test_vendors = [
        "VMware, Inc.",
        "Dell Inc.",
        "Hewlett-Packard",
        "HPE",
        "Fortinet Technologies",
        "Apple Inc.",
        "Unknown",
        "",
        None
    ]
    for v in test_vendors:
        norm = discovery_enricher.normalize_vendor(v)
        print(f"  '{v}' -> '{norm}'")

    # 2. Test Vendor Detection (Description-based)
    print("\n2. Testing Vendor Detection (Description):")
    test_desc = [
        "Cisco Adaptive Security Appliance",
        "Juniper Networks Operating System",
        "Ubiquiti Networks UniFi AP",
        "RouterOS v7.1",
        "FortiGate-200F v7.2.4"
    ]
    for d in test_desc:
        det = discovery_enricher.detect_vendor(d)
        print(f"  '{d}' -> '{det}'")

    # 3. Test Vendor Detection (Serial-based)
    print("\n3. Testing Vendor Detection (Serial Prefix):")
    test_serials = [
        ("Unknown", "FG200FT923905733"), # Fortinet
        ("Generic", "FMXTN24"),         # Dell
        ("Cisco-like", "CN0123456"),      # Cisco (prefix-based detection might be weak, but testing)
        ("Lenovo-like", "PF12345"),       # Lenovo
    ]
    for desc, serial in test_serials:
        det = discovery_enricher.detect_vendor(desc, serial=serial)
        print(f"  Serial '{serial}' -> Vendor '{det}'")

    # 4. Test Type Detection
    print("\n4. Testing Type Detection:")
    test_types = [
        ("FortiGate-200F", None),        # Firewall
        ("HP LaserJet Pro", None),      # Printer
        ("Cisco Catalyst 2960", None),   # Switch
        ("ProLiant DL380 Gen10", None), # Server
        ("ThinkPad X1 Carbon", None),   # Laptop
    ]
    for desc, model in test_types:
        det = discovery_enricher.detect_type(desc, model=model)
        print(f"  '{desc}' -> '{det}'")

    # 5. Test Spec Standardization
    print("\n5. Testing Spec Standardization:")
    raw_specs = {
        "cpu": "Intel i9",
        "RAM": "32GB",
        "os_name": "Windows 11",
        "serial_no": "XYZ123",
        "Custom Field": "Val",
        "total ram": "16GB"
    }
    standardized = discovery_enricher.standardize_specs(raw_specs)
    print(f"  Raw: {raw_specs}")
    print(f"  Standardized: {standardized}")

    # 6. Test Spec Merging
    print("\n6. Testing Spec Merging:")
    existing = {"Processor": "Pentium", "OS": "Windows 10", "Location": "Data Center"}
    incoming = {"Processor": "Core i7", "OS": "Windows 11", "RAM": "16GB", "Location": "N/A"}
    merged = discovery_enricher.merge_specs(existing, incoming)
    print(f"  Existing: {existing}")
    print(f"  Incoming: {incoming}")
    print(f"  Merged:   {merged}")

    # 7. Test Smart Type Inference
    print("\n7. Testing Smart Type Inference:")
    gears = [
        "FortiGate-200F Firewall",
        "Cisco Catalyst 2960 Switch",
        "UniFi AP-AC-Pro",
        "Generic Device"
    ]
    for g in gears:
        t = discovery_enricher.detect_type(g)
        print(f"  '{g}' -> '{t}'")

if __name__ == "__main__":
    test_enrichment()
