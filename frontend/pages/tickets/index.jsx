import Link from 'next/link';
import { ArrowLeft, Plus, Ticket, CheckCircle, Clock, AlertCircle, Settings, Zap, ChevronUp, Cpu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import TicketCategorySummary from '@/components/tickets/TicketCategorySummary';
import TicketExecutiveBrief from '@/components/tickets/TicketExecutiveBrief';
import DepartmentalTicketLoad from '@/components/tickets/DepartmentalTicketLoad';
import ExecutiveIntelligenceOverlay from '@/components/tickets/ExecutiveIntelligenceOverlay';
import { useRole } from '@/contexts/RoleContext';

export default function TicketsDashboard() {
    const router = useRouter();
    const { user, isManagerial, isITStaff, isStaff } = useRole();
    const [stats, setStats] = useState({ open: 0, pending: 0, closed: 0 });
    const [recentTickets, setRecentTickets] = useState([]);
    const [categoryStats, setCategoryStats] = useState([]);
    const [executiveSummary, setExecutiveSummary] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isExecutiveHUDOpen, setIsExecutiveHUDOpen] = useState(false);
    const [dashboardMode, setDashboardMode] = useState('external'); // 'external' (Inter-dept) or 'internal' (Dept)
    const [isKBSearchOpen, setIsKBSearchOpen] = useState(false);
    const [kbQuery, setKbQuery] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);

    const kbArticles = [
        { id: 1, title: 'How to request a new laptop', category: 'Hardware', content: 'To request a new laptop, please submit a ticket with the subject "Hardware Request". Include your department and reason for the upgrade. Approval from your manager is required.' },
        { id: 2, title: 'VPN connection issues', category: 'Network', content: 'If you are unable to connect to the VPN, try restarting your router. If the issue persists, check if your credentials are expired. Contact IT support if you see Error 800.' },
        { id: 3, title: 'Resetting your password', category: 'Account', content: 'Go to the IDM portal and click "Forgot Password". You will receive an OTP on your registered mobile number. Follow the instructions to set a new secure password.' },
        { id: 4, title: 'Software license request process', category: 'Software', content: 'All paid software requires a license. Check the "Approved Software List" first. If listed, raise a "Software License" ticket. If new software, a security audit is needed first.' },
        { id: 5, title: 'Printer troubleshooting guide', category: 'Hardware', content: '1. Check if printer is ON.\n2. Ensure paper tray is full.\n3. Restart the printer.\n4. Clear any paper jams.\nIf these steps fail, log a ticket with the printer model number.' },
    ];

    const filteredArticles = kbArticles.filter(a => a.title.toLowerCase().includes(kbQuery.toLowerCase()));

    useEffect(() => {
        let active = true;

        const loadTickets = async () => {
            setStatsLoading(true);
            try {
                const isInternal = dashboardMode === 'internal';
                const tickets = await apiClient.getTickets(0, 100, null, null, isInternal);

                if (!active) return;

                // Map API tickets to frontend format using sanitized backend fields
                const mappedTickets = tickets.map(t => ({
                    ...t,
                    displayId: t.display_id,
                    user: t.requestor_name,
                    userDept: t.requestor_department,
                    groupDept: t.assignment_group_department,
                    created: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
                }));

                // Calc Stats
                const counts = {
                    open: mappedTickets.filter(t => t.status?.toUpperCase() === 'OPEN' || t.status?.toUpperCase() === 'IN_PROGRESS').length,
                    pending: mappedTickets.filter(t => t.status?.toUpperCase() === 'PENDING').length,
                    closed: mappedTickets.filter(t => t.status?.toUpperCase() === 'CLOSED' || t.status?.toUpperCase() === 'RESOLVED').length
                };
                setStats(counts);
                setRecentTickets(mappedTickets.slice(0, 5)); 
            } catch (error) {
                console.error('Failed to load tickets:', error);
                if (active) {
                    setStats({ open: 0, pending: 0, closed: 0 });
                    setRecentTickets([]);
                }
            } finally {
                if (active) setStatsLoading(false);
            }
        };

        const loadCategoryStats = async () => {
            try {
                const isInternal = dashboardMode === 'internal';
                const data = await apiClient.getTicketStatsByCategory(30, isInternal);
                if (active) setCategoryStats(data.stats || []);
            } catch (error) {
                console.error('Failed to load category stats:', error);
            }
        };

        const loadExecutiveSummary = async (days = 30) => {
            if (!isManagerial && !isITStaff) return;
            try {
                const data = await apiClient.getTicketExecutiveSummary(days);
                if (active) setExecutiveSummary(data);
            } catch (error) {
                console.error('Failed to load executive summary:', error);
            }
        };

        loadTickets();
        loadCategoryStats();
        loadExecutiveSummary();

        return () => {
            active = false;
        };
    }, [dashboardMode, isManagerial, isITStaff]);

    const getPriorityColor = (p) => {
        if (p === 'High') return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (p === 'Medium') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    };

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <style jsx global>{`
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(1000%); }
                }
                .animate-scanline {
                    animation: scanline 8s linear infinite;
                }
            `}</style>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface hover:bg-slate-100 text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent">
                                {dashboardMode === 'internal' 
                                    ? (isManagerial ? `🏠 ${user?.department || 'Departmental'} Queue` : '🏠 Team Mode')
                                    : (isManagerial ? '🌐 Dept. Service Requests' : '🌐 Support Mode')}
                            </h1>
                            <p className="text-app-text-muted mt-1">
                                {dashboardMode === 'internal' 
                                    ? 'Internal team tasks and departmental issues' 
                                    : 'Service requests from other departments'}
                            </p>
                        </div>
                    </div>

                    {/* Dashboard Switcher - Hidden for End Users, Renamed for Managers */}
                    {(isStaff || isManagerial) && (
                        <div className="flex items-center gap-4">
                            {isManagerial && (
                                <button
                                    onClick={() => setIsExecutiveHUDOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 group"
                                >
                                    <Cpu size={14} className="group-hover:rotate-12 transition-transform" />
                                    Executive HUD
                                </button>
                            )}
                            <div className="flex bg-slate-200 bg-app-surface-soft p-1 rounded-xl border border-slate-300 border-app-border shadow-inner">
                                <button
                                    onClick={() => setDashboardMode('external')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dashboardMode === 'external' ? 'bg-white bg-app-surface text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                                >
                                    {isManagerial ? 'Incoming Requests' : 'Support Mode'}
                                </button>
                                <button
                                    onClick={() => setDashboardMode('internal')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dashboardMode === 'internal' ? 'bg-white bg-app-surface text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                                >
                                    {isManagerial ? 'Internal Team' : 'Team Mode'}
                                </button>
                            </div>
                        </div>
                    )}
                    <Link href="/tickets/new" className="btn btn-primary bg-rose-600 hover:bg-rose-500 text-app-text px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-rose-500/20">
                        <Plus size={20} /> New Ticket
                    </Link>
                </div>

                <ExecutiveIntelligenceOverlay 
                    isOpen={isExecutiveHUDOpen} 
                    onClose={() => setIsExecutiveHUDOpen(false)}
                    summary={executiveSummary} 
                />

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/tickets/all?status=Open" className="glass-panel p-6 rounded-2xl bg-app-surface-soft border border-app-border hover:border-rose-500/30 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.open}</div>
                                <div className="text-sm text-app-text-muted">Open Tickets</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/tickets/all?status=Pending" className="glass-panel p-6 rounded-2xl bg-app-surface-soft border border-app-border hover:border-orange-500/30 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface hover:bg-slate-100 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.pending}</div>
                                <div className="text-sm text-app-text-muted text-app-text-muted">Pending Actions</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/tickets/all?status=Closed" className="glass-panel p-6 rounded-2xl bg-app-surface-soft border border-app-border hover:border-emerald-500/30 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface hover:bg-slate-100 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.closed}</div>
                                <div className="text-sm text-app-text-muted">Closed This Month</div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Operational Excellence - Executive View */}
                {isManagerial && executiveSummary && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-1000">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter">
                                🛡️ Operational Excellence
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <TicketExecutiveBrief summary={executiveSummary} />
                            </div>
                            <div>
                                <DepartmentalTicketLoad load={executiveSummary.departmental_load} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Summary */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-app-text flex items-center gap-2 text-rose-400">
                            Summary by Category
                        </h2>
                    </div>
                    <TicketCategorySummary stats={categoryStats} loading={statsLoading} />
                </div>

                {/* Recent Tickets Section */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* List */}
                    <div className="flex-1 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-app-border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-app-border flex justify-between items-center">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Ticket size={20} className="text-app-text-muted" /> Recent Activity
                            </h3>
                            <Link href="/tickets/all" className="text-sm text-blue-400 hover:text-blue-300">View All Tickets</Link>
                        </div>
                        <div className="divide-y divide-white/5">
                            {statsLoading ? (
                                <div className="p-4 space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex justify-between items-start">
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                                            </div>
                                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-4"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : recentTickets.length > 0 ? recentTickets.map(ticket => (
                                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block p-4 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-50 transition-colors group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-slate-200 group-hover:text-rose-400 transition-colors">{ticket.subject}</div>
                                            <div className="text-sm text-app-text-muted text-app-text-muted mt-1 flex items-center gap-2">
                                                <span className="font-mono text-xs opacity-70 border border-app-border px-1 rounded bg-app-surface-soft">{ticket.displayId}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Clock size={12} /> {ticket.created}</span>
                                                <span>•</span>
                                                <span>{ticket.user}</span>
                                                <span className="ml-2 px-1.5 py-0.5 bg-app-surface-soft rounded text-[10px] font-bold text-slate-400">
                                                    {ticket.userDept} → {ticket.groupDept}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className="text-xs text-app-text-muted">{ticket.status}</span>
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-app-surface-soft rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Ticket size={32} />
                                    </div>
                                    <h4 className="text-app-text font-bold uppercase tracking-tight">Queues are clear</h4>
                                    <p className="text-sm text-app-text-muted mt-1">No recent ticket activity found for your profile.</p>
                                    <Link href="/tickets/new" className="inline-flex items-center gap-2 mt-6 text-xs font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors">
                                        <Plus size={14} /> Open First Ticket
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions / Knowledge Base Mock */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-900/20 to-purple-900/20 border border-app-border">
                            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                            <p className="text-sm text-app-text-muted mb-4">Check the knowledge base for common asset issues before raising a ticket.</p>
                            <button
                                onClick={() => setIsKBSearchOpen(true)}
                                className="w-full py-2 bg-app-surface hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
                            >
                                Search Knowledge Base
                            </button>
                        </div>

                        {/* Admin Tools - Hidden for End Users */}
                        {(isStaff || isManagerial) && (
                            <div className="p-6 rounded-2xl bg-app-surface-soft border border-app-border">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Settings size={18} className="text-indigo-400" /> Administrative Tools
                                </h3>
                                <div className="space-y-3">
                                    <Link 
                                        href="/tickets/automation" 
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-200 bg-app-surface-soft hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Zap size={16} className="text-indigo-400" />
                                            <span className="text-xs font-semibold">Rule Editor</span>
                                        </div>
                                        <ChevronUp size={14} className="rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                    <Link 
                                        href="/tickets/sla" 
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-200 bg-app-surface-soft hover:bg-emerald-600/10 border border-transparent hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Clock size={16} className="text-emerald-400" />
                                            <span className="text-xs font-semibold">SLA Manager</span>
                                        </div>
                                        <ChevronUp size={14} className="rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KB Modal */}
            {
                isKBSearchOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-app-border rounded-2xl p-6 shadow-2xl relative">
                            <button
                                onClick={() => setIsKBSearchOpen(false)}
                                className="absolute top-4 right-4 text-app-text-muted hover:text-app-text"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>

                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><Ticket size={20} /></div>
                                Knowledge Base
                            </h3>

                            <input
                                type="text"
                                placeholder="Search help articles..."
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 mb-4 text-app-text focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                value={kbQuery}
                                onChange={(e) => setKbQuery(e.target.value)}
                                autoFocus
                            />

                            {selectedArticle ? (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <button
                                        onClick={() => setSelectedArticle(null)}
                                        className="text-sm text-app-text-muted hover:text-app-text flex items-center gap-1 mb-4"
                                    >
                                        <ArrowLeft size={16} /> Back to search
                                    </button>
                                    <h4 className="font-bold text-xl text-app-text mb-2">{selectedArticle.title}</h4>
                                    <span className="text-xs text-rose-400 font-mono mb-4 block">{selectedArticle.category}</span>
                                    <div className="text-app-text-muted text-sm leading-relaxed whitespace-pre-line">
                                        {selectedArticle.content}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {filteredArticles.map(article => (
                                        <div
                                            key={article.id}
                                            className="p-3 rounded-xl bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-colors cursor-pointer group"
                                            onClick={() => setSelectedArticle(article)}
                                        >
                                            <h4 className="font-medium text-slate-900 dark:text-slate-200 group-hover:text-rose-300">{article.title}</h4>
                                            <span className="text-xs text-app-text-muted uppercase tracking-wider">{article.category}</span>
                                        </div>
                                    ))}
                                    {filteredArticles.length === 0 && (
                                        <div className="text-center text-app-text-muted py-8">
                                            No articles found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}
