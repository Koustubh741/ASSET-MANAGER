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
            const data = await apiClient.getTickets(0, 500);

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
                const updatedTickets = await apiClient.getTickets(0, 500); // Simple refresh
                const updated = updatedTickets.find(t => t.id === ticketId);
                if (updated) setSelectedTicket(updated);
            }
        } catch (err) {
            toast.error("Failed to acknowledge ticket: " + err.message);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'HIGH': return 'volcano';
            case 'MEDIUM': return 'orange';
            case 'LOW': return 'blue';
            default: return 'default';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'processing';
            case 'IN_PROGRESS': return 'warning';
            case 'RESOLVED': return 'success';
            case 'CLOSED': return 'default';
            default: return 'default';
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
                        className="group p-2.5 bg-app-surface-soft hover:bg-indigo-600 dark:hover:bg-indigo-600 rounded-2xl text-app-text-muted hover:text-app-text transition-all shadow-sm border border-app-border"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Outfit']">
                                Ticket Ops <span className="text-indigo-600 dark:text-indigo-500 italic">Center</span>
                            </h1>
                            <Tooltip title="View Smart ID Guide">
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    className="w-6 h-6 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-500/30 transition-all shadow-sm"
                                >
                                    <Info size={12} />
                                </button>
                            </Tooltip>
                        </div>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            Real-time Fleet Intelligence
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {[
                        { label: 'Active', value: stats.open, color: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-[0_0_20px_rgba(79,70,229,0.15)]', icon: Ticket },
                        { label: 'Unassigned', value: stats.unassigned, color: 'text-amber-600 dark:text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]', icon: User },
                        { label: 'High Priority', value: stats.highPriority, color: 'text-rose-600 dark:text-rose-400', glow: 'shadow-[0_0_20px_rgba(225,29,72,0.15)]', icon: AlertCircle },
                        { label: 'SLA Breach', value: stats.overdue, color: 'text-rose-700 dark:text-rose-500', glow: 'shadow-[0_0_20px_rgba(225,29,72,0.25)]', icon: Clock }
                    ].map((stat, i) => (
                        <div key={i} className={`flex items-center gap-4 px-5 py-2.5 bg-white/50 dark:bg-white/[0.03] border border-app-border rounded-2xl ${stat.glow} transition-all hover:translate-y-[-2px]`}>
                            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 border-app-border ${stat.color}`}>
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
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted dark:text-slate-600 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-all duration-300" size={16} />
                            <input
                                type="text"
                                placeholder="ID, User, Subject..."
                                className="w-full bg-slate-100 dark:bg-white/[0.02] border border-app-border rounded-2xl py-3.5 pl-12 pr-4 text-sm text-app-text focus:outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/[0.05] transition-all placeholder:text-app-text-muted dark:placeholder:text-slate-700 font-medium font-['Inter']"
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
                                        className={`group relative flex items-center justify-between px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 border ${filters.status === s
                                            ? 'bg-indigo-600 border-indigo-500 text-white text-app-text shadow-xl shadow-indigo-600/20 translate-x-1'
                                            : 'bg-slate-50 dark:bg-white/[0.02] text-app-text-muted hover:text-slate-900 dark:hover:text-white border-app-border hover:border-indigo-500/30'}`}
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
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${isSelected
                                                ? (isP1 ? 'bg-rose-600 border-rose-500 text-white text-app-text shadow-lg shadow-rose-600/20' : 'bg-indigo-600 border-indigo-500 text-white text-app-text shadow-lg shadow-indigo-600/20')
                                                : 'bg-white dark:bg-white/[0.02] border-app-border text-app-text-muted hover:border-slate-400 dark:hover:border-slate-300'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-10">
                        <div className="relative p-6 rounded-[2.5rem] bg-indigo-600/[0.02] dark:bg-indigo-500/[0.02] border border-indigo-500/10 dark:border-indigo-500/20 overflow-hidden group">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative flex flex-col items-center text-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center border border-slate-100 border-app-border shadow-xl relative text-emerald-500">
                                        <Activity size={32} className="heartbeat" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 text-app-text uppercase tracking-tight font-['Outfit']">System Health</h4>
                                    <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center justify-center gap-2">
                                        Node: <span className="text-indigo-600 dark:text-indigo-400">SCYLLA-01</span>
                                    </p>
                                </div>
                                <div className="mt-2 py-1 px-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Active Sync</span>
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
                                <div className="relative p-4 bg-white bg-app-surface-soft rounded-[2rem] border border-app-border text-indigo-600 dark:text-indigo-400 shadow-xl">
                                    <LayoutGrid size={28} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Outfit']">Operational Grid</h2>
                                <p className="text-xs text-app-text-muted font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] border border-indigo-200 dark:border-indigo-500/30">LATEST SYNC</span>
                                    Displaying {tickets.length} synchronized instances
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center bg-white dark:bg-white/[0.03] p-1.5 rounded-2xl border border-app-border shadow-2xl backdrop-blur-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-indigo-600 text-white text-app-text shadow-xl shadow-indigo-600/30' : 'text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <LayoutGrid size={16} />
                                <span>Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${viewMode === 'list' ? 'bg-indigo-600 text-white text-app-text shadow-xl shadow-indigo-600/30' : 'text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
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
                                        className={`!bg-app-surface !border-slate-200 dark:!border-app-border hover:!border-indigo-500/50 transition-all duration-500 cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-2 rounded-[2rem]
                                        ${selectedTicket?.id === ticket.id ? '!border-indigo-500 !bg-indigo-500/5 !ring-4 !ring-indigo-500/10' : ''}`}
                                        styles={{ body: { padding: '32px' } }}
                                    >
                                        {/* Status Glow Overlay */}
                                        <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-700
                                            ${ticket.priority?.toUpperCase() === 'HIGH' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>

                                        <div className="flex justify-between items-start mb-8 relative">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-300
                                                    ${ticket.priority?.toUpperCase() === 'HIGH'
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.1)] animate-pulse'
                                                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                                                    {ticket.priority || 'MEDIUM'}
                                                </div>
                                                <div className="px-2.5 py-1 rounded-lg bg-app-surface-soft border border-app-border text-[9px] font-black text-app-text-muted uppercase tracking-widest italic font-['Outfit']">
                                                    {getClassificationTag(ticket)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Tooltip title={`Full ID: ${ticket.id} - Click to copy`}>
                                                    <span
                                                        className="text-[10px] text-app-text-muted dark:text-slate-600 font-mono font-bold hover:text-indigo-400 transition-colors cursor-help"
                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(ticket.id, 'Ticket ID'); }}
                                                    >
                                                        {formatId(ticket.id, 'ticket', ticket)}
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-app-text mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-['Outfit']">
                                            {ticket.subject}
                                        </h3>
                                        <p className="text-sm text-app-text-muted line-clamp-2 mb-8 font-medium leading-relaxed font-['Inter']">
                                            {ticket.description || 'No additional diagnostic payload provided.'}
                                        </p>

                                        <div className="flex items-center justify-between pt-8 border-t border-slate-100 border-app-border mt-auto relative">
                                            <div className="flex items-center gap-4">
                                                <div className="relative group/avatar">
                                                    <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                                                    <Avatar
                                                        size={42}
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${ticket.requestor_name}`}
                                                        className="bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-md p-0.5"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-none">{ticket.requestor_name || 'System'}</div>
                                                    <div className="text-[10px] font-black text-indigo-500/60 dark:text-indigo-400/40 uppercase tracking-[0.2em] mt-1.5 font-['Outfit']">
                                                        {ticket.requestor_department || 'OPS'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border
                                                ${ticket.status?.toUpperCase() === 'OPEN' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                                                    ticket.status?.toUpperCase() === 'IN_PROGRESS' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' :
                                                        'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                                {ticket.status}
                                            </div>
                                        </div>

                                        {/* Interaction Hover Shield */}
                                        <div className="absolute inset-0 border-[3px] border-indigo-600/0 group-hover:border-indigo-600/10 rounded-[2rem] transition-all duration-700 pointer-events-none"></div>
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
                                className="p-2 hover:bg-slate-100 dark:hover:bg-app-surface-soft rounded-xl text-app-text-muted hover:text-slate-900 dark:hover:text-app-text transition-all shadow-sm dark:shadow-none"
                            >
                                <ArrowLeft size={18} className="rotate-180" />
                            </button>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Identity Matrix</label>
                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/[0.02] p-5 rounded-[2rem] border border-app-border shadow-sm dark:shadow-none">
                                    <Avatar size={54} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTicket.requestor_name}`} className="border-2 border-slate-200 dark:border-indigo-500/20" />
                                    <div>
                                        <h4 className="text-lg font-bold text-app-text leading-tight">{selectedTicket.requestor_name}</h4>
                                        <p
                                            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium cursor-help hover:underline decoration-indigo-400/30"
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
                                    <div className="bg-slate-50 dark:bg-white/[0.03] p-6 rounded-[2rem] border border-app-border text-sm text-app-text-muted leading-relaxed italic shadow-sm dark:shadow-inner">
                                        "{selectedTicket.description || 'No detailed diagnostic payload available for this incident.'}"
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white dark:bg-white/[0.01] rounded-3xl border border-slate-100 border-app-border shadow-sm dark:shadow-none">
                                        <span className="text-[9px] font-black text-app-text-muted dark:text-slate-600 uppercase tracking-widest block mb-2">Created</span>
                                        <span className="text-xs font-bold text-app-text-muted">{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div
                                        className="p-5 bg-white dark:bg-white/[0.01] rounded-3xl border border-slate-100 border-app-border shadow-sm dark:shadow-none cursor-help group/id"
                                        onClick={() => selectedTicket.assigned_to_id && copyToClipboard(selectedTicket.assigned_to_id, 'Solver ID')}
                                        title={selectedTicket.assigned_to_id ? `UUID: ${selectedTicket.assigned_to_id} - Click to copy` : 'Unallocated'}
                                    >
                                        <span className="text-[9px] font-black text-app-text-muted dark:text-slate-600 uppercase tracking-widest block mb-2">Assigned To</span>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {selectedTicket.assigned_to_name ? (
                                                <span className="flex flex-col">
                                                    <span>{selectedTicket.assigned_to_name}</span>
                                                    <span className="text-[10px] opacity-70 font-mono tracking-tight">{formatId(selectedTicket.assigned_to_id, 'solver')}</span>
                                                </span>
                                            ) : 'UNALLOCATED'}
                                        </span>
                                    </div>
                                    <div
                                        className="p-5 bg-white dark:bg-white/[0.01] rounded-3xl border border-slate-100 border-app-border shadow-sm dark:shadow-none cursor-help group/id"
                                        onClick={() => selectedTicket.related_asset_id && copyToClipboard(selectedTicket.related_asset_id, 'Asset ID')}
                                        title={selectedTicket.related_asset_id ? `UUID: ${selectedTicket.related_asset_id} - Click to copy` : 'No Asset Linked'}
                                    >
                                        <span className="text-[9px] font-black text-app-text-muted dark:text-slate-600 uppercase tracking-widest block mb-2">Impacted Asset</span>
                                        <span className="text-xs font-bold text-blue-500 dark:text-blue-400">
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
                                    className="!h-14 !bg-indigo-600 !border-none !text-app-text !font-black !text-xs !uppercase !tracking-[0.2em] !rounded-2xl shadow-xl shadow-indigo-600/20 hover:!bg-indigo-500 transition-all flex items-center justify-center gap-2"
                                    onClick={() => router.push(`/tickets/${selectedTicket.id}`)}
                                >
                                    Open Full Analysis <ChevronRight size={16} />
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        className="!h-12 !bg-slate-100 dark:!bg-app-surface-soft !border-slate-200 dark:!border-slate-300 border-app-border !text-app-text-muted dark:!text-app-text-muted !font-bold !text-[10px] !uppercase !tracking-widest !rounded-2xl hover:!text-slate-900 dark:hover:!text-app-text hover:!bg-slate-200 dark:hover:!bg-app-surface shadow-sm dark:shadow-none"
                                        onClick={() => acknowledgeTicket(selectedTicket.id)}
                                        disabled={selectedTicket.status?.toUpperCase() !== 'OPEN'}
                                    >
                                        Acknowledge
                                    </Button>
                                    <Button className="!h-12 !bg-slate-100 dark:!bg-app-surface-soft !border-slate-200 dark:!border-slate-300 border-app-border !text-app-text-muted dark:!text-app-text-muted !font-bold !text-[10px] !uppercase !tracking-widest !rounded-2xl hover:!text-rose-600 dark:hover:!text-rose-400 hover:!bg-rose-600/10 dark:hover:!bg-rose-500/10 hover:!border-rose-300 dark:hover:!border-rose-500/30 shadow-sm dark:shadow-none">
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
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                
                body {
                    font-family: 'Inter', sans-serif;
                }

                .font-outfit {
                    font-family: 'Outfit', sans-serif;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.2);
                    border-radius: 10px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.3);
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
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

                .pulse-glow {
                    animation: pulse-glow 3s infinite;
                }

                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.2); }
                    70% { box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
                }
                
                // Ant Design Overrides
                .ant-layout-sider-trigger {
                    background: #F8FAFC !important;
                    border-top: 1px solid #E2E8F0;
                    color: #64748B !important;
                }
                :global(.dark) .ant-layout-sider-trigger {
                    background: #0D1117 !important;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    color: #94A3B8 !important;
                }
                .ant-tag {
                    border-radius: 6px;
                    padding: 2px 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 10px;
                }
                .ant-badge-status-text {
                    font-weight: 900 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 10px !important;
                }
            `}</style>
        </Layout>
    );
}
