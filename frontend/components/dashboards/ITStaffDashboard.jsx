import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Wrench, ShieldCheck, Terminal, AlertCircle, X, CheckCircle, Play, Server, Lock,
    Activity, ArrowRight, Trash2, Clock, MapPin, User, FileText, Check, MoreHorizontal,
    Printer, ChevronRight, Eye, Ticket, Search, Info, RefreshCw, TrendingUp, Zap, Plus,
    Box
} from 'lucide-react';
import {
    Layout, Card, Typography, Table, Tag, Button, Progress, Timeline,
    Input, Space, Badge, Avatar, Divider, ConfigProvider, theme
} from 'antd';
import apiClient from '@/lib/apiClient';
import { formatId } from '@/lib/idHelper';
import { useToast } from '@/components/common/Toast';
import { useAssetContext, ASSET_STATUS } from '@/contexts/AssetContext';
import { useRole } from '@/contexts/RoleContext';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';
const { Content } = Layout;
const { Title, Text } = Typography;

// Helper Component for Manual Install Items
const SoftwareInstallItem = ({ app, assetId }) => {
    const [status, setStatus] = useState('pending');

    const handleInstall = async () => {
        setStatus('installing');
        try {
            await apiClient.provisionSoftware(assetId, app);
            setStatus('installed');
        } catch (e) {
            console.error("Manual provision failed:", e);
            setStatus('pending');
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-app-surface-soft rounded-none border border-slate-300 border-app-border group hover:bg-app-surface transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none text-app-text-muted border border-app-border shadow-sm group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                    <Server size={14} />
                </div>
                <span className="text-sm text-app-text font-black uppercase tracking-tight">{app}</span>
            </div>
            {status === 'pending' && (
                <button
                    onClick={handleInstall}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-app-text px-4 py-1.5 rounded-none shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all font-black uppercase tracking-widest"
                >
                    Install
                </button>
            )}
            {status === 'installing' && (
                <span className="text-xs text-indigo-400 flex items-center gap-2 font-black uppercase tracking-widest">
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    Pushing
                </span>
            )}
            {status === 'installed' && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-none flex items-center gap-1.5 border border-emerald-500/20 font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <Check size={12} /> Live
                </span>
            )}
        </div>
    );
};

