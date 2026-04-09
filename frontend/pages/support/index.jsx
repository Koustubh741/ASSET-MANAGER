import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
    Users, 
    Laptop, 
    Wallet, 
    Scale, 
    Briefcase, 
    ShieldCheck, 
    HeartHandshake,
    Settings,
    ShoppingBag,
    Layout as IconLayout,
    Database,
    Cloud,
    MessageSquare,
    Zap,
    Search,
    ChevronRight,
    ArrowUpRight,
    ArrowRight
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
// import Layout from '@/components/Layout';
import { useRole } from '@/contexts/RoleContext';

const ICON_MAP = {
    Users, Laptop, Wallet, Scale, Briefcase, ShieldCheck, 
    HeartHandshake, Settings, ShoppingBag, IconLayout, 
    Database, Cloud, MessageSquare, Zap
};

export default function SupportLaunchpad() {
    const router = useRouter();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { user, currentRole, isAdmin, isVerified, isLoading: authLoading } = useRole();
    const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        // DIAGNOSTIC LOGGING
        const roleSlug = currentRole?.slug;
        const hasUser = !!user;
        const hasDepts = departments.length > 0;
        
        // ROOT FIX: Auto-redirect staff to their departmental hub using actual slugs.
        // CRITICAL ROOT FIX: Never auto-redirect until the role has been verified by a backend sync.
        // This prevents stale localStorage data (e.g. from a previous login session) from triggering loop redirects.
        const canRedirect = isVerified && !hasAttemptedRedirect && !authLoading && !loading && hasDepts && hasUser && !isAdmin && (roleSlug === 'SUPPORT' || roleSlug === 'MANAGER');
        
        if (canRedirect) {
            setHasAttemptedRedirect(true);
            console.log('Support Launchpad: [GUARD-PASS] Attempting auto-redirect for staff member.', { roleSlug, deptId: user.department_id });
            
            // Priority 1: Match by department_id
            let userDept = departments.find(d => d.id === user.department_id);
            
            // Priority 2: Fallback to name/slug match for legacy users
            if (!userDept && (user.department || user.domain)) {
                const targetDept = (user.department || user.domain).toLowerCase();
                userDept = departments.find(d => 
                    d.name.toLowerCase() === targetDept ||
                    d.slug.toLowerCase() === targetDept
                );
            }

            // FINAL VALIDATION: Ensure we have a valid, non-null, non-literal-undefined slug.
            if (userDept && userDept.slug && userDept.slug !== 'undefined' && userDept.slug !== '') {
                console.log(`Support Launchpad: [REDIRECTING] -> /support/${userDept.slug}`);
                router.replace(`/support/${userDept.slug}`);
            } else {
                console.error('Support Launchpad: [REDIRECT-ERROR] User is staff but no valid department slug found.', { 
                    userDeptId: user.department_id, 
                    userDeptName: user.department,
                    foundDeptName: userDept?.name
                });
            }
        }
    }, [authLoading, loading, departments, user, currentRole, router, isAdmin, hasAttemptedRedirect]);

    const loadDepartments = async () => {
        try {
            const data = await apiClient.getDepartments();
            setDepartments(data || []);
        } catch (error) {
            console.error('Failed to load departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDepts = departments.filter(d => {
        if (!d.slug || d.slug === 'undefined') return false;  // ROOT FIX: skip slugless depts
        const q = search.toLowerCase();
        return (d.name || '').toLowerCase().includes(q) || d.slug.toLowerCase().includes(q);
    });

    return (
        <div className="min-h-screen p-8 bg-app-bg text-app-text">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase">
                                Support <br /><span className="text-primary italic">Operations</span>
                            </h1>
                            <p className="text-xl text-app-text-muted max-w-2xl font-medium border-l-4 border-primary pl-6">
                                Staff-facing departmental support hubs. Select a unit to view its active ticket queue, manage incidents, and track resolution progress.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-96 group">
                            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                placeholder="SEARCH DEPARTMENT..."
                                className="w-full bg-app-surface border border-app-border rounded-none pl-14 pr-8 py-5 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-bold uppercase tracking-widest text-xs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Department Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(9).fill(0).map((_, i) => (
                                <div key={i} className="h-64 rounded-none bg-app-surface-soft animate-pulse border border-app-border"></div>
                            ))
                        ) : filteredDepts.length > 0 ? (
                            filteredDepts.map(dept => {
                                const meta = dept.dept_metadata || {};
                                const Icon = ICON_MAP[meta.icon] || Users;
                                const accentColor = meta.accent_color || 'primary';
                                
                                return (
                                    // ROOT FIX: Skip any department card that has no valid slug.
                                    // A missing slug would generate href="/support/undefined" which causes a redirect loop.
                                    !dept.slug || dept.slug === 'undefined' ? null : (
                                    <Link
                                        key={dept.id}
                                        href={`/support/${dept.slug}`}
                                        className="group relative p-8 bg-app-surface border border-app-border rounded-none hover:border-primary/50 transition-all duration-500 overflow-hidden text-left"
                                    >
                                        {/* Decorative ID */}
                                        <div className="absolute top-4 right-4 font-mono text-[8px] text-app-text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">
                                            DP-{dept.id?.toString().slice(0, 4).toUpperCase() || 'UNIT'}
                                        </div>

                                        <div className="flex items-center gap-6 mb-8 relative z-10">
                                            <div className={`p-4 rounded-none bg-${accentColor}/20 text-${accentColor} group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-${accentColor}/20`}>
                                                <Icon size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-white transition-colors">{dept.name}</h3>
                                                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{meta.short_code || 'DEPT-PORTAL'}</p>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs text-app-text-muted mb-8 leading-relaxed font-medium line-clamp-2 min-h-[32px] group-hover:text-app-text transition-colors">
                                            {meta.welcome_message || `Access specialized support and service requests for the ${dept.name} department.`}
                                        </p>

                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-none border border-app-bg bg-app-surface-soft flex items-center justify-center">
                                                        <div className="w-4 h-4 rounded-none bg-app-text-muted/20 animate-pulse"></div>
                                                    </div>
                                                ))}
                                                <div className="ml-4 text-[9px] font-bold text-app-text-muted uppercase tracking-widest self-center">+12 ACTIVE</div>
                                            </div>
                                            <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-${accentColor} group-hover:translate-x-2 transition-transform duration-500`}>
                                                Enter Portal
                                                <ArrowRight size={14} />
                                            </span>
                                        </div>

                                        {/* Hover HUD Overlay */}
                                        <div className={`absolute inset-0 bg-gradient-to-br from-${accentColor}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
                                    </Link>
                                    )
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-app-border-soft rounded-none">
                                <h3 className="text-2xl font-black uppercase tracking-widest text-app-text-muted">No Units Found</h3>
                            </div>
                        )}
                    </div>

                    <div className="pt-12 border-t border-app-border-soft flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
                        <div className="flex items-center gap-6">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-app-bg bg-app-surface-soft"></div>
                                ))}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest">150+ Agents Online Across 15 Departments</p>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">System Secure • Direct Routing Protocol 8.4</p>
                    </div>
                </div>
            </div>
    );
}
