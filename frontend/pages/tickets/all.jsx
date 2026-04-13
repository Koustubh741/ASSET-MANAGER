import Link from 'next/link';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';

// ── SLA Helper ────────────────────────────────────────────────────────────────
function getSLAStatus(slaDeadline) {
    if (!slaDeadline) return null;
    
    // Robustly handle ISO strings from FastAPI/SQLAlchemy
    // If it's already an offset-aware string (e.g. includes '+' or 'Z'), new Date() parses it correctly as UTC.
    // If it's missing the offset, we assume UTC.
    let deadlineDate;
    try {
        let dateStr = String(slaDeadline);
        if (!dateStr.includes('Z') && !dateStr.includes('+')) {
            dateStr += 'Z';
        }
        deadlineDate = new Date(dateStr);
    } catch (e) {
        console.error("Failed to parse SLA deadline:", slaDeadline);
        return null;
    }

    const now = new Date();
    const diffMs = deadlineDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
        const overdueH = Math.abs(diffHours);
        const label = overdueH >= 24
            ? `${Math.floor(overdueH / 24)}d overdue`
            : `${Math.floor(overdueH)}h overdue`;
        return { label, color: 'bg-red-500/15 text-red-500 border border-red-500/30', icon: 'breached' };
    }
    if (diffHours <= 4) {
        const h = Math.floor(diffHours);
        const m = Math.round((diffHours % 1) * 60);
        return { label: `${h}h ${m}m left`, color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', icon: 'soon' };
    }
    if (diffHours <= 24) {
        return { label: `${Math.floor(diffHours)}h left`, color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/20', icon: 'ok' };
    }
    const days = Math.floor(diffHours / 24);
    return { label: `${days}d left`, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20', icon: 'ok' };
}

function SLABadge({ slaDeadline, status }) {
    const resolved = ['CLOSED', 'RESOLVED'].includes(status?.toUpperCase());
    if (resolved) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-400/20">
                <CheckCircle size={11} /> Met
            </span>
        );
    }
    const sla = getSLAStatus(slaDeadline);
    if (!sla) return <span className="text-[10px] text-app-text-muted opacity-40">—</span>;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${sla.color}`}>
            {sla.icon === 'breached' ? <AlertTriangle size={11} /> : <Timer size={11} />}
            {sla.label}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AllTicketsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (router.isReady && router.query.status) {
            setFilterStatus(router.query.status);
        }
    }, [router.isReady, router.query]);

    useEffect(() => {
        const loadTickets = async () => {
            setLoading(true);
            try {
                const resp = await apiClient.getTickets(0, 0); // 0 means no limit
                const raw = resp.data || [];
                const mapped = raw.map(t => ({
                    id: t.id,
                    display_id: t.display_id || t.id?.slice(0, 8),
                    subject: t.subject,
                    priority: t.priority || 'Low',
                    status: t.status || 'Open',
                    user: t.requestor_name || 'System',
                    created: t.created_at
                        ? new Date(t.created_at.endsWith('Z') || t.created_at.includes('+') ? t.created_at : t.created_at + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A',
                    time: t.created_at
                        ? new Date(t.created_at.endsWith('Z') || t.created_at.includes('+') ? t.created_at : t.created_at + 'Z').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '',
                    sla_deadline: t.sla_deadline,
                    description: t.description,
                }));
                setTickets(mapped);
            } catch (err) {
                console.error('Failed to load tickets:', err);
                setTickets([]);
            } finally {
                setLoading(false);
            }
        };
        loadTickets();
    }, []);

    const filtered = tickets.filter(t => {
        if (filterStatus === 'All') return true;
        const s = t.status?.toUpperCase();
        const fs = filterStatus.toUpperCase();
        if (fs === 'OPEN') return ['OPEN', 'IN_PROGRESS', 'NEW', 'ASSIGNED', 'ACKNOWLEDGED'].includes(s);
        if (fs === 'PENDING') return ['PENDING', 'PENDING APPROVAL', 'PENDING_APPROVAL', 'APPROVED'].includes(s);
        if (fs === 'CLOSED') return ['CLOSED', 'RESOLVED'].includes(s);
        return s === fs;
    });

    const priorityStyle = (p) => {
        const u = p?.toUpperCase();
        if (u === 'CRITICAL') return 'bg-red-600/15 text-red-500 border border-red-500/30';
        if (u === 'HIGH') return 'bg-orange-500/15 text-orange-400 border border-orange-400/30';
        if (u === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/20';
        return 'bg-blue-500/10 text-blue-400 border border-blue-400/20';
    };

    const statusStyle = (s) => {
        const u = s?.toUpperCase();
        if (u === 'OPEN') return 'bg-amber-500/10 text-amber-500 border border-amber-400/30';
        if (u === 'IN_PROGRESS') return 'bg-indigo-500/10 text-indigo-400 border border-indigo-400/30';
        if (u === 'RESOLVED' || u === 'CLOSED') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20';
        return 'bg-slate-500/10 text-slate-400';
    };

    return (
        <div className="min-h-screen p-8 bg-app-obsidian text-app-text font-['Space_Grotesk']">
            <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-app-void hover:bg-app-primary hover:text-app-void border border-app-border transition-all active:scale-95 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-app-text leading-none">
                            {filterStatus === 'All' ? 'All' : filterStatus}{' '}
                            <span className="text-app-primary">Tickets</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted opacity-40 mt-1">
                            {loading ? 'Loading...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''} found`}
                        </p>
                    </div>
                </div>

                {/* Status filter tabs */}
                <div className="flex gap-2 flex-wrap">
                    {['All', 'Open', 'Pending', 'Closed'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                                filterStatus === s
                                    ? 'bg-app-primary text-app-void border-app-primary'
                                    : 'bg-app-void text-app-text-muted border-app-border hover:border-app-primary/40 hover:text-app-text'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-app-surface border border-app-border overflow-x-auto rounded-none shadow-xl">
                    <table className="w-full text-left text-sm min-w-[900px]">
                        <thead className="border-b border-app-border bg-app-void">
                            <tr>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">ID</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted">Subject</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">Priority</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">User</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">
                                    <span className="flex items-center gap-1.5"><Clock size={11} /> Date / Time</span>
                                </th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted whitespace-nowrap">
                                    <span className="flex items-center gap-1.5"><Timer size={11} /> SLA</span>
                                </th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-app-text-muted text-right whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-3 bg-app-void/60 rounded w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-app-text-muted text-sm">
                                        No tickets found for <strong className="text-app-primary">{filterStatus}</strong> filter.
                                    </td>
                                </tr>
                            ) : filtered.map(t => (
                                <tr key={t.id} className="hover:bg-app-primary/[0.03] transition-colors group relative">
                                    {/* Accent line on hover */}
                                    <td className="px-4 py-3 font-mono text-[11px] text-app-text-muted whitespace-nowrap">
                                        {t.display_id}
                                    </td>
                                    <td className="px-4 py-3 max-w-[260px]">
                                        <span className="font-semibold text-app-text group-hover:text-app-primary transition-colors italic uppercase text-[12px] tracking-tight truncate block">
                                            {t.subject}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${priorityStyle(t.priority)}`}>
                                            {t.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${statusStyle(t.status)}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] text-app-text-muted truncate max-w-[140px] whitespace-nowrap">
                                        {t.user}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-semibold text-app-text leading-tight">{t.created}</span>
                                            <span className="text-[10px] text-app-text-muted font-mono opacity-60">{t.time}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <SLABadge slaDeadline={t.sla_deadline} status={t.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <Link
                                            href={`/tickets/${t.id}`}
                                            className="text-app-primary hover:text-app-text text-[11px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            View →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
