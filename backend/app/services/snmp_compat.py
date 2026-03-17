# ════════════════════════════════════════════════════════════════════════════
# SECTION 7 — COMPATIBILITY WRAPPER FOR LEGACY CALLERS
# ════════════════════════════════════════════════════════════════════════════

async def scan_network_range(
    cidr: str, 
    community: str = "public", 
    v3_data: Optional[Dict[str, Any]] = None, 
    context_name: str = ""
) -> List[Dict[str, Any]]:
    """
    Compatibility wrapper for existing callers (collect.py, snmp_scanner.py).
    Maps old positional arguments to the new ScanConfig/SNMPScanner architecture.
    
    Returns: List of device dictionaries (legacy format)
    """
    v3_creds = None
    if v3_data:
        try:
            v3_creds = SNMPv3Credentials(
                username=v3_data.get('username', 'user'),
                auth_key=v3_data.get('authKey'),
                priv_key=v3_data.get('privKey'),
                auth_protocol=AuthProtocol(v3_data.get('authProtocol', 'SHA')),
                priv_protocol=PrivProtocol(v3_data.get('privProtocol', 'AES'))
            )
        except ValueError as e:
            logger.error(f"Invalid v3 credentials: {e}")
            return []
    
    config = ScanConfig(
        communities=[c.strip() for c in community.split(",")] if "," in community else [community],
        v3=v3_creds,
        context_name=context_name
    )
    
    try:
        result = await scan_network(cidr, config)
        # Convert DeviceInfo objects back to dictionaries for compatibility
        return [d.to_dict() for d in result.devices]
    except ValueError as e:
        logger.error(f"Scan failed: {e}")
        return []
