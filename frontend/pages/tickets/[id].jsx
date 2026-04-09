import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Clock, User, MessageSquare, CheckCircle, AlertTriangle, Sparkles, Monitor, Info, ChevronDown, RefreshCw, Shield, Activity, Terminal, Cpu, Zap, FileText, X, Send, Lock } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import SmartIdGuideModal from '@/components/SmartIdGuideModal';
import apiClient from '@/lib/apiClient';
import { formatId, copyToClipboard } from '@/lib/idHelper';
import { useToast } from '@/components/common/Toast';

import { useRole } from '@/contexts/RoleContext';
import TicketComments from '@/components/tickets/TicketComments';
import TicketAttachments from '@/components/tickets/TicketAttachments';
import TicketTimeline from '@/components/tickets/TicketTimeline';

export default function TicketDetails() {
    const { user } = useRole();
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
            await apiClient.post(`/tickets/${id}/acknowledge`, { notes: 'Ticket acknowledged from details page.' });
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
            const currentUserId = user?.id || 'admin';
            if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
                await apiClient.resolveTicket(id, currentUserId, note);
            } else {
                await apiClient.acknowledgeTicket(id, currentUserId, note);
            }
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
            await apiClient.post(`/tickets/${id}/assign`, { agent_id: techId });
            const updated = await apiClient.getTicket(id);
            setTicket(updated);
            toast.success("Ticket assigned successfully!");
        } catch (err) {
            toast.error("Assignment failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsAssigning(false);
        }
    };

    const handleStartWork = async () => {
        try {
            await apiClient.post(`/tickets/${id}/start`);
            const updated = await apiClient.getTicket(id);
            setTicket(updated);
            toast.success("Work started on ticket!");
        } catch (err) {
            toast.error("Failed to start work: " + (err.response?.data?.detail || err.message));
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
            if (!ticket) return;
            try {
                // Determine department for filtering
                // Heuristic: check target_department_name, then requestor_department, then assignment_group_department
                const filterDeptRaw = ticket.target_department_name || 
                                     ticket.requestor_department || 
                                     ticket.assignment_group_department || 
                                     ticket.department;
                
                // Normalization: Map "HR" to "Human Resources" for consistent API queries
                const filterDept = (filterDeptRaw === "HR") ? "Human Resources" : filterDeptRaw;
                
                const params = { status: 'ACTIVE' };
                if (filterDept && filterDept !== "None") params.department = filterDept;

                const response = await apiClient.getUsers(params);
                const allUsers = response.data || [];
                
                // Final safety filter for staff roles if the backend is broader than intended
                const staffRoles = ['IT_SUPPORT', 'SUPPORT_SPECIALIST', 'IT_MANAGEMENT', 'ASSET_MANAGER', 'ADMIN', 'PROCUREMENT', 'FINANCE', 'HR_SUPPORT', 'LEGAL_SUPPORT', 'SUPPORT', 'MANAGER'];
                const filtered = allUsers.filter(u => staffRoles.includes(u.role));
                
                setTechnicians(filtered);
            } catch (err) {
                console.error("Failed to fetch technicians:", err);
            }
        };
        fetchTechnicians();
    }, [ticket?.id, ticket?.target_department_name, ticket?.department]);

    if (loading) return <div className="min-h-screen bg-app-obsidian flex items-center justify-center text-app-text-muted font-black uppercase tracking-[0.3em]">Neural Link Establishing...</div>;
    if (!ticket) return <div className="min-h-screen bg-app-obsidian flex items-center justify-center text-app-rose font-black uppercase tracking-[0.3em]">Critical Error: Access Denied</div>;

    return (
        <div className="min-h-screen p-8 bg-app-obsidian text-app-text font-['Space_Grotesk']">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-app-border">
                    <div className="flex items-center space-x-5">
                        <button 
                            onClick={() => router.back()} 
                            className="p-3 bg-app-void border border-app-border text-app-text-muted hover:text-app-primary transition-all shadow-xl active:scale-95 group"
                        >
                            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tighter text-app-text uppercase italic leading-none">{ticket.subject}</h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-4 py-1 rounded-none text-[10px] font-black uppercase tracking-widest border ${
                                        ticket.priority === 'High' ? 'bg-app-rose/10 text-app-rose border-app-rose/20 pulsing-critical-badge' : 'bg-app-gold/10 text-app-gold border-app-gold/20'
                                    }`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="px-5 py-1 rounded-none bg-app-primary text-app-void text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-app-primary/20">
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                                <div className="kinetic-scan-container px-3 py-1 bg-app-void border border-app-border relative group/id">
                                    <div className="kinetic-scan-line" />
                                    <p className="text-[10px] font-mono font-black text-app-primary/80 hover:text-app-primary transition-colors cursor-pointer flex items-center gap-1.5" onClick={() => copyToClipboard(ticket.id, 'Ticket ID')}>
                                        <Shield size={12} className="text-app-primary" />
                                        {formatId(ticket.id, 'ticket', ticket)}
                                    </p>
                                </div>
                                <span className="telemetry-text opacity-40 uppercase">VECTOR: {ticket.id?.substring(0, 8).toUpperCase()}</span>
                                <button onClick={() => setIsGuideOpen(true)} className="p-1 text-app-text-muted hover:text-app-primary transition-colors"><Info size={14} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-app-void p-2 rounded-none border border-app-border backdrop-blur-md">
                        <div className="flex flex-col items-end px-3 border-r border-app-border">
                            <span className="text-[10px] uppercase font-black text-app-text-muted tracking-tighter">System Scan</span>
                            <span className="text-xs font-mono text-app-secondary font-bold">NOMINAL</span>
                        </div>
                        <div className="w-10 h-10 bg-app-primary/10 flex items-center justify-center text-app-primary animate-pulse">
                            <RefreshCw size={18} />
                        </div>
                    </div>
                </div>

                {/* AI Panel */}
                <div className="relative group p-10 bg-app-obsidian border-l-2 border-app-primary shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 font-mono text-[60px] font-black text-white/[0.02] pointer-events-none select-none tracking-tighter uppercase italic leading-none">
                        NEURAL_CORE<br/>ACTIVE_SUB v4.2
                    </div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/[0.03]">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-app-primary flex items-center justify-center text-app-void shadow-[0_0_30px_rgba(var(--color-kinetic-primary-rgb),0.3)]">
                                    <Cpu size={28} className="animate-spin-slow" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-app-text tracking-tight uppercase italic">AI <span className="text-app-primary">Diagnostic</span> Operation</h3>
                                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] opacity-40">System Architecture Disruption Analysis</p>
                                </div>
                            </div>
                            {!aiAnalysis && (
                                <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-3 rounded-none bg-app-primary hover:bg-app-text text-app-void font-black text-xs uppercase tracking-widest shadow-xl transition-all">
                                    {isAnalyzing ? 'Scanning...' : 'Initialize AI Diagnostic'}
                                </button>
                            )}
                        </div>

                        {aiAnalysis ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                <div className="md:col-span-8 space-y-6">
                                    <div className="p-6 bg-app-void border border-app-border">
                                        <span className="telemetry-text block mb-2 text-app-primary">Confidence Calibration</span>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-2 bg-white/5 relative">
                                                <div className="glow-bar-fill h-full bg-app-primary" style={{ width: `${Math.round(aiAnalysis.confidence_score * 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-black text-app-primary font-mono">{Math.round(aiAnalysis.confidence_score * 100)}%</span>
                                        </div>
                                        <div className="mt-8 space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Terminal size={14} className="text-app-primary" /> Resolution Protocols</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {aiAnalysis.suggested_steps.map((step, i) => (
                                                    <div key={i} className="p-4 bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-tight italic">{step}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-4 p-6 bg-app-primary/5 border border-app-primary/20">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-app-primary mb-4">Summary</h4>
                                    <p className="text-sm text-app-text-muted italic uppercase leading-relaxed">{aiAnalysis.category} discrepancy detected. Calibration targets recovery vector via neural mapping.</p>
                                    <button onClick={handleAIAnalysis} className="mt-6 w-full py-3 bg-app-void border border-app-border text-[10px] font-black uppercase tracking-widest text-app-primary hover:bg-app-primary/10 transition-all">Recalibrate</button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center opacity-30 text-xs font-black uppercase tracking-widest animate-pulse">Neural Link Standing By...</div>
                        )}
                    </div>
                </div>

                {/* Main Grid Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border">
                            <h3 className="text-xl font-black text-app-text uppercase italic mb-8 flex items-center gap-4"><FileText size={22} className="text-app-primary" /> Incident Narrative</h3>
                            <div className="p-8 bg-app-void border border-app-border relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-20" />
                                <p className="text-xl text-app-text-muted font-black uppercase tracking-tight italic leading-relaxed">{ticket.description}</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border">
                                <TicketComments ticketId={id} currentUser={user} />
                            </div>
                            <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border">
                                <TicketAttachments ticketId={id} currentUser={user} />
                            </div>
                            <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border">
                                <TicketTimeline timeline={ticket?.timeline} />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {/* SLA Info */}
                        {(ticket.sla_response_deadline || ticket.sla_resolution_deadline) && (
                            <div className={`p-8 bg-app-obsidian border-l-4 ${
                                ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED' ? 'border-app-rose' : 'border-app-primary'
                            } shadow-2xl`}>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-app-text-muted mb-6">SLA Status</h4>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase italic"><span>Response</span> <span className={ticket.sla_response_status === 'BREACHED' ? 'text-app-rose' : 'text-app-primary'}>{ticket.sla_response_status}</span></div>
                                        <div className="h-1.5 bg-white/5"><div className="h-full bg-app-primary" style={{ width: '100%' }} /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase italic"><span>Resolution</span> <span className={ticket.sla_resolution_status === 'BREACHED' ? 'text-app-rose' : 'text-app-secondary'}>{ticket.sla_resolution_status}</span></div>
                                        <div className="h-1.5 bg-white/5"><div className="h-full bg-app-secondary" style={{ width: '40%' }} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-app-void border border-app-border flex items-center justify-center text-app-primary"><User size={20} /></div>
                                <div><div className="telemetry-text opacity-40">Origin</div><div className="text-sm font-black uppercase tracking-widest">{ticket.requestor_name}</div></div>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-app-void border border-app-border flex items-center justify-center text-app-secondary"><Clock size={20} /></div>
                                <div><div className="telemetry-text opacity-40">Established</div><div className="text-sm font-black uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString()}</div></div>
                            </div>
                            <div className="pt-6 border-t border-app-border">
                                <div className="telemetry-text opacity-40 mb-4 px-1 border-l-2 border-app-primary">Linked Asset</div>
                                {ticket.related_asset_id ? (
                                    <Link href={`/assets/${ticket.related_asset_id}`} className="flex items-center justify-between p-4 bg-app-primary/5 hover:bg-app-primary border border-app-primary/20 hover:text-app-void transition-all uppercase font-black text-xs italic tracking-tighter">
                                        {formatId(ticket.related_asset_id, 'asset')} <Monitor size={16} />
                                    </Link>
                                ) : <div className="p-4 bg-app-void border border-app-border text-[9px] opacity-20 uppercase font-black tracking-widest text-center">NULL_VECTOR</div>}
                            </div>
                        </div>

                        {/* Management Controls */}
                        <div className="glass-panel p-10 bg-app-obsidian border-l border-app-border space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-app-primary mb-6">Tactical Allocation</h4>
                                <select value={ticket.assigned_to_id || ''} onChange={(e) => handleAssignTicket(e.target.value)} disabled={isAssigning} className="w-full bg-app-void border border-app-border p-4 text-[11px] font-black uppercase tracking-widest italic outline-none focus:border-app-primary appearance-none">
                                    <option value="">UNASSIGNED_QUEUE</option>
                                    {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.full_name?.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-app-border">
                                <button onClick={() => setIsModalOpen(true)} className="w-full py-5 rounded-none bg-app-void hover:bg-app-primary border border-app-border hover:border-transparent text-app-text hover:text-app-void font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 italic"><MessageSquare size={18} /> Modulation Uplink</button>
                                {ticket.status === 'OPEN' && <button onClick={handleAcknowledge} className="w-full py-6 rounded-none bg-app-primary text-app-void font-black text-xs uppercase tracking-[0.4em] hover:brightness-110 active:scale-95 transition-all"><CheckCircle size={20} /> Acknowledge</button>}
                                {ticket.status === 'ASSIGNED' && <button onClick={handleStartWork} className="w-full py-6 rounded-none bg-app-secondary text-app-void font-black text-xs uppercase tracking-[0.4em] animate-pulse"><Zap size={20} /> Start Work</button>}
                                <button onClick={handleRemoteAssist} disabled={!ticket.related_asset_id || isRemoteRequested} className="w-full py-4 rounded-none bg-app-void border border-app-border text-app-text-muted hover:text-app-primary text-[10px] font-black uppercase tracking-widest italic">Radial RDP Assist</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Layer */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-app-void/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-app-obsidian border border-app-border p-12 relative overflow-hidden">
                        <div className="kinetic-scan-line" />
                        <h3 className="text-3xl font-black text-app-text uppercase italic mb-8">Protocol <span className="text-app-primary">Modulation</span></h3>
                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-widest block mb-4">Mutation Matrix</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                        <button key={status} onClick={() => setNewStatus(status)} className={`py-4 border text-[10px] font-black uppercase tracking-widest transition-all ${newStatus === status ? 'bg-app-primary text-app-void border-transparent shadow-xl' : 'bg-app-void border-app-border text-app-text-muted hover:border-app-primary'}`}>
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-widest block mb-4">Diagnostic Narrative</label>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-app-void border border-app-border p-6 text-sm font-black uppercase outline-none focus:border-app-primary h-40 resize-none italic" placeholder="APPEND LOG DATA..."></textarea>
                            </div>
                            <div className="flex gap-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border border-app-border text-[10px] font-black uppercase italic hover:bg-app-void/50">Abort</button>
                                <button onClick={handleUpdate} className="flex-[3] py-5 bg-app-primary text-app-void font-black uppercase italic shadow-xl">Commit Modulation</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SmartIdGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}
