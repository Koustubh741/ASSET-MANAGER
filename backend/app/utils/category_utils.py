
def normalize_category(category_name: str, subject: str = "", description: str = "") -> str:
    """
    Normalizes fragmented ticket categories into standardized parent buckets.
    Uses subject and description for "Intelligent Mapping" if category is generic.
    """
    category_name = category_name or "Other"
    subject = subject or ""
    description = description or ""
    
    lower_cat = category_name.lower().strip()
    lower_text = f"{subject} {description}".lower()
    
    # helper to check keywords in either category or full text
    def has_any(keywords, text):
        return any(k in text for k in keywords)

    # 1. Hardware Bucket
    hw_keywords = [
        'hardware', 'fault', 'screen', 'display', 'overheating', 'heat', 
        'printer', 'scanning', 'mobile', 'device', 'keyboard', 'mouse', 'monitor', 'flickering'
    ]
    if has_any(hw_keywords, lower_cat) or (lower_cat == "other" and has_any(hw_keywords, lower_text)):
        return "Hardware"
        
    # 2. Software Bucket
    sw_keywords = [
        'software', 'os', 'windows', 'macos', 'linux', 'performance', 'lag', 
        'outlook', 'email', 'office', 'bios', 'boot', 'startup', 'application', 'app',
        'adobe', 'license', 'bsod', 'blue screen', 'login'
    ]
    if has_any(sw_keywords, lower_cat) or (lower_cat == "other" and has_any(sw_keywords, lower_text)):
        return "Software"
        
    # 3. Network Bucket
    net_keywords = [
        'network', 'wifi', 'wi-fi', 'bluetooth', 'connectivity', 'vpn', 'internet', 'router'
    ]
    if has_any(net_keywords, lower_cat) or (lower_cat == "other" and has_any(net_keywords, lower_text)):
        return "Network"
        
    # 4. Security Bucket
    sec_keywords = [
        'security', 'access', 'permissions', 'password', 'lock', 'shield', 'incident', 'breach'
    ]
    if has_any(sec_keywords, lower_cat) or (lower_cat == "other" and has_any(sec_keywords, lower_text)):
        return "Security"
        
    # 5. HR & Finance Bucket [NEW]
    hr_fin_keywords = [
        'payroll', 'hr', 'contract', 'policy', 'bonus', 'salary', 'invoice', 'tender', 
        'human resources', 'finance', 'benefits', 'compensation'
    ]
    if has_any(hr_fin_keywords, lower_cat) or (lower_cat == "other" and has_any(hr_fin_keywords, lower_text)):
        return "HR & Finance"
        
    # 6. Procurement Bucket
    proc_keywords = [
        'procurement', 'purchase', 'buy', 'order', 'request asset'
    ]
    if has_any(proc_keywords, lower_cat) or (lower_cat == "other" and has_any(proc_keywords, lower_text)):
        return "Procurement"
        
    # Default
    return "Other"
