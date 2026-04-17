
export const V2_RETAIL_DEPTS = [
    'ADMIN', 'B&M', 'BD', 'F&A', 'HR', 'INVENTORY', 'IT',
    'LOSS PREVENTION', 'MARKETING', 'NSO', 'PLANNING', 'PROJECT', 
    'RETAIL', 'RETAIL OPERATION', 'SCM', 'LEGAL & COMPANY SECRETARY'
];

/**
 * Detailed Theme Registry for all 16 V2 Retail Departments
 */
export const DEPARTMENT_THEMES = {
    'IT': { color: 'violet', accent: 'from-violet-500 to-purple-500', icon: 'Monitor' },
    'F&A': { color: 'emerald', accent: 'from-emerald-500 to-teal-500', icon: 'DollarSign' },
    'FINANCE': { color: 'emerald', accent: 'from-emerald-500 to-teal-500', icon: 'Wallet' },
    'SCM': { color: 'blue', accent: 'from-blue-500 to-indigo-500', icon: 'Truck' },
    'PROCUREMENT': { color: 'blue', accent: 'from-blue-500 to-indigo-500', icon: 'ShoppingBag' },
    'LOSS PREVENTION': { color: 'rose', accent: 'from-rose-500 to-red-600', icon: 'Eye' },
    'RETAIL OPERATION': { color: 'amber', accent: 'from-amber-400 to-orange-500', icon: 'Store' },
    'RETAIL': { color: 'amber', accent: 'from-amber-400 to-orange-500', icon: 'ShoppingBasket' },
    'HR': { color: 'pink', accent: 'from-pink-500 to-rose-500', icon: 'Users' },
    'BD': { color: 'cyan', accent: 'from-cyan-400 to-blue-500', icon: 'TrendingUp' },
    'MARKETING': { color: 'indigo', accent: 'from-indigo-500 to-violet-600', icon: 'Megaphone' },
    'NSO': { color: 'orange', accent: 'from-orange-500 to-red-500', icon: 'Rocket' },
    'PLANNING': { color: 'slate', accent: 'from-slate-500 to-slate-700', icon: 'Target' },
    'ADMIN': { color: 'gray', accent: 'from-gray-500 to-gray-700', icon: 'Building' },
    'PROJECT': { color: 'yellow', accent: 'from-yellow-400 to-orange-500', icon: 'HardHat' },
    'INVENTORY': { color: 'sky', accent: 'from-sky-400 to-blue-500', icon: 'Package' },
    'B&M': { color: 'fuchsia', accent: 'from-fuchsia-500 to-purple-600', icon: 'Scissors' },
    'LEGAL & COMPANY SECRETARY': { color: 'slate', accent: 'from-slate-600 to-gray-700', icon: 'Scale' },
    'EXECUTIVE': { color: 'amber', accent: 'from-amber-400 to-yellow-600', icon: 'Crown' },
    'DEFAULT': { color: 'slate', accent: 'from-slate-400 to-slate-600', icon: 'Layout' }
};

export const V2_ROLES = [
    { label: 'Executive', slug: 'EXECUTIVE', color: '#f59e0b', icon: 'Crown' },
    { label: 'System Admin', slug: 'ADMIN', color: '#8b5cf6', icon: 'ShieldCheck' },
    { label: 'IT Management', slug: 'IT_MANAGEMENT', color: '#3b82f6', icon: 'Monitor' },
    { label: 'Finance Staff', slug: 'FINANCE', color: '#10b981', icon: 'Wallet' },
    { label: 'Procurement Unit', slug: 'PROCUREMENT', color: '#f97316', icon: 'ShoppingBag' },
    { label: 'Loss Prevention', slug: 'LOSS_PREVENTION', color: '#ef4444', icon: 'Eye' },
    { label: 'Store Manager', slug: 'MANAGER', color: '#06b6d4', icon: 'Briefcase' },
    { label: 'IT Support', slug: 'SUPPORT', color: '#6366f1', icon: 'Headphones' },
    { label: 'Staff Associate', slug: 'END_USER', color: '#64748b', icon: 'User' }
];

/**
 * Intelligent V2 Retail Persona Resolver
 * Maps professional designations and departments to system roles.
 */
export function mapDesignationToRole(designation, department) {
    if (!designation) return 'END_USER';
    
    const d = String(designation).toUpperCase().trim();
    const dept = String(department || '').toUpperCase().trim();

    // 1. Executive Tier
    const isExecutivePersona = [
        'CEO', 'CFO', 'CTO', 'CIO', 'COO', 'CHRO', 'PRESIDENT', 
        'VICE PRESIDENT', 'HEAD', 'AVP', 'VP', 'GM'
    ].some(title => d.includes(title));
    
    if (isExecutivePersona && (dept === 'F&A' || dept === 'LEGAL & COMPANY SECRETARY' || dept === 'IT' || dept === 'HR')) {
        return 'EXECUTIVE';
    }

    // 2. Departmental Management
    const isManagerPersona = [
        'MANAGER', 'MGR', 'SM', 'ASM', 'CLUSTER_MANAGER', 'REGIONAL_MANAGER', 'ZONAL_MANAGER', 'HEAD'
    ].some(title => d.includes(title));

    if (isManagerPersona) {
        if (dept === 'IT') return 'IT_MANAGEMENT';
        if (dept === 'F&A' || dept === 'FINANCE') return 'FINANCE';
        if (dept === 'SCM' || dept === 'PROCUREMENT') return 'PROCUREMENT';
        if (dept === 'LOSS PREVENTION') return 'LOSS_PREVENTION';
        return 'MANAGER';
    }

    // 3. Specialized Support
    if (dept === 'IT') {
        if (d.includes('ABAP') || d.includes('BASIS') || d.includes('SUPPORT') || d.includes('ENGINEER')) return 'SUPPORT';
    }
    
    if (dept === 'LOSS PREVENTION') return 'LOSS_PREVENTION';
    if (dept === 'INVENTORY') return 'SUPPORT';

    // 4. Default Staff
    return 'END_USER';
}

/**
 * Gets the consolidated theme for a user based on their primary meta
 */
export function getV2Theme(department, role) {
    const deptKey = String(department || '').toUpperCase().trim();
    const roleKey = String(role || '').toUpperCase().trim();

    // Priority 1: Direct Department Match
    if (DEPARTMENT_THEMES[deptKey]) return DEPARTMENT_THEMES[deptKey];
    
    // Priority 2: Role Based Fallback
    if (roleKey === 'ADMIN') return DEPARTMENT_THEMES['IT'];
    if (roleKey === 'EXECUTIVE') return DEPARTMENT_THEMES['EXECUTIVE'];
    
    return DEPARTMENT_THEMES['DEFAULT'];
}
