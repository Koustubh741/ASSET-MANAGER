from backend.app.services.discovery_enricher import discovery_enricher

def test_user_device():
    description = "Cache_SNMP"
    serial = "FG200FT923905733"
    vendor = "Fortinet"
    
    # Test Vendor Detection
    v = discovery_enricher.detect_vendor(description, serial)
    print(f"Detected Vendor: {v}")
    
    # Test Type Detection
    t = discovery_enricher.detect_type(description, vendor=vendor)
    print(f"Detected Type: {t}")

if __name__ == "__main__":
    test_user_device()
