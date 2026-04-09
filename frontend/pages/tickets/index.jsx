import Link from 'next/link';
import { ArrowLeft, Plus, Ticket, CheckCircle, Clock, AlertCircle, Settings, Zap, ChevronUp, Cpu, Activity, X } from 'lucide-react';
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
    const [dashboardMode, setDashboardMode] = useState('external'); 
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
                const ticketResponse = await apiClient.getTickets(0, 100, null, null, isInternal);
                const tickets = ticketResponse.data || [];

                if (!active) return;

                const mappedTickets = tickets.map(t => ({
                    ...t,
                    displayId: t.display_id,
                    user: t.requestor_name,
                    userDept: t.requestor_department,
                    groupDept: t.assignment_group_department,
                    created: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
                }));

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
        if (p === 'High') return 'text-app-rose bg-app-rose/10 border-app-rose/20';
        if (p === 'Medium') return 'text-app-gold bg-app-gold/10 border-app-gold/20';
        return 'text-app-secondary bg-app-secondary/10 border-app-secondary/20';
    };

    return (
        <div className="min-h-screen p-8 bg-app-obsidian text-app-text font-['Space_Grotesk']">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-app-void hover:bg-app-primary hover:text-app-void border border-app-border transition-all shadow-xl active:scale-95 group"
                        >
                            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-app-text uppercase italic tracking-tighter leading-none">Incident <span className="text-app-primary">Stream</span></h1>
                            <p className="text-app-text-muted mt-3 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                                {dashboardMode === 'internal' 
                                    ? 'Sector Internal // Intra-dept Data Packets' 
                                    : 'Global Uplink // Inter-dept Support Vectors'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {(isStaff || isManagerial) && (
                            <>
                                {isManagerial && (
                                    <button
                                        onClick={() => setIsExecutiveHUDOpen(true)}
                                        className="px-4 py-2 rounded-none bg-app-primary/10 text-app-primary border border-app-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-app-primary/20 transition-all flex items-center gap-2 group"
                                    >
                                        <Cpu size={14} className="group-hover:rotate-12 transition-transform" />
                                        Executive HUD
                                    </button>
                                )}
                                <div className="flex bg-app-surface-soft p-1 rounded-none border border-app-border shadow-inner">
                                    <button
                                        onClick={() => setDashboardMode('external')}
                                        className={`px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${dashboardMode === 'external' ? 'bg-app-surface text-app-primary shadow-sm' : 'text-app-text-muted hover:text-app-text'}`}
                                    >
                                        {isManagerial ? 'Incoming' : 'External'}
                                    </button>
                                    <button
                                        onClick={() => setDashboardMode('internal')}
                                        className={`px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${dashboardMode === 'internal' ? 'bg-app-surface text-app-primary shadow-sm' : 'text-app-text-muted hover:text-app-text'}`}
                                    >
                                        {isManagerial ? 'Internal' : 'Team'}
                                    </button>
                                </div>
                            </>
                        )}
                        <Link href="/tickets/new" className="px-6 py-3 bg-app-primary hover:bg-app-text text-app-void rounded-none flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-app-primary/20 transition-all">
                            <Plus size={20} /> New Ticket
                        </Link>
                    </div>
                </div>

                <ExecutiveIntelligenceOverlay 
                    isOpen={isExecutiveHUDOpen} 
                    onClose={() => setIsExecutiveHUDOpen(false)}
                    summary={executiveSummary} 
                />

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/tickets/all?status=Open" className="glass-panel p-6 rounded-none bg-app-surface border border-app-border hover:border-app-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-app-primary/10 text-app-primary">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-app-text leading-none">{stats.open}</div>
                                <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-1">Open Tickets</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/tickets/all?status=Pending" className="glass-panel p-6 rounded-none bg-app-surface border border-app-border hover:border-app-gold/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-app-gold/10 text-app-gold">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-app-text leading-none">{stats.pending}</div>
                                <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-1">Pending Actions</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/tickets/all?status=Closed" className="glass-panel p-6 rounded-none bg-app-surface border border-app-border hover:border-app-secondary/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-app-secondary/10 text-app-secondary">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-app-text leading-none">{stats.closed}</div>
                                <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-1">Closed This Month</div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-8">
                        {/* Category Summary */}
                        <div className="glass-panel p-2 rounded-none bg-app-surface border border-app-border">
                             <div className="p-4 border-b border-app-border">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-app-text opacity-40">Heuristic Category Distribution</h3>
                             </div>
                             <TicketCategorySummary stats={categoryStats} loading={statsLoading} />
                        </div>

                        {/* Recent Activity */}
                        <div className="glass-panel rounded-none bg-app-surface border border-app-border overflow-hidden">
                            <div className="p-6 border-b border-app-border flex justify-between items-center">
                                 <h3 className="font-black text-sm flex items-center gap-2 uppercase tracking-widest text-app-text">
                                    <Ticket size={20} className="text-app-primary" /> Recent Activity
                                </h3>
                                <Link href="/tickets/all" className="text-[10px] font-black text-app-primary uppercase tracking-widest hover:text-app-text transition-colors">View All Tickets</Link>
                            </div>
                            <div className="divide-y divide-white/5">
                                {statsLoading ? (
                                    <div className="p-8 space-y-6">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse flex justify-between items-start">
                                                <div className="space-y-3 flex-1">
                                                    <div className="h-5 bg-app-void rounded-none w-3/4"></div>
                                                    <div className="h-3 bg-app-void rounded-none w-1/2"></div>
                                                </div>
                                                <div className="h-6 bg-app-void rounded-none w-20 ml-6"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : recentTickets.length > 0 ? (
                                    recentTickets.map(ticket => (
                                        <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block group">
                                            <div className="p-6 hover:bg-app-primary/[0.03] transition-all flex justify-between items-start relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-black text-app-text group-hover:text-app-primary uppercase tracking-tight transition-colors italic">{ticket.subject}</div>
                                                    <div className="text-[10px] text-app-text-muted mt-1.5 flex items-center gap-2 font-black uppercase tracking-widest">
                                                        <span className="font-mono text-[9px] opacity-70 border border-app-border px-1 rounded-none bg-app-void">{ticket.displayId}</span>
                                                        <span className="flex items-center gap-1"><Clock size={12} /> {ticket.created}</span>
                                                        <span>•</span>
                                                        <span>{ticket.user}</span>
                                                        <span className="ml-2 px-1.5 py-0.5 bg-app-void border border-app-border rounded-none text-[8px] font-black text-app-primary">
                                                            {ticket.userDept} → {ticket.groupDept}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(ticket.priority)}`}>
                                                        {ticket.priority}
                                                    </span>
                                                    <span className="text-[9px] text-app-text-muted font-black uppercase tracking-widest">{ticket.status}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center py-20 px-8 bg-app-void/40 border border-app-border rounded-none shadow-inner">
                                        <div className="w-20 h-20 bg-app-surface-soft rounded-none flex items-center justify-center mx-auto mb-6 text-app-text-muted border border-app-border shadow-inner">
                                            <Activity size={40} className="opacity-20" />
                                        </div>
                                        <h4 className="text-xl font-black text-app-text-muted uppercase italic tracking-tighter opacity-50 italic">Queues_Zeroed_Out</h4>
                                        <p className="text-[10px] text-app-text-muted mt-2 font-black uppercase tracking-[0.2em] opacity-30">No active incident packets detected for this node.</p>
                                        <Link href="/tickets/new" className="inline-flex items-center gap-3 mt-8 px-6 py-3 bg-app-surface hover:bg-app-rose hover:text-app-void border border-app-border transition-all text-[11px] font-black uppercase tracking-widest active:scale-95">
                                            <Plus size={16} /> Deploy_First_Stream
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="p-6 rounded-none bg-gradient-to-br from-app-primary/10 to-app-secondary/10 border border-app-border relative overflow-hidden group">
                            <div className="kinetic-scan-line" />
                            <h3 className="font-black text-sm uppercase tracking-widest mb-2 text-app-text">Neural Library</h3>
                            <p className="text-[11px] text-app-text-muted uppercase font-black tracking-wider mb-4 leading-relaxed opacity-60">Check the knowledge repository for common asset discrepancies.</p>
                            <button
                                onClick={() => setIsKBSearchOpen(true)}
                                className="w-full py-3 bg-app-void hover:bg-app-primary border border-app-border hover:border-transparent hover:text-app-void rounded-none text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Access Wiki
                            </button>
                        </div>

                         {/* Admin Tools */}
                         {(isStaff || isManagerial) && (
                            <div className="p-6 rounded-none bg-app-surface border border-app-border">
                                <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-app-text">
                                    <Settings size={18} className="text-app-primary" /> Admin Protocols
                                </h3>
                                <div className="space-y-3">
                                    <Link href="/tickets/automation" className="flex items-center justify-between p-3 bg-app-void border border-app-border hover:border-app-primary transition-all text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-3">
                                            <Zap size={16} className="text-app-primary" />
                                            Rule Engine
                                        </div>
                                    </Link>
                                    <Link href="/tickets/sla" className="flex items-center justify-between p-3 bg-app-void border border-app-border hover:border-app-secondary transition-all text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-3">
                                            <Clock size={16} className="text-app-secondary" />
                                            SLA Controller
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KB Modal */}
            {isKBSearchOpen && (
                <div className="fixed inset-0 bg-app-void/90 backdrop-blur-3xl z-150 flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-lg bg-app-obsidian border border-app-border rounded-none p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        <div className="kinetic-scan-line" />
                        <button
                            onClick={() => setIsKBSearchOpen(false)}
                            className="p-3 bg-app-void hover:bg-app-rose border border-app-border hover:text-app-void transition-all absolute top-6 right-6 active:scale-95"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-3xl font-black mb-8 flex items-center gap-4 uppercase italic tracking-tighter text-app-text">
                            <span className="text-app-primary">Neural</span> Wiki
                        </h3>

                        <input
                            type="text"
                            placeholder="Search help articles..."
                            className="w-full bg-app-void border border-app-border rounded-none px-4 py-3 mb-4 text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary/50 text-sm font-black uppercase tracking-widest placeholder:opacity-30"
                            value={kbQuery}
                            onChange={(e) => setKbQuery(e.target.value)}
                        />

                        {selectedArticle ? (
                            <div className="animate-in fade-in slide-in-from-right-6 duration-500 space-y-6">
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="text-[9px] font-black text-app-primary hover:text-app-text flex items-center gap-2 uppercase tracking-widest transition-colors mb-2"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                                <div>
                                    <h4 className="font-black text-2xl text-app-text uppercase italic tracking-tight">{selectedArticle.title}</h4>
                                    <span className="text-[10px] text-app-rose font-black uppercase tracking-[0.3em] mt-2 block border-l-2 border-app-rose pl-3">{selectedArticle.category}</span>
                                </div>
                                <div className="text-app-text-muted text-[11px] leading-relaxed uppercase font-black tracking-wider opacity-60 whitespace-pre-line border-t border-app-border/30 pt-6">
                                    {selectedArticle.content}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                {filteredArticles.map(article => (
                                    <div
                                        key={article.id}
                                        className="p-5 bg-app-void border border-app-border hover:border-app-primary/30 transition-all cursor-pointer group relative"
                                        onClick={() => setSelectedArticle(article)}
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <h4 className="font-black text-[12px] uppercase tracking-tight text-app-text group-hover:text-app-primary transition-colors italic">{article.title}</h4>
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-[9px] text-app-text-muted uppercase tracking-widest font-black opacity-30">{article.category}</span>
                                            <span className="text-[8px] font-black text-app-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Access_Packet</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
