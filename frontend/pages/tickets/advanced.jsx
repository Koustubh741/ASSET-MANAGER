import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { formatId, copyToClipboard, getClassificationTag } from '@/lib/idHelper';
import SmartIdGuideModal from '@/components/SmartIdGuideModal';
import { useRouter } from 'next/router';
import { useToast } from '@/components/common/Toast';
import {
    Ticket,
    Filter,
    Search,
    ArrowLeft,
    Clock,
    AlertCircle,
    CheckCircle,
    User,
    MoreHorizontal,
    LayoutGrid,
    List,
    Zap,
    Shield,
    Activity,
    ChevronRight,
    MessageSquare,
    Paperclip,
    ExternalLink,
    Info
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import {
    Layout,
    Card,
    Tag,
    Button,
    Input,
    Select,
    Badge,
    Empty,
    Spin,
    Tooltip,
    Avatar,
    Divider,
    Space
} from 'antd';

const { Content, Sider } = Layout;

export default function AdvancedTicketsPage() {
    const router = useRouter();
    const toast = useToast();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        status: 'ALL',
        priority: 'ALL',
        category: 'ALL'
    });

    // Stats
    const [stats, setStats] = useState({
        open: 0,
        unassigned: 0,
        overdue: 0,
        highPriority: 0
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const ticketResponse = await apiClient.getTickets(0, 500);
            const data = ticketResponse.data || [];

            // Derive stats
            const s = {
                open: data.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status?.toUpperCase())).length,
                unassigned: data.filter(t => !t.assigned_to_id).length,
                highPriority: data.filter(t => t.priority?.toUpperCase() === 'HIGH').length,
                overdue: data.filter(t => t.urgency === 'High' && t.status === 'OPEN').length // Mock logic for overdue
            };
            setStats(s);

            // Filter data locally for now (backend update planned)
            let filtered = data;
            if (filters.status !== 'ALL') {
                filtered = filtered.filter(t => t.status?.toUpperCase() === filters.status);
            }
            if (filters.priority !== 'ALL') {
                filtered = filtered.filter(t => t.priority?.toUpperCase() === filters.priority);
            }

            setTickets(filtered);
        } catch (err) {
            console.error("Failed to load advanced tickets:", err);
        } finally {
            setLoading(false);
        }
    };

    const acknowledgeTicket = async (ticketId) => {
        try {
            await apiClient.acknowledgeTicket(ticketId);
            toast.success("Ticket acknowledged successfully!");
            loadData(); // Refresh the list
            // Update selected ticket if it's the one we just acknowledged
            if (selectedTicket && selectedTicket.id === ticketId) {
                const ticketResponse = await apiClient.getTickets(0, 500); // Simple refresh
                const updatedTickets = ticketResponse.data || [];
                const updated = updatedTickets.find(t => t.id === ticketId);
                if (updated) setSelectedTicket(updated);
            }
        } catch (err) {
            toast.error("Failed to acknowledge ticket: " + err.message);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'HIGH': return 'rose';
            case 'MEDIUM': return 'gold';
            case 'LOW': return 'secondary';
            default: return 'muted';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'primary';
            case 'IN_PROGRESS': return 'gold';
            case 'RESOLVED': return 'secondary';
            case 'CLOSED': return 'muted';
            default: return 'muted';
        }
    };

    return (
        <Layout className="min-h-screen bg-app-bg font-['Inter'] transition-colors duration-300">
            <Head>
                <title>Advanced Ops | Scylla Ticket Center</title>
            </Head>

            {/* --- TOP METRICS BAR --- */}
            <div className="bg-app-surface/40 border-b border-app-border px-8 py-5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-2xl transition-all duration-500">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/it_support')}
                        className="group p-2.5 bg-app-surface-soft hover:bg-app-primary rounded-none text-app-text-muted hover:text-app-void transition-all shadow-sm border border-app-border"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Space_Grotesk']">
                                Ticket Ops <span className="text-app-primary italic">Center</span>
                            </h1>
                            <Tooltip title="View Smart ID Guide">
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    className="w-6 h-6 flex items-center justify-center bg-app-primary/10 hover:bg-app-primary/20 text-app-primary rounded-none border border-app-primary/30 transition-all shadow-sm"
                                >
                                    <Info size={12} />
                                </button>
                            </Tooltip>
                        </div>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-app-secondary rounded-none animate-pulse shadow-[0_0_8px_var(--color-kinetic-secondary-glow)]"></span>
                            Real-time Fleet Intelligence
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {[
                        { label: 'Active', value: stats.open, color: 'text-app-primary', glow: 'shadow-[0_0_20px_var(--color-kinetic-primary-glow)]', icon: Ticket },
                        { label: 'Unassigned', value: stats.unassigned, color: 'text-app-gold', glow: 'shadow-[0_0_20px_var(--color-kinetic-gold-glow)]', icon: User },
                        { label: 'High Priority', value: stats.highPriority, color: 'text-app-rose', glow: 'shadow-[0_0_20px_var(--color-kinetic-rose-glow)]', icon: AlertCircle },
                        { label: 'SLA Breach', value: stats.overdue, color: 'text-app-rose', glow: 'shadow-[0_0_20px_var(--color-kinetic-rose-glow)]', icon: Clock }
                    ].map((stat, i) => (
                        <div className={`flex items-center gap-4 px-5 py-2.5 bg-app-surface border border-app-border rounded-none ${stat.glow} transition-all hover:translate-y-[-2px]`}>
                            <div className={`p-2 rounded-none bg-app-void border border-app-border ${stat.color}`}>
                                <stat.icon size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-lg font-black leading-none ${stat.color}`}>{stat.value}</span>
                                <span className="text-[9px] text-app-text-muted font-black uppercase tracking-widest mt-1">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Layout className="bg-transparent">
                {/* --- LEFT SIDEBAR (FILTERS) --- */}
                <Sider width={300} className="bg-app-surface border-r border-app-border p-8 space-y-10 custom-scrollbar overflow-y-auto" style={{ background: 'transparent' }}>
                    <div>
                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] block mb-4">Neural Query</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-app-primary transition-all duration-300" size={16} />
                            <input
                                type="text"
                                placeholder="ID, User, Subject..."
                                className="w-full bg-app-void border border-app-border rounded-none py-3.5 pl-12 pr-4 text-sm text-app-text focus:outline-none focus:border-app-primary focus:ring-8 focus:ring-app-primary/5 transition-all placeholder:text-app-text-muted dark:placeholder:text-slate-700 font-medium font-['Inter']"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <Divider className="border-app-border !my-8" />

                    <div className="space-y-10">
                        <div>
                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] block mb-5">Lifecycle Status</label>
                            <div className="grid grid-cols-1 gap-2">
                                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFilters(f => ({ ...f, status: s }))}
                                        className={`group relative flex items-center justify-between px-5 py-3 rounded-none text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 border ${filters.status === s
                                            ? 'bg-app-primary border-app-primary text-app-void shadow-xl shadow-app-primary/20 translate-x-1'
                                            : 'bg-app-void text-app-text-muted hover:text-app-text border-app-border hover:border-app-primary/30'}`}
                                    >
                                        <span>{s.replace('_', ' ')}</span>
                                        {filters.status === s && <Activity size={14} className="animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] block mb-5">Neural Priority</label>
                            <div className="flex flex-wrap gap-2.5">
                                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => {
                                    const isP1 = p === 'HIGH';
                                    const isSelected = filters.priority === p;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setFilters(f => ({ ...f, priority: p }))}
                                            className={`px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${isSelected
                                                ? (isP1 ? 'bg-app-rose border-app-rose text-app-void shadow-lg shadow-app-rose/20' : 'bg-app-primary border-app-primary text-app-void shadow-lg shadow-app-primary/20')
                                                : 'bg-app-void border-app-border text-app-text-muted hover:border-app-text'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-10">
                        <div className="relative p-6 rounded-none bg-app-primary/5 border border-app-primary/10 overflow-hidden group">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-app-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative flex flex-col items-center text-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-app-secondary/20 blur-xl rounded-none animate-pulse"></div>
                                    <div className="w-16 h-16 bg-app-void rounded-none flex items-center justify-center border border-app-border shadow-xl relative text-app-secondary">
                                        <Activity size={32} className="heartbeat" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-app-text uppercase tracking-tight font-['Space_Grotesk']">System Health</h4>
                                    <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center justify-center gap-2">
                                        Node: <span className="text-app-primary">SCYLLA-01</span>
                                    </p>
                                </div>
                                <div className="mt-2 py-1 px-3 bg-app-secondary/10 rounded-none border border-app-secondary/20 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-app-secondary rounded-none animate-ping"></span>
                                    <span className="text-[8px] font-black text-app-secondary uppercase tracking-widest">Active Sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Sider>

                {/* --- MAIN CONTENT AREA --- */}
                <Content className="p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                    <div className="flex justify-between items-end mb-12">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
                                <div className="relative p-4 bg-app-surface-soft rounded-none border border-app-border text-app-primary shadow-xl">
                                    <LayoutGrid size={28} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Space_Grotesk']">Operational Grid</h2>
                                <p className="text-xs text-app-text-muted font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-app-primary/10 text-app-primary rounded-none text-[9px] border border-app-primary/30">LATEST SYNC</span>
                                    Displaying {tickets.length} synchronized instances
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center bg-app-surface p-1.5 rounded-none border border-app-border shadow-2xl backdrop-blur-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2.5 rounded-none transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-app-primary text-app-void shadow-xl shadow-app-primary/30' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                                <LayoutGrid size={16} />
                                <span>Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2.5 rounded-none transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${viewMode === 'list' ? 'bg-app-primary text-app-void shadow-xl shadow-app-primary/30' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                                <List size={16} />
                                <span>List</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 opacity-50">
                            <Spin size="large" />
                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest animate-pulse">Syncing Tactical Data...</span>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="h-[60vh] flex items-center justify-center">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={<span className="text-app-text-muted font-bold uppercase tracking-widest text-xs">No matching incidents found</span>}
                            />
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
                            {tickets
                                .filter(t => t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || t.id?.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(ticket => (
                                    <Card
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`!bg-app-surface !border-app-border hover:!border-app-primary/50 transition-all duration-500 cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] hover:-translate-y-2 rounded-none
                                        ${selectedTicket?.id === ticket.id ? '!border-app-primary !bg-app-primary/5 !ring-4 !ring-app-primary/10' : ''}`}
                                        styles={{ body: { padding: '32px' } }}
                                    >
                                        {/* Status Glow Overlay */}
                                        <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-none opacity-20 group-hover:opacity-40 transition-opacity duration-700
                                            ${ticket.priority?.toUpperCase() === 'HIGH' ? 'bg-app-rose' : 'bg-app-primary'}`}></div>

                                        <div className="flex justify-between items-start mb-8 relative">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-2.5 py-1 rounded-none text-[9px] font-black uppercase tracking-widest border transition-all duration-300
                                                    ${ticket.priority?.toUpperCase() === 'HIGH'
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.1)] animate-pulse'
                                                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                                                    {ticket.priority || 'MEDIUM'}
                                                </div>
                                                <div className="px-2.5 py-1 rounded-none bg-app-surface-soft border border-app-border text-[9px] font-black text-app-text-muted uppercase tracking-widest italic font-mono">
                                                    {getClassificationTag(ticket)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Tooltip title={`Full ID: ${ticket.id} - Click to copy`}>
                                                    <span
                                                        className="text-[10px] text-app-text-muted font-mono font-bold hover:text-app-primary transition-colors cursor-help"
                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(ticket.id, 'Ticket ID'); }}
                                                    >
                                                        {formatId(ticket.id, 'ticket', ticket)}
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-app-text mb-3 line-clamp-2 leading-tight group-hover:text-app-primary transition-colors font-['Space_Grotesk']">
                                            {ticket.subject}
                                        </h3>
                                        <p className="text-sm text-app-text-muted line-clamp-2 mb-8 font-medium leading-relaxed font-['Inter']">
                                            {ticket.description || 'No additional diagnostic payload provided.'}
                                        </p>

                                        <div className="flex items-center justify-between pt-8 border-t border-app-border mt-auto relative">
                                            <div className="flex items-center gap-4">
                                                <div className="relative group/avatar">
                                                    <div className="absolute inset-0 bg-app-primary/20 blur-lg rounded-none opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                                                    <Avatar
                                                        size={42}
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${ticket.requestor_name}`}
                                                        className="bg-app-void border-2 border-app-border shadow-md p-0.5 rounded-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-app-text leading-none">{ticket.requestor_name || 'System'}</div>
                                                    <div className="text-[10px] font-black text-app-primary/60 uppercase tracking-[0.2em] mt-1.5 font-mono">
                                                        {ticket.requestor_department || 'OPS'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest shadow-sm border
                                                ${ticket.status?.toUpperCase() === 'OPEN' ? 'bg-app-primary/10 border-app-primary/20 text-app-primary' :
                                                    ticket.status?.toUpperCase() === 'IN_PROGRESS' ? 'bg-app-gold/10 border-app-gold/20 text-app-gold shadow-[0_0_10px_var(--color-kinetic-gold-glow)]' :
                                                        'bg-app-secondary/10 border-app-secondary/20 text-app-secondary'}`}>
                                                {ticket.status}
                                            </div>
                                        </div>

                                        {/* Interaction Hover Shield */}
                                        <div className="absolute inset-0 border-[3px] border-app-primary/0 group-hover:border-app-primary/10 rounded-none transition-all duration-700 pointer-events-none"></div>
                                    </Card>
                                ))}
                        </div>
                    )}
                </Content>

                {/* --- RIGHT SIDEBAR (PREVIEW) --- */}
                {selectedTicket && (
                    <Sider width={400} className="bg-app-surface border-l border-app-border p-8 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-500 shadow-2xl dark:shadow-none" style={{ background: 'transparent' }}>
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black text-app-text tracking-tight uppercase">Incident Preview</h3>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="p-2 hover:bg-app-surface-soft rounded-none text-app-text-muted hover:text-app-text transition-all shadow-sm"
                            >
                                <ArrowLeft size={18} className="rotate-180" />
                            </button>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Identity Matrix</label>
                                <div className="flex items-center gap-4 bg-app-void p-5 rounded-none border border-app-border shadow-sm">
                                    <Avatar size={54} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTicket.requestor_name}`} className="border-2 border-app-border" />
                                    <div>
                                        <h4 className="text-lg font-bold text-app-text leading-tight">{selectedTicket.requestor_name}</h4>
                                        <p
                                            className="text-xs text-app-primary font-medium cursor-help hover:underline decoration-app-primary/30"
                                            onClick={() => copyToClipboard(selectedTicket.requestor_id, 'Requester ID')}
                                            title={`UUID: ${selectedTicket.requestor_id} - Click to copy`}
                                        >
                                            {formatId(selectedTicket.requestor_id, 'user')} • {selectedTicket.requestor_email}
                                        </p>
                                        <div className="mt-2 text-[9px] text-app-text-muted font-black uppercase tracking-widest">{selectedTicket.requestor_department || 'General Operations'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-3">Diagnostic Log</label>
                                    <div className="bg-app-void p-6 rounded-none border border-app-border text-sm text-app-text-muted leading-relaxed italic shadow-sm">
                                        "{selectedTicket.description || 'No detailed diagnostic payload available for this incident.'}"
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-app-void rounded-none border border-app-border shadow-sm">
                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest block mb-2">Created</span>
                                        <span className="text-xs font-bold text-app-text-muted">{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div
                                        className="p-5 bg-app-void rounded-none border border-app-border shadow-sm cursor-help group/id"
                                        onClick={() => selectedTicket.assigned_to_id && copyToClipboard(selectedTicket.assigned_to_id, 'Solver ID')}
                                        title={selectedTicket.assigned_to_id ? `UUID: ${selectedTicket.assigned_to_id} - Click to copy` : 'Unallocated'}
                                    >
                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest block mb-2">Assigned To</span>
                                        <span className="text-xs font-bold text-app-primary">
                                            {selectedTicket.assigned_to_name ? (
                                                <span className="flex flex-col">
                                                    <span>{selectedTicket.assigned_to_name}</span>
                                                    <span className="text-[10px] opacity-70 font-mono tracking-tight">{formatId(selectedTicket.assigned_to_id, 'solver')}</span>
                                                </span>
                                            ) : 'UNALLOCATED'}
                                        </span>
                                    </div>
                                    <div
                                        className="p-5 bg-app-void rounded-none border border-app-border shadow-sm cursor-help group/id"
                                        onClick={() => selectedTicket.related_asset_id && copyToClipboard(selectedTicket.related_asset_id, 'Asset ID')}
                                        title={selectedTicket.related_asset_id ? `UUID: ${selectedTicket.related_asset_id} - Click to copy` : 'No Asset Linked'}
                                    >
                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest block mb-2">Impacted Asset</span>
                                        <span className="text-xs font-bold text-app-secondary">
                                            {selectedTicket.related_asset_id ? (
                                                <span className="flex flex-col">
                                                    <span>{selectedTicket.related_asset_name || 'HARDWARE DEVICE'}</span>
                                                    <span className="text-[10px] opacity-70 font-mono tracking-tight">{formatId(selectedTicket.related_asset_id, 'asset')}</span>
                                                </span>
                                            ) : 'NULL'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 space-y-3">
                                <Button
                                    block
                                    className="!h-14 !bg-app-primary !border-none !text-app-void !font-black !text-xs !uppercase !tracking-[0.2em] !rounded-none shadow-xl shadow-app-primary/20 hover:!bg-app-text transition-all flex items-center justify-center gap-2"
                                    onClick={() => router.push(`/tickets/${selectedTicket.id}`)}
                                >
                                    Open Full Analysis <ChevronRight size={16} />
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        className="!h-12 !bg-app-surface-soft !border-app-border !text-app-text-muted !font-bold !text-[10px] !uppercase !tracking-widest !rounded-none hover:!bg-app-primary hover:!text-app-void shadow-sm"
                                        onClick={() => acknowledgeTicket(selectedTicket.id)}
                                        disabled={selectedTicket.status?.toUpperCase() !== 'OPEN'}
                                    >
                                        Acknowledge
                                    </Button>
                                    <Button className="!h-12 !bg-app-surface-soft !border-app-border !text-app-text-muted !font-bold !text-[10px] !uppercase !tracking-widest !rounded-none hover:!text-app-rose hover:!bg-app-rose/10 hover:!border-app-rose/30 shadow-sm">
                                        Escalate
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Sider>
                )}

                <SmartIdGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            </Layout>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
                
                body {
                    font-family: 'Inter', sans-serif;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--color-kinetic-primary-rgb), 0.1);
                    border-radius: 0px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--color-kinetic-primary-rgb), 0.3);
                }

                .heartbeat {
                    animation: heartbeat 2s ease-in-out infinite;
                }

                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    14% { transform: scale(1.15); }
                    28% { transform: scale(1); }
                    42% { transform: scale(1.15); }
                    70% { transform: scale(1); }
                }

                .ant-layout-sider-trigger {
                    background: var(--bg-app-void) !important;
                    border-top: 1px solid var(--border-soft);
                    color: var(--text-muted) !important;
                }
                .ant-tag {
                    border-radius: 0px !important;
                    padding: 2px 8px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    font-size: 10px !important;
                }
                .ant-badge-status-text {
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.1em !important;
                    font-size: 10px !important;
                }
            `}</style>
        </Layout>
    );
}
