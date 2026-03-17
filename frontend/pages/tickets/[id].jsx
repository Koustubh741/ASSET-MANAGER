import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Clock, User, MessageSquare, CheckCircle, AlertTriangle, Sparkles, Monitor, Info, ChevronDown, RefreshCw, Shield, Activity, Terminal, Cpu } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import SmartIdGuideModal from '@/components/SmartIdGuideModal';
import apiClient from '@/lib/apiClient';
import { formatId, copyToClipboard } from '@/lib/idHelper';
import { useToast } from '@/components/common/Toast';

export default function TicketDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const toast = useToast();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [note, setNote] = useState('');
    const [newStatus, setNewStatus] = useState('OPEN');
    const [isRemoteRequested, setIsRemoteRequested] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [technicians, setTechnicians] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);


    const handleAIAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const result = await apiClient.analyzeTicket(ticket.subject, ticket.description);
            setAiAnalysis(result);
        } catch (error) {
            console.error('AI Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRemoteAssist = async () => {
        if (!ticket.related_asset_id) {
            toast.error('No asset linked to this ticket.');
            return;
        }
        try {
            await apiClient.requestRemoteAssistance(ticket.related_asset_id);
            setIsRemoteRequested(true);
            toast.success('Remote assistance request sent to the agent.');
        } catch (error) {
            toast.error('Failed to request remote assistance: ' + error.message);
        }
    };

    const handleAcknowledge = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || { id: 'admin', full_name: 'Admin' };
            await apiClient.acknowledgeTicket(id, user.id || user.full_name, 'Ticket acknowledged from details page.');

            // Reload ticket
            const updated = await apiClient.getTicket(id);
            setTicket(updated);
            toast.success('Ticket acknowledged successfully!');
        } catch (error) {
            toast.error('Failed to acknowledge ticket: ' + error.message);
        }
    };

    const handleUpdate = async () => {
        if (!note) return;
        try {
            const user = JSON.parse(localStorage.getItem('user')) || { id: 'admin', full_name: 'Admin' };

            // If status is being set to RESOLVED or CLOSED, use resolveTicket
            if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
                await apiClient.resolveTicket(id, user.id || user.full_name, note);
            } else {
                // Otherwise acknowledge or just update
                await apiClient.acknowledgeTicket(id, user.id || user.full_name, note);
            }

            // Reload ticket
            const updated = await apiClient.getTicket(id);
            setTicket(updated);
            setIsModalOpen(false);
            setNote('');
            toast.success('Ticket updated successfully!');
        } catch (error) {
            toast.error('Failed to update ticket: ' + error.message);
        }
    };

    const handleAssignTicket = async (techId) => {
        if (!techId) return;
        setIsAssigning(true);
        try {
            await apiClient.updateTicket(id, { assigned_to_id: techId });
            // Reload ticket
            const updated = await apiClient.getTicket(id);
            setTicket(updated);
            toast.success("Ticket assigned successfully!");
        } catch (err) {
            toast.error("Assignment failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsAssigning(false);
        }
    };


    useEffect(() => {
        if (!id) return;
        const fetchTicket = async () => {
            setLoading(true);
            try {
                const data = await apiClient.getTicket(id);
                setTicket(data);
                setNewStatus(data.status);
            } catch (error) {
                console.error('Failed to fetch ticket:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, [id]);

    useEffect(() => {
        const fetchTechnicians = async () => {
            try {
                const itRoles = ['IT_SUPPORT', 'SUPPORT_SPECIALIST'];
                const allUsers = await apiClient.getUsers({ status: 'ACTIVE' });
                const filtered = allUsers.filter(u => itRoles.includes(u.role));
                setTechnicians(filtered);
            } catch (err) {
                console.error("Failed to fetch technicians:", err);
            }
        };
        fetchTechnicians();
    }, []);


    if (loading) return <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading...</div>;
    if (!ticket) return <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-rose-500">Ticket not found or inaccessible.</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* --- HEADER LAYER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-5">
                        <button 
                            onClick={() => router.back()} 
                            className="group p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm hover:shadow-indigo-500/10 active:scale-95"
                        >
                            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                                    {ticket.subject}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                        ticket.priority === 'High' 
                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/5 pulse-rose' 
                                            : ticket.priority === 'Medium'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5'
                                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5'
                                    }`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/5">
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <p
                                    className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5"
                                    onClick={() => copyToClipboard(ticket.id, 'Ticket ID')}
                                >
                                    <Shield size={12} className="text-indigo-500/50" />
                                    {formatId(ticket.id, 'ticket', ticket)}
                                </p>
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors"
                                >
                                    <Info size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
                        <div className="flex flex-col items-end px-3 border-r border-slate-200 dark:border-white/10">
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">System Scan</span>
                            <span className="text-xs font-mono text-emerald-400 font-bold">NOMINAL</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-pulse">
                            <RefreshCw size={18} />
                        </div>
                    </div>
                </div>

                {/* --- AI NEURAL CORE PANEL --- */}
                <div className="relative group p-8 rounded-[2.5rem] bg-slate-900/5 dark:bg-indigo-950/20 border border-indigo-500/20 overflow-hidden shadow-2xl transition-all hover:shadow-indigo-500/10">
                    {/* Animated background elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-1000" />
                    
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity duration-1000 rotate-12">
                        <Sparkles size={160} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white">
                                    <Sparkles size={24} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-indigo-100 tracking-tight uppercase italic">
                                        Neural Core <span className="text-indigo-500">Intelligence</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-indigo-300/60 font-medium uppercase tracking-widest">Autonomous Resolution Subsystem v4.2</p>
                                </div>
                            </div>
                            
                            {!aiAnalysis && (
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzing}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 group/btn"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" /> 
                                            Scanning Databanks...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} className="group-hover/btn:scale-125 transition-transform" />
                                            Initialize AI Diagnostic
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            {aiAnalysis ? (
                                <div className="md:col-span-8 space-y-6">
                                    <div className="p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className="flex-1">
                                                <span className="text-[10px] uppercase font-black text-slate-400 dark:text-indigo-300/40 tracking-widest block mb-1">Confidence Rating</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-3 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" 
                                                            style={{ width: `${Math.round(aiAnalysis.confidence_score * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-black text-emerald-400 font-mono italic">{Math.round(aiAnalysis.confidence_score * 100)}%</span>
                                                </div>
                                            </div>
                                            <div className="px-5 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                                <span className="text-[10px] uppercase font-black text-indigo-400 block mb-0.5">Vector</span>
                                                <span className="text-xs font-bold text-white uppercase">{aiAnalysis.category}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                                <ChevronDown size={14} /> Recommended Protocol
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {aiAnalysis.suggested_steps.map((step, i) => (
                                                    <div key={i} className="group/step flex gap-4 p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-transparent hover:border-indigo-500/30 hover:bg-white/60 dark:hover:bg-indigo-500/10 transition-all duration-300">
                                                        <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-indigo-500/20 group-hover/step:bg-indigo-500 group-hover/step:text-white transition-colors">{i + 1}</span>
                                                        <span className="text-sm text-slate-700 dark:text-indigo-100/90 font-medium leading-tight">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="md:col-span-12 flex flex-col items-center justify-center py-6">
                                    <div className="grid grid-cols-4 gap-4 w-full max-w-2xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:border-indigo-500/50 transition-all duration-1000">
                                        {[1,2,3,4].map(x => (
                                            <div key={x} className="h-2 bg-indigo-500/20 rounded-full animate-pulse" style={{ animationDelay: `${x * 200}ms` }} />
                                        ))}
                                    </div>
                                    <p className="mt-8 text-slate-500 dark:text-indigo-300/40 text-sm font-bold uppercase tracking-widest text-center animate-pulse">
                                        Neural Link Standing By...
                                    </p>
                                </div>
                            )}
                            
                            {aiAnalysis && (
                                <div className="md:col-span-4 flex flex-col justify-between p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                <Terminal size={16} />
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Analysis Summary</h4>
                                        </div>
                                        <p className="text-sm text-indigo-200/70 leading-relaxed italic">
                                            "Our heuristic models suggest a high likelihood of {aiAnalysis.category.toLowerCase()} discrepancy. The generated protocol targets standard recovery vectors with a {Math.round(aiAnalysis.confidence_score * 100)}% accuracy projection."
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleAIAnalysis}
                                        className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={12} /> Recalibrate Model
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* --- MAIN CORE CONTENT --- */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* DESCRIPTION PANEL */}
                        <div className="glass-panel group p-8 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <Info size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">Incident Narrative</h3>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {ticket.description}
                                </p>
                            </div>
                        </div>

                        {/* ACTIVITY LOG PANEL */}
                        <div className="glass-panel group p-8 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <Activity size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">Activity Stream</h3>
                                </div>
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                                    {ticket.timeline?.length || 0} Events
                                </span>
                            </div>

                            <div className="relative space-y-10 pl-6 border-l-2 border-slate-200 dark:border-white/10 ml-2">
                                {(ticket.timeline || []).map((h, i) => (
                                    <div key={i} className="relative group/item animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                                        {/* Timeline Node */}
                                        <div className={`absolute -left-[35px] top-1 w-5 h-5 rounded-full border-4 shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500 group-hover/item:scale-125 ${
                                            h.action.includes('RESOLVED') 
                                                ? 'bg-emerald-500 border-emerald-500/20' 
                                                : h.action.includes('ACKNOWLEDGED')
                                                ? 'bg-indigo-500 border-indigo-500/20'
                                                : 'bg-slate-500 border-slate-500/20'
                                        }`} />
                                        
                                        <div className="bg-slate-100/50 dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/5 group-hover/item:border-indigo-500/30 transition-all shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                <div className={`text-sm font-black uppercase tracking-widest ${
                                                    h.action.includes('RESOLVED') ? 'text-emerald-400' : 'text-slate-900 dark:text-indigo-200'
                                                }`}>
                                                    {h.action}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 flex items-center gap-1.5 bg-white dark:bg-black/20 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                                                    <Clock size={10} /> {new Date(h.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium italic mb-4">"{h.comment}"</p>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-slate-800 dark:text-indigo-200/90">{h.byUser}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{h.byRole}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- TACTICAL SIDEBAR --- */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* TICKET DETAILS CARD */}
                        <div className="glass-panel p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl group hover:border-indigo-500/20 transition-all">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-8 pb-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
                                <Cpu size={14} className="text-indigo-500" /> System Metadata
                            </h3>
                            
                            <div className="space-y-8">
                                <div className="flex items-center gap-4 group/meta cursor-pointer" onClick={() => copyToClipboard(ticket.requestor_id, 'Requester ID')}>
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover/meta:bg-indigo-600 group-hover/meta:text-white transition-all">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter block mb-0.5">Origin Requestor</span>
                                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono">{formatId(ticket.requestor_id, 'user')}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter block mb-0.5">Temporal Stamp</span>
                                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono">{new Date(ticket.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-white/5">
                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter block mb-4">Neural Linked Asset</span>
                                    {ticket.related_asset_id ? (
                                        <Link
                                            href={`/assets/${ticket.related_asset_id}`}
                                            className="group/link flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 transition-all overflow-hidden relative"
                                        >
                                            <div className="relative z-10">
                                                <div className="text-sm font-black text-blue-400 font-mono tracking-tight">{formatId(ticket.related_asset_id, 'asset')}</div>
                                                <div className="text-[9px] uppercase font-bold text-blue-300 opacity-60 mt-0.5">Primary Link Established</div>
                                            </div>
                                            <Monitor size={20} className="text-blue-400 opacity-20 group-hover/link:scale-110 transition-transform" />
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-500/5 border border-dashed border-slate-500/20 text-slate-500">
                                            <Monitor size={18} className="opacity-30" />
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-60 italic">Void (Unlinked)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TACTICAL ALLOCATION MODULE */}
                        <div className="glass-panel p-8 rounded-[2rem] bg-indigo-600/[0.03] border border-indigo-500/20 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                <Shield size={80} />
                            </div>
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Shield size={20} />
                                </div>
                                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest italic">Tactical Allocation</h3>
                            </div>
                            
                            <div className="relative group/select">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <User size={18} className="text-slate-400 group-focus-within/select:text-indigo-400 transition-colors" />
                                </div>
                                <select
                                    className="w-full bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 dark:text-indigo-200/80 outline-none hover:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer appearance-none"
                                    value={ticket.assigned_to_id || ''}
                                    onChange={(e) => handleAssignTicket(e.target.value)}
                                    disabled={isAssigning}
                                >
                                    <option value="">Operational Queue (Unassigned)</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>
                                            {tech.full_name} — {tech.persona?.replace('_', ' ') || tech.role}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    {isAssigning ? <RefreshCw size={18} className="animate-spin text-indigo-500" /> : <ChevronDown size={18} className="text-indigo-500/50" />}
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] text-slate-400 dark:text-indigo-300/40 uppercase font-black text-center tracking-tighter">Authorized Personal Only • Identity Verified</p>
                        </div>

                        {/* ACTION CONTROLS */}
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="group w-full py-4 bg-white dark:bg-white/5 hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-700 dark:text-indigo-200/80 hover:text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                            >
                                <MessageSquare size={16} /> Update Protocol
                            </button>

                            {ticket.status?.toUpperCase() === 'OPEN' && (
                                <button
                                    onClick={handleAcknowledge}
                                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 animate-pulse italic"
                                >
                                    <CheckCircle size={18} /> Initiate Acknowledge
                                </button>
                            )}

                            <button
                                onClick={handleRemoteAssist}
                                disabled={!ticket.related_asset_id || isRemoteRequested}
                                className={`w-full py-4 flex items-center justify-center gap-3 rounded-2xl border font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-300 ${
                                    isRemoteRequested 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default shadow-lg shadow-emerald-500/5' 
                                        : 'bg-blue-600/10 text-blue-400 border-blue-600/20 hover:bg-blue-600 hover:text-white hover:border-transparent shadow-xl active:shadow-none shadow-blue-600/5 disabled:opacity-30 disabled:grayscale'
                                }`}
                            >
                                <Monitor size={16} />
                                {isRemoteRequested ? 'Direct Link Active' : 'Remote Assist (RDP)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ACTION MODAL OVERHAUL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border-indigo-500/20">
                        <div className="p-8 bg-gradient-to-br from-indigo-900/50 to-blue-900/50 border-b border-white/10">
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Protocol <span className="text-indigo-400">Update</span></h3>
                            <p className="text-xs text-indigo-300/60 uppercase font-black tracking-widest">Incident Record Modulation</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-indigo-300/40 uppercase tracking-widest mb-3">Status Mutation</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setNewStatus(status)}
                                            className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                newStatus === status 
                                                    ? 'bg-indigo-600 border-transparent text-white shadow-lg shadow-indigo-600/20 scale-105' 
                                                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-indigo-500/30'
                                            }`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-indigo-300/40 uppercase tracking-widest mb-3">Mission Narrative</label>
                                <textarea
                                    className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 dark:text-indigo-100 focus:ring-4 focus:ring-indigo-500/10 outline-none h-32 transition-all resize-none"
                                    placeholder="Enter technical details about the modulation..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all border border-transparent active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                                >
                                    Log Modulation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SmartIdGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}
