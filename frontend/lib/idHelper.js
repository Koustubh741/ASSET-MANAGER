/**
 * Formats a UUID or ID into a human-readable string with a prefix.
 * @param {string} id - The raw ID (usually a UUID).
 * @param {'ticket' | 'user' | 'asset'} type - The type of object.
 * @returns {string} - Formatted ID (e.g., TKT-5174).
 */
/**
 * Maps a category or asset type to the Asset Letter Matrix from the Smart ID Legend.
 */
function getAssetLetter(context = {}) {
    const searchKey = (context.asset_type || context.category || context.subject || "Other").toLowerCase();
    
    // Exact sync with backend SmartIDService.ASSET_LETTER_MATRIX
    if (searchKey.includes('server')) return 'S';
    if (searchKey.includes('laptop')) return 'L';
    if (searchKey.includes('desktop')) return 'D';
    if (searchKey.includes('network') || searchKey.includes('wifi')) return 'N';
    if (searchKey.includes('mobile') || searchKey.includes('phone')) return 'M';
    if (searchKey.includes('software') || searchKey.includes('app')) return 'A';
    if (searchKey.includes('storage')) return 'T';
    if (searchKey.includes('peripheral') || searchKey.includes('printer')) return 'P';
    if (searchKey.includes('virtual') || searchKey.includes('vm')) return 'V';
    if (searchKey.includes('hardware')) return 'H';

    return 'O'; // Other
}

export function formatId(id, type, context = null) {
    if (!id) return 'N/A';

    // ROOT FIX: Always prefer the database-stored display_id or human-readable name if available
    if (context && context.display_id) return context.display_id;
    if (type === 'user' && context && context.full_name) return context.full_name;

    // If it's already formatted, return as is (UUIDs are 36 chars)
    if (typeof id === 'string' && id.length < 20) return id;

    const shortCode = id.toString().split('-')[0].substring(0, 4).toUpperCase();

    if (type === 'ticket' && context) {
        // [DEPT]-[TARGET]-[YYMMDD]-[HASH]
        // TARGET = Asset Letter + Priority Num (1=Hi, 2=Med, 3=Lo)

        // 1. DEPT: Extract from requestor_department or fallback to 'GEN'
        let dept = 'GEN';
        const rawDept = (context.requestor_department || context.department || '').trim().toUpperCase();
        if (rawDept) {
            if (rawDept.length >= 3) {
                dept = rawDept.substring(0, 3);
            } else {
                dept = rawDept.padEnd(3, 'X'); // e.g. HR -> HRX
            }
        }

        // 2. TARGET: [Asset Letter][Priority Num]
        const assetLetter = getAssetLetter(context);
        let prioNum = '2'; 
        const priority = (context.priority || '').toUpperCase();
        if (priority === 'CRITICAL' || priority === 'HIGH') prioNum = '1';
        else if (priority === 'LOW') prioNum = '3';
        
        const target = `${assetLetter}${prioNum}`;

        // 3. YYMMDD: Extraction from created_at in local UTC sync
        const dateObj = context.created_at ? new Date(context.created_at) : new Date();
        const yy = String(dateObj.getFullYear()).slice(-2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;

        // 4. HASH: First 4 chars of the ID
        const hash = id.toString().replace(/-/g, '').substring(0, 4).toUpperCase();

        return `${dept}-${target}-${dateStr}-${hash}`;
    }

    const prefixMap = {
        ticket: 'TKT',
        user: 'USR',
        asset: 'AST',
        solver: 'SOL'
    };

    const prefix = prefixMap[type] || 'ID';
    return `${prefix}-${shortCode}`;
}

/**
 * Copies text to clipboard and provides feedback.
 * @param {string} text - The text to copy.
 * @param {string} label - Label for logging/feedback.
 */
export async function copyToClipboard(text, label = 'ID') {
    try {
        await navigator.clipboard.writeText(text);
        console.log(`${label} copied to clipboard: ${text}`);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

/**
 * Returns a neural classification tag based on ticket category/subject.
 * @param {object} ticket - The ticket object.
 * @returns {string} - Classification tag (e.g., HWD-AX7).
 */
export function getClassificationTag(ticket) {
    if (!ticket) return 'INC-AX7';

    const category = (ticket.category || '').toUpperCase();
    const subject = (ticket.subject || '').toUpperCase();

    if (category.includes('HARDWARE') || category.includes('LAPTOP') || category.includes('DESKTOP') || category.includes('SERVER') || subject.includes('HARDWARE')) {
        return 'HWD-AX7';
    }
    if (category.includes('NETWORK') || category.includes('WIFI') || category.includes('VPN') || subject.includes('CONNECTION') || subject.includes('WIFI')) {
        return 'NET-AX7';
    }
    if (category.includes('SOFTWARE') || category.includes('APP') || category.includes('LICENSE') || subject.includes('SOFTWARE')) {
        return 'SFT-AX7';
    }
    if (category.includes('SECURITY') || category.includes('ACCESS') || category.includes('SSO') || subject.includes('SECURITY') || subject.includes('PASSWORD')) {
        return 'SEC-AX7';
    }

    return 'OPS-AX7';
}
