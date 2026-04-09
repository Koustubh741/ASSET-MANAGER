import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Activity, ArrowRight, Clock, MapPin, User, FileText, Check, MoreHorizontal,
    ChevronRight, Eye, Ticket, Search, Info, RefreshCw, TrendingUp, Zap, Plus,
    Box, ShieldCheck, Terminal, AlertCircle, X, CheckCircle
} from 'lucide-react';
import {
    Layout, Typography, Divider, ConfigProvider
} from 'antd';
import apiClient from '@/lib/apiClient';
import { formatId } from '@/lib/idHelper';
import { useToast } from '@/components/common/Toast';
import { useAssetContext } from '@/contexts/AssetContext';
import { useRole } from '@/contexts/RoleContext';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';
import QuickActionGrid from './QuickActionGrid';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SupportPortalDashboard() {
    const toast = useToast();
    const { user } = useRole();
    const { tickets, refreshData } = useAssetContext();

    // Tickets assigned to ME
    const myTickets = tickets.filter(t => t.assigned_to_id === user?.id && (t.status?.toUpperCase() === 'OPEN' || t.status?.toUpperCase() === 'IN_PROGRESS'));
    const unassignedTickets = tickets.filter(t => !t.assigned_to_id && t.status?.toUpperCase() === 'OPEN');
    const myResolvedTickets = tickets.filter(t => t.assigned_to_id === user?.id && (t.status?.toUpperCase() === 'RESOLVED' || t.status?.toUpperCase() === 'CLOSED'));

    // Group unassigned tickets by category
    const unassignedTicketsByCategory = useMemo(() => {
        const groups = {};
        unassignedTickets.forEach(ticket => {
            const cat = ticket.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(ticket);
        });
        return groups;
    }, [unassignedTickets]);

    const [activeModal, setActiveModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [claimingTicketId, setClaimingTicketId] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const openResolveModal = (ticket) => {
        setSelectedItem(ticket);
        setActiveModal('RESOLVE_TICKET');
    };

    const acknowledgeTicket = async (ticketId) => {
        setClaimingTicketId(ticketId);
        await new Promise(r => setTimeout(r, 800));
        try {
            await apiClient.updateTicket(ticketId, { 
                assigned_to_id: user.id,
                status: 'IN_PROGRESS'
            });
            await refreshData();
            toast.success("AGENCY_SYNC // TICKET_CLAIMED");
        } catch (error) {
            toast.error("Handover failed. Check secure channel.");
        } finally {
            setClaimingTicketId(null);
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4f46e5',
                    borderRadius: 12,
                    fontFamily: 'Outfit, Inter, sans-serif',
                },
            }}
        >
            <Layout className="min-h-screen bg-app-bg overflow-hidden relative selection:bg-rose-500/30">
                {/* Background effects */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-600/10 blur-[180px] rounded-full"></div>
                </div>

                <Content className="relative z-10 p-6 lg:p-8 max-w-[2400px] mx-auto neural-compact">
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative">
                        <div className="relative group">
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-gradient-to-b from-rose-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.6)]"></div>
                            <div className="space-y-4">
                                <Text className="text-[11px] font-black text-rose-500 uppercase tracking-[0.6em] flex items-center gap-4 ml-1">
                                    <span className="w-10 h-px bg-rose-500/30"></span> 
                                    {user?.department || 'Unified'} Support Portal
                                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-xs lowercase italic tracking-normal">v4.0.0-gold</span>
                                </Text>
                                <Title level={1} className="text-app-text text-4xl xl:text-5xl font-black m-0 tracking-tighter leading-none font-['Outfit'] uppercase flex flex-col xl:flex-row xl:items-baseline gap-3">
                                    {user?.department || 'Service'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-rose-400 animate-gradient-x px-2 italic font-['Playfair_Display'] capitalize tracking-normal">Support Hub</span>
                                </Title>
                                <div className="flex items-center gap-6 pt-2">
                                    <div className="px-5 py-2.5 bg-app-surface-soft border border-app-border rounded-none flex items-center gap-3 backdrop-blur-xl group-hover:border-rose-500/30 transition-all duration-500 shadow-2xl">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 absolute shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.4em]">Agency Link: ACTIVE</span>
                                    </div>
                                    <span className="text-app-text-muted text-[11px] font-black uppercase tracking-[0.3em] opacity-50 px-4 py-2 bg-app-surface-soft rounded-none border border-app-border backdrop-blur-sm">NODE: {user?.full_name?.toUpperCase() || 'AGENT'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full lg:w-[520px] group">
                            <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none z-10 transition-transform group-focus-within:scale-110">
                                <Search size={26} className="text-app-text-muted group-hover:text-rose-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Departmental Records..."
                                className="w-full h-24 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 border-app-border rounded-[3rem] pl-20 pr-10 text-app-text text-lg font-black placeholder:text-slate-800 focus:outline-none focus:border-rose-500/50 transition-all shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </header>

                    <ActionsNeededBanner
                        title="Service Readiness"
                        items={[
                            { label: 'My Pipeline', count: myTickets.length, onClick: () => setActiveModal('MY_TICKETS'), icon: Ticket, variant: 'primary' },
                            { label: 'Unassigned', count: unassignedTickets.length, onClick: () => setActiveModal('TICKETS'), icon: Terminal, variant: 'warning' },
                        ]}
                    />

                    <Divider className="my-6 border-slate-300 border-app-border" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Resolved Tickets', value: myResolvedTickets.length, color: 'indigo', icon: ShieldCheck, trend: 'Week Total', detail: 'SLA Compliant' },
                            { label: 'Active Work', value: myTickets.length, color: 'rose', icon: Activity, trend: 'Action Needed', detail: 'Current Focus' },
                            { label: 'Pending Queue', value: unassignedTickets.length, color: 'emerald', icon: RefreshCw, trend: 'Wait List', detail: 'Team Backlog' },
                            { label: 'Avg Feedback', value: '4.8', color: 'sky', icon: Zap, trend: 'Excellence', detail: 'User Sentiment' }
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className={`glass-card p-5 border-t-2 transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden rounded-none
                                    border-${stat.color}-500/50 shadow-md hover:shadow-${stat.color}-500/20`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="space-y-1">
                                        <Text className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] block">{stat.label}</Text>
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{stat.detail}</Text>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md transition-all duration-500
                                        bg-${stat.color}-500/10 text-${stat.color}-500 border-${stat.color}-500/20`}>
                                        {stat.trend}
                                    </div>
                                </div>
                                <div className="flex items-end justify-between relative z-10">
                                    <span className={`text-4xl font-['Outfit'] font-black text-app-text group-hover:text-${stat.color}-500 transition-all duration-500`}>
                                        {stat.value || 0}
                                    </span>
                                    <div className={`p-2.5 rounded-none bg-app-surface-soft border border-app-border group-hover:border-${stat.color}-500/40 group-hover:bg-${stat.color}-500/10`}>
                                        <stat.icon size={18} className={`text-app-text-muted group-hover:text-${stat.color}-400 transition-all duration-500`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <QuickActionGrid />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-8">
                        <div className="lg:col-span-8 glass-panel p-6 border border-app-border relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-['Outfit'] font-black text-app-text uppercase tracking-tighter">My Active Pipeline</h3>
                                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-1">Operational High Priority Alpha</p>
                                    </div>
                                </div>
                                <span className="px-4 py-2 bg-indigo-500/10 text-indigo-500 text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                                    {myTickets.length} ACTIVE
                                </span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {myTickets.slice(0, 5).map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-app-border hover:border-indigo-500/40 transition-all duration-500 rounded-none group/ticket cursor-pointer shadow-sm relative overflow-hidden" 
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-3 h-3 rounded-full ${ticket.priority === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse' : 'bg-orange-500'}`}></div>
                                            <div>
                                                <h4 className="text-sm font-black text-app-text group-hover/ticket:text-indigo-400 transition-colors uppercase tracking-tight">{ticket.subject}</h4>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{formatId(ticket.id, 'ticket', ticket)}</span>
                                                    <span className="h-3 w-px bg-app-surface"></span>
                                                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-tighter">
                                                        {ticket.category || 'SUPPORT_QUEST'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => openResolveModal(ticket)} className="px-5 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-none transition-all shadow-md active:scale-95">GO</button>
                                    </div>
                                ))}
                                {myTickets.length === 0 && (
                                    <div className="text-center py-20 border border-dashed border-app-border bg-slate-50 dark:bg-white/[0.01]">
                                        <ShieldCheck size={40} className="text-slate-400 mx-auto mb-4 opacity-20" />
                                        <p className="text-app-text-muted font-black uppercase tracking-[0.5em] text-[10px]">Queue Clear // Scanning for anomalous transmissions...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-4 glass-panel p-6 border border-app-border">
                            <h3 className="text-lg font-black text-app-text uppercase tracking-tighter mb-6 flex items-center gap-3">
                                <MapPin size={20} className="text-rose-500" /> Agency Insights
                            </h3>
                            <div className="space-y-6">
                                <div className="p-6 bg-rose-500/5 border border-rose-500/20">
                                    <Title level={4} className="!m-0 text-app-text font-black uppercase tracking-tighter">98.4%</Title>
                                    <Text className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.4em] block mt-2 leading-none">Internal_SLA_Rating</Text>
                                </div>
                                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20">
                                    <Title level={4} className="!m-0 text-app-text font-black uppercase tracking-tighter">14</Title>
                                    <Text className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.4em] block mt-2 leading-none">Global_Agents_Active</Text>
                                </div>
                                <div className="p-6 border border-app-border">
                                    <Text className="text-[11px] font-black text-app-text uppercase tracking-widest block mb-4">Live Performance Monitor</Text>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Onboarding', value: 85 },
                                            { label: 'Incident Resolve', value: 92 },
                                            { label: 'Response Latency', value: 78 }
                                        ].map((p, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                    <span className="text-app-text-muted">{p.label}</span>
                                                    <span className="text-rose-500">{p.value}%</span>
                                                </div>
                                                <div className="h-1 bg-app-surface-soft overflow-hidden">
                                                    <div className="h-full bg-rose-500" style={{ width: `${p.value}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 glass-panel p-8 border border-app-border relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h3 className="text-2xl font-black text-app-text uppercase tracking-tighter flex items-center gap-4 m-0 leading-none">
                                    <Zap size={28} className="text-rose-500" /> Shared Registry Queue
                                </h3>
                                <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-4 ml-[2.5rem] border-l-2 border-rose-500/30 pl-4">Unclaimed Sector Incident Logs</p>
                            </div>
                            <span className="px-6 py-3 bg-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-widest border border-rose-500/20 shadow-lg">
                                {unassignedTickets.length} UNCLAIMED
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {unassignedTickets.map((ticket, index) => (
                                <div 
                                    key={ticket.id} 
                                    className="p-5 bg-white dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-app-border hover:border-rose-500/30 transition-all duration-300 rounded-none group/ticket cursor-pointer shadow-sm flex flex-col relative overflow-hidden" 
                                    onClick={() => !claimingTicketId && acknowledgeTicket(ticket.id)}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${ticket.priority === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-orange-500/40'}`}></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider border ${ticket.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                            PRIORITY_{ticket.priority.toUpperCase()}
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{formatId(ticket.id, 'ticket', ticket)}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-app-text group-hover/ticket:text-rose-500 transition-colors uppercase tracking-tight mb-6 line-clamp-2">{ticket.subject}</h4>
                                    
                                    <div className="mt-auto pt-6 border-t border-app-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-none bg-indigo-500 flex items-center justify-center font-black text-white text-xs">
                                                {ticket.requestor_name?.charAt(0) || 'U'}
                                            </div>
                                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{ticket.requestor_name || 'ANON'}</span>
                                        </div>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black uppercase tracking-widest text-[9px] border border-rose-500/20 transition-all">
                                            {claimingTicketId === ticket.id ? 'SYNCING...' : 'CLAIM'} <Zap size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {unassignedTickets.length === 0 && (
                                <div className="col-span-full text-center py-20 border border-dashed border-app-border">
                                    <p className="text-app-text-muted font-black uppercase tracking-widest text-xs">No incidents awaiting assignment in this sector.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Content>
            </Layout>
        </ConfigProvider>
    );
}
