import { useState, useEffect } from 'react';
import { 
    Ticket, 
    CheckCircle, 
    Clock, 
    AlertTriangle, 
    Filter,
    Search,
    ChevronRight,
    MessageSquare,
    User,
    ArrowUpRight
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
// import Layout from '@/components/Layout';
import { useRole } from '@/contexts/RoleContext';

export default function SupportDashboard() {
    const { user, isManagerial } = useRole();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadTickets();
    }, [filter]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            // ROOT FIX: Use standardized getTickets with size=0 for full queue visibility
            // getTickets(skip, limit, department, search, isInternal)
            const resp = await apiClient.getTickets(0, 0, user?.department, null, null);
            const rawTickets = resp.data || [];
            
            // Apply client-side status filtering if needed (backend doesn't support it yet)
            const statusFiltered = filter !== 'ALL' 
                ? rawTickets.filter(t => t.status?.toUpperCase() === filter.toUpperCase())
                : rawTickets;
                
            setTickets(statusFiltered);
        } catch (error) {
            console.error('Failed to load tickets:', error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'ACKNOWLEDGED': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'ASSIGNED': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'IN_PROGRESS': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            case 'RESOLVED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const filteredTickets = tickets.filter(t => 
        t.subject.toLowerCase().includes(search.toLowerCase()) || 
        t.display_id?.toLowerCase().includes(search.toLowerCase())
    );

    return (
            <div className="min-h-screen p-8 bg-app-bg text-app-text transition-colors duration-500">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <div className="p-3 bg-primary/20 text-primary rounded-none">
                                    <Ticket size={28} />
                                </div>
                                {user?.department || 'Department'} Queue
                            </h1>
                            <p className="text-app-text-muted">Manage incoming service requests and inter-departmental tickets.</p>
                        </div>
                        
                        <div className="flex bg-app-surface p-1 rounded-none border border-white/5 shadow-inner">
                            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-6 py-2 rounded-none text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-app-text-muted hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search & Stats Bar */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 relative group">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by ticket ID or subject..."
                                className="w-full bg-app-surface border border-white/10 rounded-none pl-12 pr-6 py-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button className="flex-1 p-4 rounded-none bg-app-surface border border-white/10 flex items-center justify-center gap-2 font-bold hover:bg-white/5 transition-colors">
                                <Filter size={18} /> Filters
                            </button>
                        </div>
                    </div>

                    {/* Ticket List */}
                    <div className="glass-panel rounded-none bg-app-surface border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-app-text-muted">ID & Subject</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-app-text-muted">Requester</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-app-text-muted">Status</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-app-text-muted">Priority</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-app-text-muted">Last Update</th>
                                        <th className="px-6 py-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        [1,2,3,4,5].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={6} className="px-6 py-8">
                                                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                                        <tr key={ticket.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => (window.location.href = `/tickets/${ticket.id}`)}>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black font-mono text-primary/80 uppercase tracking-tighter">{ticket.display_id}</span>
                                                    <span className="font-bold group-hover:text-primary transition-colors">{ticket.subject}</span>
                                                    <span className="text-xs text-app-text-muted">{ticket.subcategory || 'General Request'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-app-text-muted">
                                                        <User size={14} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold">{ticket.requestor_name}</span>
                                                        <span className="text-[10px] uppercase text-app-text-muted">{ticket.requestor_department}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest border ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-sm">
                                                {ticket.priority}
                                            </td>
                                            <td className="px-6 py-5 text-xs text-app-text-muted">
                                                {ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button className="p-2 rounded-none hover:bg-white/10 transition-colors">
                                                    <ChevronRight size={20} className="text-app-text-muted group-hover:text-white" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="max-w-xs mx-auto space-y-4">
                                                    <div className="w-20 h-20 bg-white/5 rounded-none flex items-center justify-center mx-auto text-app-text-muted">
                                                        <CheckCircle size={40} />
                                                    </div>
                                                    <h3 className="text-xl font-bold">Queue is clear!</h3>
                                                    <p className="text-app-text-muted text-sm">No tickets found matching your current filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Analytics Footer (Teaser) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-none bg-app-surface border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-app-text-muted">Avg. Response Time</h4>
                                <ArrowUpRight size={16} className="text-emerald-500" />
                            </div>
                            <div className="text-3xl font-black">2.4h</div>
                            <div className="text-xs text-emerald-500 font-bold">↑ 12% improvement</div>
                        </div>
                        <div className="p-6 rounded-none bg-app-surface border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-app-text-muted">SLA Compliance</h4>
                                <ArrowUpRight size={16} className="text-emerald-500" />
                            </div>
                            <div className="text-3xl font-black">94.2%</div>
                            <div className="text-xs text-emerald-500 font-bold">Target: 90%</div>
                        </div>
                        <div className="p-6 rounded-none bg-app-surface border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-app-text-muted">Open Conversations</h4>
                                <MessageSquare size={16} className="text-blue-500" />
                            </div>
                            <div className="text-3xl font-black">{tickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
                            <div className="text-xs text-app-text-muted font-bold">Active discussions</div>
                        </div>
                    </div>
                </div>
            </div>
    );
}