export default function ITStaffDashboard() {
    const toast = useToast();
    const { user } = useRole();
    const { assets, updateAssetStatus, tickets, refreshData } = useAssetContext();

    const safeAssets = Array.isArray(assets) ? assets : [];
    const pendingQueue = safeAssets.filter(a => (a?.status === ASSET_STATUS.ALLOCATED || a?.status === ASSET_STATUS.CONFIGURING || a?.status === ASSET_STATUS.PENDING));
    const deployedArgs = safeAssets.filter(a => (a?.status === ASSET_STATUS.READY_FOR_DEPLOYMENT));

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

    // Stockroom Stats
    const stockroomAssets = safeAssets.filter(a => a.status === ASSET_STATUS.IN_STOCK || a.status === ASSET_STATUS.AVAILABLE || a.status === 'STOCK' || a.status === 'STORED');

    const [activeModal, setActiveModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [configStep, setConfigStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const [resolutionNotes, setResolutionNotes] = useState('');
    const [activeChecklist, setActiveChecklist] = useState([]);
    const [newItemText, setNewItemText] = useState('');
    const [claimingTicketId, setClaimingTicketId] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let active = true;
        if (searchQuery && (activeModal === 'TICKETS' || activeModal === 'MY_TICKETS')) {
            setIsSearching(true);
        } else {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        const fetchResults = async () => {
            try {
                const ticketResponse = await apiClient.getTickets(0, 100, null, searchQuery);
                const results = ticketResponse.data || [];
                if (active) {
                    setSearchResults(results.map(t => ({
                        ...t,
                        status: (t.status || '').toUpperCase()
                    })));
                    setIsSearching(false);
                }
            } catch (e) {
                if (active) setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchResults, 400);
        return () => { active = false; clearTimeout(timer); };
    }, [searchQuery, activeModal]);

    const startConfig = (item) => {
        setSelectedItem(item);
        setConfigStep(1);
        setActiveModal('CONFIG');
    };

    const handleConfigStepComplete = () => {
        if (configStep < 5) {
            setConfigStep(prev => prev + 1);
        } else {
            updateAssetStatus(selectedItem.id, ASSET_STATUS.READY_FOR_DEPLOYMENT);
            setActiveModal(null);
            setSelectedItem(null);
        }
    };

    const handleHandover = (item) => {
        toast.success(`Handover protocol initiated for ${item.assignedUser}. Signature requested.`);
        updateAssetStatus(item.id, ASSET_STATUS.IN_USE);
    };

    const openResolveModal = (ticket) => {
        setSelectedItem(ticket);
        setResolutionNotes(ticket.resolution_notes || '');
        setActiveChecklist(ticket.resolution_checklist || []);
        setActiveModal('RESOLVE_TICKET');
    };

    const acknowledgeTicket = async (ticketId) => {
        setClaimingTicketId(ticketId);
        // Simulate a protocol initiation delay for visual impact
        await new Promise(r => setTimeout(r, 800));
        try {
            await apiClient.updateTicket(ticketId, { 
                assigned_to_id: user.id,
                status: 'IN_PROGRESS'
            });
            await refreshData(); // Assuming refreshData also fetches tickets
            toast.success("MISSION_ACCEPTED // PROTOCOL_V4 ACTIVE");
        } catch (error) {
            toast.error("Handover failed. Check secure channel.");
        } finally {
            setClaimingTicketId(null);
        }
    };

    const toggleChecklistItem = (index) => {
        const updated = [...activeChecklist];
        updated[index].checked = !updated[index].checked;
        setActiveChecklist(updated);
    };

    const addChecklistItem = () => {
        if (!newItemText?.trim()) return;
        setActiveChecklist([...activeChecklist, { text: newItemText.trim(), checked: false }]);
        setNewItemText('');
    };

    const removeChecklistItem = (index) => {
        const updated = activeChecklist.filter((_, i) => i !== index);
        setActiveChecklist(updated);
    };

    const submitResolution = async () => {
        if (!resolutionNotes) {
            toast.error("Please enter troubleshooting notes.");
            return;
        }
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        const percentage = total > 0 ? (checked / total) * 100 : 100.0;

        try {
            await apiClient.resolveTicket(selectedItem.id, resolutionNotes, activeChecklist, percentage);
            await refreshData();
            toast.success("Incident resolved!");
            setActiveModal(null);
        } catch (e) {
            toast.error("Resolution failed: " + e.message);
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
                {/* --- ADVANCED BACKGROUND ENGINE --- */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse duration-[8s]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-600/10 blur-[180px] rounded-full animate-pulse reverse duration-[12s]"></div>
                    <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-emerald-600/5 blur-[120px] rounded-full animate-bounce duration-[20s]"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150"></div>
                </div>

                <Content className="relative z-10 p-6 lg:p-8 max-w-[2400px] mx-auto neural-compact">
                    {/* --- DYNAMIC HEADER --- */}
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative">
                        <div className="relative group">
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-gradient-to-b from-rose-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.6)] group-hover:h-24 transition-all duration-700"></div>
                            <div className="space-y-4">
                                <Text className="text-[11px] font-black text-rose-500 uppercase tracking-[0.6em] flex items-center gap-4 ml-1">
                                    <span className="w-10 h-px bg-rose-500/30"></span> 
                                    Technician Workbench 
                                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-xs lowercase italic tracking-normal">v4.0.0-gold</span>
                                </Text>
                                <Title level={1} className="text-app-text text-4xl xl:text-5xl font-black m-0 tracking-tighter leading-none font-['Outfit'] uppercase flex flex-col xl:flex-row xl:items-baseline gap-3 drop-shadow-2xl">
                                    Operator <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-rose-400 animate-gradient-x px-2 italic font-['Playfair_Display'] capitalize tracking-normal">Hub</span>
                                </Title>
                                <div className="flex items-center gap-6 pt-2">
                                    <div className="px-5 py-2.5 bg-app-surface-soft border border-slate-300 border-app-border rounded-none flex items-center gap-3 backdrop-blur-xl group-hover:border-rose-500/30 transition-all duration-500 shadow-2xl">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 absolute shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.4em]">System Linkage: Optimized</span>
                                    </div>
                                    <span className="text-app-text-muted text-[11px] font-black uppercase tracking-[0.3em] opacity-50 px-4 py-2 bg-app-surface-soft rounded-none border border-app-border backdrop-blur-sm">NODE: {user?.full_name?.split(' ')[0].toUpperCase()} // SECURE_KEY: {user?.id?.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full lg:w-[520px] group">
                            <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none z-10 transition-transform group-focus-within:scale-110">
                                <Search size={26} className="text-app-text-muted group-hover:text-rose-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Execute Universal Search Command..."
                                className="w-full h-24 bg-slate-50 dark:bg-white/[0.02] border border-slate-300 border-app-border rounded-[3rem] pl-20 pr-10 text-app-text text-lg font-black placeholder:text-slate-800 focus:outline-none focus:border-rose-500/50 focus:ring-[20px] focus:ring-rose-500/5 focus:bg-white/[0.04] backdrop-blur-3xl transition-all shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] group-hover:border-app-border-soft"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </header>

                    <ActionsNeededBanner
                        title="Mission Readiness Overview"
                        items={[
                            { label: 'My Queue', count: myTickets.length, onClick: () => setActiveModal('MY_TICKETS'), icon: Ticket, variant: 'primary' },
                            { label: 'Unassigned', count: unassignedTickets.length, onClick: () => setActiveModal('TICKETS'), icon: Terminal, variant: 'warning' },
                            { label: 'Deployment', count: deployedArgs.length, onClick: () => setActiveModal('DEPLOY'), icon: CheckCircle, variant: 'success' },
                        ]}
                    />

                    <Divider className="my-6 border-slate-300 border-app-border" />

                    {/* --- PREMIUM METRIC GRID --- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Monthly Resolved', value: myResolvedTickets.length, color: 'indigo', icon: ShieldCheck, trend: '+3 This Week', detail: 'Peak Performance' },
                            { label: 'Active Focus', value: myTickets.length, color: 'rose', icon: Activity, trend: 'Action Required', detail: 'Current Workload' },
                            { label: 'Deploy Ready', value: deployedArgs.length, color: 'emerald', icon: CheckCircle, trend: 'Optimal Flow', detail: 'Hardware Stock' },
                            { label: 'Global Backlog', value: unassignedTickets.length, color: 'sky', icon: Server, trend: 'Open Work', detail: 'Shared Queue' }
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className={`glass-card p-5 cursor-pointer border-t-2 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden rounded-none
                                    ${stat.color === 'indigo' ? 'border-indigo-500/50 shadow-md hover:shadow-indigo-500/20' :
                                        stat.color === 'rose' ? 'border-rose-500/50 shadow-md hover:shadow-rose-500/20' :
                                            stat.color === 'emerald' ? 'border-emerald-500/50 shadow-md hover:shadow-emerald-500/20' : 'border-sky-500/50 shadow-md hover:shadow-sky-500/20'}`}
                            >
                                {/* Immersive Background Layer */}
                                <div className={`absolute -right-20 -top-20 w-64 h-64 bg-${stat.color}-500 opacity-0 blur-[100px] group-hover:opacity-20 transition-all duration-1000 group-hover:scale-150 rounded-full`}></div>
                                <div className={`absolute -left-20 -bottom-20 w-64 h-64 bg-${stat.color}-400 opacity-0 blur-[100px] group-hover:opacity-10 transition-all duration-1000 group-hover:scale-150 rounded-full`}></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="space-y-2">
                                        <Text className="text-sm font-bold text-app-text-muted uppercase tracking-widest block">{stat.label}</Text>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full bg-${stat.color}-500 shadow-lg shadow-${stat.color}-500/30`}></div>
                                            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide italic">{stat.detail}</Text>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-all duration-500
                                        ${stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                                            stat.color === 'rose' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>
                                        <TrendingUp size={12} />
                                        {stat.trend}
                                    </div>
                                </div>
                                <div className="flex items-end justify-between relative z-10">
                                    <div className="flex flex-col">
                                        <span className={`text-4xl font-['Outfit'] font-black text-app-text group-hover:text-${stat.color}-500 dark:group-hover:text-${stat.color}-400 transition-all duration-500`}>
                                            {stat.value || 0}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-none bg-app-surface-soft border border-slate-300 border-app-border group-hover:border-${stat.color}-500/40 transition-all duration-500 group-hover:bg-${stat.color}-500/10`}>
                                        <stat.icon size={20} className={`text-app-text-muted group-hover:text-${stat.color}-400 transition-all duration-500`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* MY TICKETS MODULE */}
                        <div className="lg:col-span-8 glass-panel p-4 relative overflow-hidden group border border-slate-300 border-app-border">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                            
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_10px_30px_rgba(79,70,229,0.3)] backdrop-blur-md">
                                        <Activity size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-['Outfit'] font-black text-app-text tracking-tight">My Assigned Missions</h3>
                                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                                            Operational Priority Alpha
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-4 py-2 bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-widest border border-indigo-500/20 rounded-none shadow-sm">
                                        {myTickets.length} ACTIVE
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {myTickets.slice(0, 5).map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-app-border hover:border-indigo-500/40 transition-all duration-500 rounded-none group/ticket cursor-pointer shadow-sm relative overflow-hidden" 
                                        onClick={() => openResolveModal(ticket)}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ticket.priority === 'High' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'bg-indigo-500/40'}`}></div>
                                        <div className={`absolute inset-0 bg-gradient-to-r ${ticket.priority === 'High' ? 'from-rose-500/5 via-transparent to-transparent' : 'from-indigo-500/5 via-transparent to-transparent'} opacity-0 group-hover/ticket:opacity-100 transition-opacity duration-500`}></div>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className={`w-4 h-4 rounded-full ${ticket.priority === 'High' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]'}`}></div>
                                                <div className={`absolute inset-0 rounded-full ${ticket.priority === 'High' ? 'bg-rose-500/50 scale-150 animate-ping' : ''}`}></div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-app-text group-hover/ticket:text-indigo-400 transition-colors line-clamp-1 mb-1">{ticket.subject}</h4>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{formatId(ticket.id, 'ticket', ticket)}</span>
                                                    <span className="h-3 w-px bg-app-surface"></span>
                                                    <span className="text-xs font-bold text-app-text-muted flex items-center gap-2 group-hover/ticket:text-indigo-500 transition-colors uppercase tracking-tight">
                                                        <Box size={14} /> {ticket.category || 'SYSTEM_CORE'}
                                                    </span>
                                                    <span className="h-3 w-px bg-app-surface"></span>
                                                    <span className={`text-xs font-bold uppercase tracking-tight px-2 py-0.5 rounded-none border transition-all duration-500
                                                        ${ticket.priority === 'High' ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'}`}>
                                                        {ticket.priority === 'High' ? 'Urgent' : 'Routine'}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase">
                                                        <Clock size={12} /> {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="hidden xl:flex flex-col items-end mr-4">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">MTTR Status</span>
                                                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border
                                                    ${ticket.priority === 'High' ? 'text-rose-500 border-rose-500/30 bg-rose-500/10' : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'}`}>
                                                    {ticket.priority === 'High' ? 'Warning' : 'Healthy'}
                                                </span>
                                            </div>
                                            <button className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white font-bold uppercase tracking-widest text-xs rounded-none transition-all duration-300 border border-indigo-500/20 shadow-md transform hover:-translate-x-1 active:scale-95 group/btn">
                                                Go <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {myTickets.length === 0 && (
                                    <div className="text-center py-24 border border-dashed border-slate-300 border-app-border rounded-[4rem] bg-white dark:bg-white/[0.01] backdrop-blur-sm">
                                        <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-app-border rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                            <ShieldCheck size={40} className="text-slate-700 opacity-30" />
                                        </div>
                                        <p className="text-app-text-muted font-black uppercase tracking-[0.5em] text-[11px]">All clear. Zero unresolved incidents.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CONFIGURATION QUEUE */}
                        <div className="lg:col-span-4 grid grid-cols-1 gap-8">
                            <div className="glass-panel p-8 border border-slate-300 border-app-border relative overflow-hidden group shadow-2xl">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/15 transition-all duration-1000"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg backdrop-blur-md">
                                            <Terminal size={22} />
                                        </div>
                                        <h3 className="text-sm font-bold text-app-text">Configuration Queue</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/20">{pendingQueue.length} PENDING</span>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {pendingQueue.map(item => (
                                        <div key={item.id} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-none hover:border-emerald-500/40 transition-all duration-300 group/item">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <Text className="block text-sm font-bold text-app-text mb-0.5 group-hover/item:text-emerald-500 transition-colors uppercase tracking-tight">{item.name}</Text>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{item.asset_model}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => startConfig(item)}
                                                className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white text-xs font-bold uppercase tracking-widest border border-emerald-500/20 rounded-none transition-all shadow-md active:scale-95"
                                            >
                                                Initialize
                                            </button>
                                        </div>
                                    ))}
                                    {pendingQueue.length === 0 && (
                                        <div className="text-center py-10">
                                            <Text type="secondary" italic className="text-[10px] uppercase font-black tracking-widest text-app-text-muted">No agents pending sync</Text>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STOCKROOM SNAPSHOT */}
                            <div className="glass-panel p-8 border border-slate-300 border-app-border overflow-hidden relative group shadow-2xl">
                                <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-sky-500/10 blur-[80px] rounded-full group-hover:bg-sky-500/15 transition-all duration-1000"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-none bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-lg backdrop-blur-md">
                                            <Server size={22} />
                                        </div>
                                        <h3 className="text-sm font-bold text-app-text">Global Assets</h3>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-sky-500/10 rounded-none border border-sky-500/20 mb-8 relative z-10 shadow-sm dark:shadow-inner overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-sky-500/10 to-transparent"></div>
                                    <div className="flex flex-col relative z-20">
                                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2">Available Nodes</span>
                                        <Title level={2} className="!m-0 !text-xl font-['Outfit'] font-black text-app-text drop-shadow-md">{stockroomAssets.length}</Title>
                                    </div>
                                    <Activity className="text-sky-500/30 animate-pulse" size={40} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-app-border rounded-none group/subitem hover:border-sky-500/30 transition-all">
                                        <Text className="text-[10px] text-app-text-muted block uppercase font-black tracking-widest mb-1 group-hover/subitem:text-sky-400 transition-colors">Laptops</Text>
                                        <Title level={3} className="!m-0 text-app-text font-['Outfit'] font-black">{stockroomAssets.filter(a => a.type?.toLowerCase() === 'laptop').length}</Title>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-app-border rounded-none group/subitem hover:border-sky-500/30 transition-all">
                                        <Text className="text-[10px] text-app-text-muted block uppercase font-black tracking-widest mb-1 group-hover/subitem:text-sky-400 transition-colors">Infra Nodes</Text>
                                        <Title level={3} className="!m-0 text-app-text font-['Outfit'] font-black">{stockroomAssets.filter(a => a.type?.toLowerCase() === 'monitor' || a.type?.toLowerCase() === 'server').length}</Title>
                                    </div>
                                </div>
                                <div className="relative z-10 border-t border-slate-300 border-app-border pt-6">
                                    <Text className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mb-4 block">Deployment Log</Text>
                                    <div className="space-y-3">
                                        {stockroomAssets.slice(0, 3).map(asset => (
                                            <div key={asset.id} className="flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] p-3 rounded-none border border-app-border hover:bg-slate-100 dark:bg-white/[0.05] transition-all">
                                                <Text className="text-xs text-app-text-muted text-app-text-muted font-black uppercase tracking-tight line-clamp-1">{asset.name}</Text>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20">
                        {/* UNASSIGNED TICKETS MODULE */}
                        <div className="glass-panel p-6 lg:p-10 border border-slate-300 border-app-border relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                            <div className="absolute -bottom-24 -left-24 w-[30rem] h-[30rem] bg-rose-500/5 blur-[150px] rounded-full group-hover:bg-rose-500/10 transition-all duration-1000"></div>
                            
                            <div className="flex items-center justify-between mb-16 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tight uppercase m-0 leading-none flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-none bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_10px_20px_rgba(244,63,94,0.2)] backdrop-blur-3xl group-hover:rotate-6 transition-transform duration-500 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-transparent animate-radar origin-center"></div>
                                            <Zap size={24} className="text-rose-500 animate-pulse relative z-10" />
                                        </div>
                                        Available Anomalies
                                    </h3>
                                    <p className="text-xs text-app-text-muted font-bold uppercase tracking-widest mt-6 ml-[4rem] border-l-2 border-rose-500/30 pl-6">Global Incident Pipeline // Sync Active</p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="flex -space-x-3">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className={`w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 text-app-text-muted transition-all duration-500 hover:-translate-y-1 hover:scale-105 cursor-help ${i === 4 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : ''}`}>
                                                {i === 4 ? '+7' : String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="px-6 py-3 bg-rose-500/10 text-rose-500 text-xs font-bold uppercase tracking-widest border border-rose-500/20 rounded-none shadow-lg backdrop-blur-3xl relative overflow-hidden group/unclaimed">
                                        <div className="absolute inset-0 bg-rose-500 animate-pulse opacity-5"></div>
                                        <span className="relative z-10">{unassignedTickets.length} UNCLAIMED</span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-8 relative z-10">
                                {Object.entries(unassignedTicketsByCategory).map(([category, catTickets]) => (
                                    <div key={category} className="space-y-8">
                                        <div className="flex items-center gap-10">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-rose-500/20"></div>
                                            <div className="flex items-center gap-4 px-6 py-2 rounded-full bg-slate-50 dark:bg-white/[0.02] border border-app-border shadow-xl backdrop-blur-3xl group/cat">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 text-app-text-muted m-0 group-hover/cat:text-rose-500 transition-colors">
                                                    {category}
                                                </h4>
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">({catTickets.length})</span>
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/5 to-rose-500/20"></div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {catTickets.map((ticket, index) => {
                                                const isHigh = ticket.priority === 'High';
                                                const isClaiming = claimingTicketId === ticket.id;
                                                
                                                // Simulated MTTR Countdown (2h window)
                                                const createdAt = new Date(ticket.created_at).getTime();
                                                const mttrWindow = 2 * 60 * 60 * 1000;
                                                const timeLeft = Math.max(0, (createdAt + mttrWindow) - currentTime);
                                                const h = Math.floor(timeLeft / (1000 * 60 * 60));
                                                const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                                                const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
                                                
                                                return (
                                                    <div 
                                                        key={ticket.id} 
                                                        style={{ animationDelay: `${index * 100}ms` }}
                                                        className={`p-5 bg-white dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-app-border hover:border-rose-500/30 transition-all duration-300 rounded-none group/ticket cursor-pointer relative overflow-hidden shadow-sm flex flex-col hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/5 animate-digitize opacity-0
                                                            ${isHigh ? 'holographic-card animate-glitch-hover' : ''}
                                                            ${isClaiming ? 'scale-95 opacity-50 blur-sm brightness-50 grayscale' : ''}`}
                                                        onClick={() => !isClaiming && acknowledgeTicket(ticket.id)}
                                                    >
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${isHigh ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]' : 'bg-orange-500/40'} ${isClaiming ? 'w-full opacity-20' : ''}`}></div>
                                                        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 blur-[80px] rounded-full opacity-0 group-hover/ticket:opacity-100 transition-opacity duration-700"></div>
                                                        
                                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                                            <div className={`px-3 py-1 rounded-none text-xs font-bold uppercase tracking-wider border backdrop-blur-3xl transition-all duration-500 ${isHigh ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                                                {ticket.priority} Severity
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <Text className="text-xs text-slate-400 font-mono opacity-60 group-hover/ticket:opacity-100 transition-opacity uppercase tracking-tighter">{formatId(ticket.id, 'ticket', ticket)}</Text>
                                                                {isHigh && timeLeft > 0 && (
                                                                    <span className={`text-[10px] font-mono font-bold mt-1 ${timeLeft < 15 * 60 * 1000 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                                                        {h}h {m}m {s}s
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <h4 className="text-base font-bold text-app-text group-hover/ticket:text-rose-500 transition-colors mb-3 line-clamp-2 leading-tight">{ticket.subject}</h4>
                                                        
                                                        <div className="mb-6 space-y-3 relative z-10">
                                                            <div className="flex items-center gap-3 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                                                                <div className="p-1.5 bg-app-surface-soft rounded-none border border-app-border">
                                                                    <Clock size={12} className="text-rose-500/50" />
                                                                </div>
                                                                {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} // {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                                                                <div className="p-1.5 bg-app-surface-soft rounded-none border border-app-border">
                                                                    <MapPin size={12} className="text-indigo-500/50" />
                                                                </div>
                                                                SECURE_NODE_01
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100 border-app-border relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative">
                                                                    <div className="w-10 h-10 rounded-none bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-sm text-white shadow-lg group-hover/ticket:rotate-6 transition-transform">
                                                                        {ticket.requestor_name?.charAt(0) || 'U'}
                                                                    </div>
                                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></div>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm text-app-text font-bold leading-none">{ticket.requestor_name || 'Anonymous User'}</span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-500 font-bold mt-1">Authorized</span>
                                                                </div>
                                                            </div>
                                                            <button className={`flex items-center gap-2 px-4 py-2 rounded-none border transition-all duration-300 text-xs font-bold uppercase tracking-widest relative overflow-hidden shadow-md active:scale-95
                                                                ${isClaiming ? 'bg-rose-500 text-white border-rose-600 cursor-not-allowed' : 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/20'}`}>
                                                                {isClaiming ? 'EXEC_PROTOCOL' : 'Claim'}
                                                                <Zap size={12} className={`fill-current ${isClaiming ? 'animate-spin' : ''}`} />
                                                            </button>
                                                        </div>
                                                        {isClaiming && (
                                                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-50 flex items-center justify-center">
                                                                <div className="w-full h-1 bg-rose-500/20 absolute bottom-0">
                                                                    <div className="h-full bg-rose-500 animate-[holographic-shimmer_1s_infinite_linear] origin-left" style={{ width: '100%' }}></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                
                                {unassignedTickets.length === 0 && (
                                    <div className="text-center py-16 bg-slate-50 dark:bg-white/[0.01] rounded-none border border-dashed border-app-border">
                                        <Zap size={32} className="text-slate-400 mx-auto mb-4 opacity-30" />
                                        <p className="text-app-text-muted font-bold uppercase tracking-widest text-xs">Registry is clean. No anomalies detected.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ASSET CONFIGURATION MODAL */}
                    {activeModal === 'CONFIG' && selectedItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-xl animate-in fade-in duration-500">
                            <div className="bg-app-surface border border-app-border rounded-[3rem] w-full max-w-xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 relative">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                                
                                <div className="p-12 flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_20px_40px_rgba(16,185,129,0.3)] backdrop-blur-3xl group-hover:rotate-12 transition-transform duration-700">
                                            <Terminal size={32} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tighter uppercase m-0 leading-none">Process Initialization</h3>
                                            <p className="text-[11px] text-app-text-muted font-black uppercase tracking-[0.5em] mt-5 flex items-center gap-3 border-l-2 border-emerald-500/30 pl-6">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                                                Syncing Node: {selectedItem.asset_tag} // AUTH_READY
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="p-4 bg-app-surface-soft hover:bg-rose-500/10 rounded-[1.5rem] text-app-text-muted hover:text-rose-400 transition-all border border-app-border group"
                                    >
                                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    </button>
                                </div>

                                <div className="px-12 pb-12 space-y-10 relative z-10">
                                    {configStep === 1 && (
                                        <div className="text-center py-20 bg-slate-50 dark:bg-white/[0.02] rounded-[3.5rem] border border-app-border shadow-2xl relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                            <div className="relative mb-10">
                                                <ShieldCheck size={96} className="text-emerald-500 mx-auto filter drop-shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse" />
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-pulse"></div>
                                            </div>
                                            <h4 className="text-2xl font-black text-app-text mb-4 uppercase tracking-[0.4em]">Security Matrix Alignment</h4>
                                            <p className="text-xs text-app-text-muted max-w-[320px] mx-auto font-black uppercase tracking-widest leading-loose italic opacity-70">Verifying TPM 2.0 signatures and Secure Boot chain of trust // Protocol Alpha Active.</p>
                                        </div>
                                    )}
                                    {configStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-8 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-emerald-500/10 rounded-none border border-emerald-500/20">
                                                        <Activity size={18} className="text-emerald-500 animate-spin duration-[4s]" />
                                                    </div>
                                                    <h4 className="text-xs font-black uppercase tracking-[0.6em] text-app-text-muted text-app-text-muted">Registry Propagation Sequence</h4>
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10 animate-pulse">Active Stream</span>
                                            </div>
                                            <div className="space-y-4">
                                                {[
                                                    { label: 'Enterprise Mobility Manager', status: 'Linked', active: false },
                                                    { label: 'SentinelOne EDR Agent', status: 'Syncing...', active: true },
                                                    { label: 'GlobalProtect VPN', status: 'Queued', active: false }
                                                ].map((sw, idx) => (
                                                    <div key={idx} className={`p-8 bg-white dark:bg-white/[0.01] border rounded-[2.5rem] flex items-center justify-between transition-all duration-500 group/sw
                                                        ${sw.active ? 'border-emerald-500/40 bg-emerald-500/5 shadow-2xl' : 'border-app-border hover:border-app-border-soft'}`}>
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-3 h-3 rounded-full transition-all duration-700
                                                                ${sw.status === 'Linked' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 
                                                                    sw.active ? 'bg-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,1)]' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                                                            <span className={`text-sm font-black uppercase tracking-widest transition-colors ${sw.active || sw.status === 'Linked' ? 'text-app-text' : 'text-app-text-muted'}`}>{sw.label}</span>
                                                        </div>
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all
                                                            ${sw.status === 'Linked' ? 'text-emerald-500/60' : 
                                                                sw.active ? 'text-emerald-400 italic' : 'text-slate-700'}`}>{sw.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {configStep === 3 && (
                                        <div className="text-center py-20 bg-emerald-500/5 rounded-[4rem] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                                            <CheckCircle size={96} className="text-emerald-500 mx-auto mb-10 filter drop-shadow-[0_0_40px_rgba(16,185,129,0.7)] hover:scale-110 transition-transform duration-700" />
                                            <h4 className="text-xl font-bold text-app-text mb-4 uppercase tracking-wider">Node Sync Successful</h4>
                                            <p className="text-sm text-emerald-500 font-bold max-w-[340px] mx-auto uppercase tracking-wide leading-relaxed italic">Handover protocol initiated // All systems nominal</p>
                                        </div>
                                    )}

                                    <div className="pt-10 border-t border-app-border mt-10 relative z-10">
                                        <button
                                            onClick={handleConfigStepComplete}
                                            className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold uppercase tracking-widest rounded-none hover:shadow-lg transition-all active:scale-95 shadow-xl"
                                        >
                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                            <span className="flex items-center justify-center gap-6">
                                                {configStep < 3 ? 'Initialize Next Protocol Phase' : 'Confirm Mission Alignment & Close'}
                                                <ArrowRight size={20} className="group-hover/btn:translate-x-4 transition-transform" />
                                            </span>
                                        </button>
                                        <div className="flex justify-center gap-4 mt-12">
                                            {[1, 2, 3].map(s => (
                                                <div key={s} className={`h-1.5 w-12 rounded-full transition-all duration-1000 ${configStep >= s ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-app-surface-soft'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RESOLVE TICKET MODAL */}
                    {activeModal === 'RESOLVE_TICKET' && selectedItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-2xl animate-in fade-in duration-500">
                        <div className="bg-app-surface border border-app-border rounded-none w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-500 relative">
                                <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-rose-500/10 blur-[150px] rounded-full pointer-events-none"></div>
                                
                                <div className="p-6 flex justify-between items-center relative z-10 border-b border-slate-100 border-app-border">
                                    <div className="flex items-center gap-8">
                                        <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-[0_20px_40px_rgba(244,63,94,0.3)] backdrop-blur-3xl group-hover:rotate-12 transition-transform duration-700">
                                            <ShieldCheck size={40} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tight leading-none">Mission Finalization</h3>
                                            <p className="text-sm text-app-text-muted font-bold uppercase tracking-widest mt-4 flex items-center gap-3 border-l-2 border-rose-500/30 pl-4">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                                                Encryption_Key: <span className="text-app-text font-mono">{formatId(selectedItem.id, 'ticket', selectedItem)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="p-4 bg-app-surface-soft hover:bg-rose-500/10 rounded-[1.5rem] text-app-text-muted hover:text-rose-400 transition-all border border-app-border group"
                                    >
                                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    </button>
                                </div>

                                <div className="px-6 pb-6 space-y-5 relative z-10">
                                    <div className="bg-slate-50 dark:bg-white/[0.02] p-10 rounded-[3rem] border border-app-border shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-px w-6 bg-rose-500/30"></div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-app-text-muted">Objective Narrative Protocol</p>
                                        </div>
                                        <p className="text-app-text font-black text-2xl tracking-tight leading-tight mb-6">{selectedItem.subject}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-none text-xs font-bold text-rose-400 uppercase tracking-widest shadow-lg">PRIORITY_{selectedItem.priority.toUpperCase()}</div>
                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                                            <span className="text-app-text-muted text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                                <Box size={14} /> {selectedItem.category || 'MAINTENANCE_LOG'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-end justify-between mb-8 px-4">
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-app-text">Resolution Checklist</h4>
                                                <p className="text-xs text-emerald-500 font-bold uppercase tracking-wide flex items-center gap-2">
                                                    <Activity size={14} className="animate-pulse" /> Verification Protocol Active
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-rose-500 font-['Outfit'] tracking-tighter">
                                                    {activeChecklist.length > 0 ? Math.round((activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100) : 0}%
                                                </div>
                                                <div className="text-xs text-app-text-muted font-bold uppercase tracking-wide">Ready for Deployment</div>
                                            </div>
                                        </div>
                                        
                                        <div className="h-2 bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden border border-app-border mb-5 relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-700"
                                                style={{ width: `${activeChecklist.length > 0 ? (activeChecklist.filter(i => i.checked).length / activeChecklist.length) * 100 : 0}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeChecklist.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => toggleChecklistItem(idx)}
                                                    className={`flex items-center justify-between p-6 rounded-[1.75rem] border transition-all duration-500 cursor-pointer group/item
                                                        ${item.checked 
                                                            ? 'bg-rose-500/10 border-rose-500/40 shadow-2xl shadow-rose-500/10' 
                                                            : 'bg-white dark:bg-white/[0.01] border-app-border hover:border-app-border-soft'}`}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-7 h-7 rounded-[0.75rem] border flex items-center justify-center transition-all duration-500
                                                            ${item.checked 
                                                                ? 'bg-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-110' 
                                                                : 'bg-transparent border-slate-300 border-app-border group-hover/item:border-rose-500/50'}`}>
                                                            {item.checked && <Check size={16} className="text-app-text font-black" />}
                                                        </div>
                                                        <span className={`text-sm font-bold uppercase tracking-tight transition-all pb-0.5 ${item.checked ? 'text-app-text' : 'text-slate-600 text-app-text-muted group-hover/item:text-slate-900 dark:group-hover/item:text-white'}`}>{item.text}</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); removeChecklistItem(idx); }}
                                                        className="text-slate-800 hover:text-rose-500 transition-all opacity-0 group-hover/item:opacity-100 p-2 hover:bg-rose-500/10 rounded-none"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 group/input col-span-1 md:col-span-2 mt-4">
                                                <input
                                                    value={newItemText}
                                                    onChange={(e) => setNewItemText(e.target.value)}
                                                    placeholder="Inject Custom Validation Phase..."
                                                    className="flex-1 min-h-[44px] bg-slate-50 dark:bg-white/[0.02] border border-slate-300 border-app-border rounded-none px-4 text-sm font-medium text-app-text placeholder:text-slate-400 focus:outline-none focus:border-rose-500/40 transition-all"
                                                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                                />
                                                <button onClick={addChecklistItem} className="p-2.5 bg-rose-500/10 text-rose-400 rounded-none border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                                                    <Plus size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 ml-1">
                                            <div className="w-1 h-4 bg-rose-500/50 rounded-full"></div>
                                             <Text className="text-base font-bold text-app-text block">Resolution Notes</Text>
                                        </div>
                                        <textarea
                                            className="w-full h-48 bg-white dark:bg-white/[0.01] border border-app-border rounded-[3rem] p-10 text-app-text text-base font-bold placeholder:text-slate-800 focus:outline-none focus:border-rose-500/40 focus:ring-[20px] focus:ring-rose-500/5 focus:bg-slate-50 dark:bg-white/[0.02] transition-all shadow-sm dark:shadow-inner custom-scrollbar backdrop-blur-3xl"
                                            placeholder="Document technical parameters and resolution vectors..."
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-8 pt-8 relative z-10">
                                        <button
                                            onClick={() => setActiveModal(null)}
                                            className="px-8 py-5 rounded-none border border-app-border text-slate-600 text-app-text-muted text-sm font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-lg active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={submitResolution}
                                            className="flex-1 px-8 py-5 rounded-none bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm font-bold uppercase tracking-widest shadow-xl hover:shadow-rose-500/20 transform hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:transform-none"
                                            disabled={(activeChecklist.some(i => !i.checked) && activeChecklist.length > 0) || !resolutionNotes.trim()}
                                        >
                                            Finalize Resolution Protocol
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Content>
            </Layout>
        </ConfigProvider>
    );
};
