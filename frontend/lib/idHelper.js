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
    const category = (context.category || '').toUpperCase();
    const subject = (context.subject || '').toUpperCase();
    const assetType = (context.asset_type || '').toUpperCase();

    // S: Server
    if (category.includes('SERVER') || subject.includes('SERVER') || assetType.includes('SERVER')) return 'S';
    // L: Laptop
    if (category.includes('LAPTOP') || subject.includes('LAPTOP') || assetType.includes('LAPTOP')) return 'L';
    // D: Desktop
    if (category.includes('DESKTOP') || subject.includes('DESKTOP') || assetType.includes('DESKTOP')) return 'D';
    // N: Network
    if (category.includes('NETWORK') || category.includes('WIFI') || category.includes('VPN') || subject.includes('NETWORK') || subject.includes('WIFI')) return 'N';
    // M: Mobile
    if (category.includes('MOBILE') || category.includes('PHONE') || subject.includes('PHONE') || subject.includes('MOBILE')) return 'M';
    // A: Software
    if (category.includes('SOFTWARE') || category.includes('APP') || subject.includes('SOFTWARE') || subject.includes('APP')) return 'A';
    // T: Storage
    if (category.includes('STORAGE') || category.includes('DRIVE') || category.includes('NAS') || subject.includes('DISK')) return 'T';
    // P: Peripheral
    if (category.includes('PERIPHERAL') || category.includes('PRINTER') || category.includes('MOUSE') || category.includes('KEYBOARD') || subject.includes('PRINTER') || subject.includes('JAM')) return 'P';
    // V: Virtual/VM
    if (category.includes('VIRTUAL') || category.includes('VM') || subject.includes('VIRTUAL')) return 'V';
    // H: Hardware (Fallback for generic hardware issues)
    if (category.includes('HARDWARE') || subject.includes('HARDWARE')) return 'H';

    return 'O'; // Other
}

export function formatId(id, type, context = null) {
    if (!id) return 'N/A';

    // If it's already formatted, return as is (UUIDs are 36 chars)
    if (typeof id === 'string' && id.length < 20) return id;

    const shortCode = id.toString().split('-')[0].substring(0, 4).toUpperCase();

    if (type === 'ticket' && context) {
        // [DEPT]-[TARGET]-[YYMMDD]-[HASH]
        // TARGET = Asset Letter + Priority Num (1=Hi, 2=Med, 3=Lo)

        // 1. DEPT: Extract from requestor_department or fallback to 'SYS'
        let dept = 'SYS';
        if (context.requestor_department) {
            dept = context.requestor_department.substring(0, 3).toUpperCase();
        } else if (context.department) {
            dept = context.department.substring(0, 3).toUpperCase();
        } else if (context.category) {
            dept = context.category.substring(0, 3).toUpperCase();
        }

        // 2. TARGET: [Asset Letter][Priority Num]
        const assetLetter = getAssetLetter(context);
        let prioNum = '2'; 
        const priority = (context.priority || '').toUpperCase();
        if (priority === 'HIGH') prioNum = '1';
        else if (priority === 'LOW') prioNum = '3';
        
        const target = `${assetLetter}${prioNum}`;

        // 3. YYMMDD: Extraction from created_at
        const dateObj = context.created_at ? new Date(context.created_at) : new Date();
        const yy = String(dateObj.getFullYear()).slice(-2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;

        // 4. HASH: First 4 chars of the ID
        const hash = id.toString().split('-')[0].substring(0, 4).toUpperCase();

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
