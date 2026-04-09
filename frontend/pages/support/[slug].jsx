import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertCircle,
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
    Clock,
    CheckCircle2,
    Circle,
    Loader2,
    RefreshCw,
    Search,
    Filter,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    AlertTriangle,
    InboxIcon,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

const ICON_MAP = {
    Users, Laptop, Wallet, Scale, Briefcase, ShieldCheck,
    HeartHandshake, Settings, ShoppingBag, IconLayout,
    Database, Cloud, MessageSquare, Zap
};

const STATUS_CONFIG = {
    OPEN:        { label: 'Open',        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400' },
    ACKNOWLEDGED:{ label: 'Acknowledged',color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
    PENDING:     { label: 'Pending',     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
    RESOLVED:    { label: 'Resolved',    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  dot: 'bg-green-400' },
    CLOSED:      { label: 'Closed',      color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20',  dot: 'bg-slate-400' },
};

const PRIORITY_CONFIG = {
    Critical: { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
    High:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
    Medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    Low:      { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/30' },
};

function StatCard({ label, value, icon: Icon, color = 'primary', trend }) {
    return (
        <div className="bg-app-surface border border-app-border p-6 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}/5 rounded-bl-none`} />
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 bg-${color}/10 text-${color} rounded-none`}>
                    <Icon size={18} />
                </div>
                {trend !== undefined && (
                    <span className={`text-[9px] font-black uppercase tracking-widest ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className={`text-3xl font-black tracking-tighter text-${color} mb-1`}>{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted">{label}</div>
        </div>
    );
}

export default function DepartmentPortal() {
    const router = useRouter();
    const { slug } = router.query;
    const { user, currentRole, isAdmin } = useRole();

    const [dept, setDept] = useState(null);
    const [deptLoading, setDeptLoading] = useState(true);
    const [deptError, setDeptError] = useState(null);

    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [lastRefresh, setLastRefresh] = useState(null);

    // Determine if user has management access to this portal
    const isStaff = isAdmin || currentRole?.slug === 'SUPPORT' || currentRole?.slug === 'MANAGER';

    const loadDepartment = useCallback(async () => {
        if (!slug) return;
        setDeptLoading(true);
        setDeptError(null);
        try {
            const data = await apiClient.getDepartment(slug);
            setDept(data);
        } catch (err) {
            console.error('Failed to load department:', err);
            setDeptError('Department portal not found or access denied.');
        } finally {
            setDeptLoading(false);
        }
    }, [slug]);

    const loadTickets = useCallback(async () => {
        if (!slug || !isStaff) return;
        setTicketsLoading(true);
        try {
            const params = { limit: 100 };
            // Admins pass the dept slug as a filter; staff get auto-scoped by backend
            if (isAdmin && dept?.name) {
                params.department = dept.name;
            }
            if (search.trim()) params.search = search.trim();
            const data = await apiClient.get(`/tickets/?${new URLSearchParams(params)}`);
            setTickets(Array.isArray(data) ? data : []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to load tickets:', err);
            setTickets([]);
        } finally {
            setTicketsLoading(false);
        }
    }, [slug, isAdmin, dept, search, isStaff]);

    // Invalid slug guard
    useEffect(() => {
        if (slug && (slug === 'undefined' || slug === 'null')) {
            router.replace('/support');
        }
    }, [slug, router]);

    useEffect(() => {
        loadDepartment();
    }, [loadDepartment]);

    useEffect(() => {
        if (dept) loadTickets();
    }, [dept, loadTickets]);

    // Derived stats from ticket list
    const stats = {
        open:       tickets.filter(t => ['OPEN', 'ACKNOWLEDGED'].includes(t.status?.toUpperCase())).length,
        inProgress: tickets.filter(t => t.status?.toUpperCase() === 'IN_PROGRESS').length,
        pending:    tickets.filter(t => t.status?.toUpperCase() === 'PENDING').length,
        resolved:   tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status?.toUpperCase())).length,
        critical:   tickets.filter(t => t.priority === 'Critical').length,
    };

    // Client-side filtering
    const filteredTickets = tickets.filter(t => {
        const matchStatus   = statusFilter === 'ALL' || t.status?.toUpperCase() === statusFilter;
        const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
        return matchStatus && matchPriority;
    });

    // Loading
    if (deptLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-app-bg">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-2 border-primary border-t-transparent animate-spin mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Initializing Portal...</p>
                </div>
            </div>
        );
    }

    // Error
    if (deptError || !dept) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-app-bg text-app-text">
                <div className="border border-red-500/20 bg-red-500/5 p-12 text-center max-w-md w-full">
                    <AlertCircle size={48} className="mx-auto mb-6 text-red-400" />
                    <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">Portal Offline</h2>
                    <p className="text-app-text-muted mb-8">{deptError}</p>
                    <Link href="/support" className="block w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 text-center text-xs uppercase tracking-widest">
                        Return to Launchpad
                    </Link>
                </div>
            </div>
        );
    }

    // Non-staff access guard
    if (!isStaff) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-app-bg text-app-text">
                <div className="border border-yellow-500/20 bg-yellow-500/5 p-12 text-center max-w-md w-full">
                    <ShieldCheck size={48} className="mx-auto mb-6 text-yellow-400" />
                    <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">Restricted Access</h2>
                    <p className="text-app-text-muted mb-8">
                        This portal is for support staff only. To raise a support ticket, visit the <strong>Tickets</strong> section.
                    </p>
                    <Link href="/tickets/new" className="block w-full py-4 bg-primary text-black font-black transition-all text-center text-xs uppercase tracking-widest">
                        Raise a Ticket
                    </Link>
                </div>
            </div>
        );
    }

    const meta = dept.dept_metadata || {};
    const Icon = ICON_MAP[meta.icon] || Users;
    const accentColor = meta.accent_color || 'primary';
    const borderClass = meta.border_accent || 'border-primary/20';

    return (
        <div className="min-h-screen bg-app-bg text-app-text">
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">

                {/* Back Nav */}
                <button
                    type="button"
                    onClick={() => router.push('/support')}
                    className="flex items-center gap-2 text-app-text-muted hover:text-white transition-colors group text-xs font-black uppercase tracking-widest"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Support Launchpad
                </button>

                {/* Department Header */}
                <div className={`border ${borderClass} bg-app-surface p-8 relative overflow-hidden`}>
                    <div className={`absolute -top-12 -right-12 w-48 h-48 bg-${accentColor}/5 rounded-full blur-3xl pointer-events-none`} />
                    <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
                        <div className={`p-5 bg-${accentColor}/10 text-${accentColor} inline-flex shrink-0`}>
                            <Icon size={40} />
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-4xl font-black tracking-tighter uppercase italic">{dept.name}</h1>
                                <span className={`text-[9px] font-black uppercase border px-2 py-1 tracking-widest ${borderClass} text-${accentColor}`}>
                                    {meta.short_code || dept.slug?.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-sm text-app-text-muted font-medium">
                                {meta.welcome_message || `Departmental support operations hub for ${dept.name}.`}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={loadTickets}
                                disabled={ticketsLoading}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-app-text-muted hover:text-white transition-colors border border-app-border px-4 py-2 hover:border-primary/30"
                            >
                                <RefreshCw size={12} className={ticketsLoading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            {lastRefresh && (
                                <span className="text-[9px] text-app-text-muted">
                                    Updated {lastRefresh.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Open"        value={stats.open}       icon={Circle}       color="blue" />
                    <StatCard label="In Progress"  value={stats.inProgress} icon={Loader2}      color="orange" />
                    <StatCard label="Pending"      value={stats.pending}    icon={Clock}        color="purple" />
                    <StatCard label="Resolved"     value={stats.resolved}   icon={CheckCircle2} color="green" />
                    <StatCard label="Critical"     value={stats.critical}   icon={AlertTriangle} color="red" />
                </div>

                {/* Ticket Queue */}
                <div className="bg-app-surface border border-app-border overflow-hidden">
                    {/* Controls */}
                    <div className="p-5 border-b border-app-border flex flex-wrap items-center gap-4">
                        <h2 className="text-sm font-black uppercase tracking-widest mr-auto">
                            Ticket Queue
                            <span className="ml-3 text-primary font-mono text-xs">{filteredTickets.length}</span>
                        </h2>

                        {/* Search */}
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && loadTickets()}
                                className="pl-8 pr-4 py-2 bg-app-surface-soft border border-app-border text-xs font-medium focus:ring-1 focus:ring-primary/50 outline-none w-48 uppercase placeholder:normal-case"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-app-surface-soft border border-app-border px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                        >
                            <option value="ALL">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={priorityFilter}
                            onChange={e => setPriorityFilter(e.target.value)}
                            className="bg-app-surface-soft border border-app-border px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                        >
                            <option value="ALL">All Priority</option>
                            {['Critical', 'High', 'Medium', 'Low'].map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-app-border bg-app-surface-soft">
                                    {['Ticket ID', 'Subject', 'Requestor', 'Priority', 'Status', 'Created', ''].map(h => (
                                        <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-app-text-muted whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border">
                                {ticketsLoading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {Array(7).fill(0).map((__, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-4 bg-app-surface-soft/80 rounded w-24" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredTickets.length > 0 ? (
                                    filteredTickets.map(ticket => {
                                        const statusCfg = STATUS_CONFIG[ticket.status?.toUpperCase()] || STATUS_CONFIG.OPEN;
                                        const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.Medium;
                                        const createdAt = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

                                        return (
                                            <tr
                                                key={ticket.id}
                                                className="hover:bg-primary/5 cursor-pointer transition-colors group"
                                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-[10px] text-primary font-bold">
                                                        {ticket.display_id || ticket.id?.slice(0, 8).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 max-w-xs">
                                                    <p className="text-xs font-bold uppercase truncate group-hover:text-white transition-colors">
                                                        {ticket.subject}
                                                    </p>
                                                    {ticket.category && (
                                                        <p className="text-[9px] text-app-text-muted uppercase tracking-widest mt-0.5">{ticket.category}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-xs text-app-text-muted">
                                                        {ticket.requestor?.full_name || 'System'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase border tracking-widest ${priorityCfg.color} ${priorityCfg.bg}`}>
                                                        {ticket.priority}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${statusCfg.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dot}`} />
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[10px] text-app-text-muted">{createdAt}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <ChevronRight size={14} className="text-app-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-20 text-center">
                                            <InboxIcon size={36} className="mx-auto mb-4 text-app-text-muted/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                                                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                                                    ? 'No tickets match current filters'
                                                    : 'Queue is clear — no active incidents'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {filteredTickets.length > 0 && (
                        <div className="px-5 py-3 border-t border-app-border flex items-center justify-between">
                            <span className="text-[9px] text-app-text-muted uppercase tracking-widest">
                                {filteredTickets.length} incident{filteredTickets.length !== 1 ? 's' : ''} displayed
                            </span>
                            <Link
                                href="/tickets"
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                                Full Ticket Queue <ExternalLink size={10} />
                            </Link>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
