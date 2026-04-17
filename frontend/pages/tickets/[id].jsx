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

    if (loading) return <div className="min-h-screen bg-app-bg flex items-center justify-center text-app-text-muted font-bold tracking-widest">Loading Details...</div>;
    if (!ticket) return <div className="min-h-screen bg-app-bg flex items-center justify-center text-danger font-bold tracking-widest">Error: Ticket not found or access denied</div>;

    return (
        <div className="min-h-screen p-4 md:p-8 bg-app-bg text-app-text">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-app-border">
                    <div className="flex items-center space-x-5">
                        <button 
                            onClick={() => router.back()} 
                            className="p-2.5 bg-app-surface border border-app-border text-app-text-muted hover:text-primary transition-all shadow-md active:scale-95 rounded-card group"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-app-text">{ticket.subject}</h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warning/10 text-warning border-warning/20'
                                    }`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-app-surface-soft border border-app-border rounded-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => copyToClipboard(ticket.id, 'Ticket ID')}>
                                    <Shield size={12} className="text-primary" />
                                    <p className="text-[11px] font-mono font-medium text-app-text-muted hover:text-primary">
                                        {formatId(ticket.id, 'ticket', ticket)}
                                    </p>
                                </div>
                                <span className="text-[11px] text-app-text-muted uppercase font-medium">Ref: {ticket.id?.substring(0, 8)}</span>
                                <button onClick={() => setIsGuideOpen(true)} className="p-1 text-app-text-muted hover:text-primary transition-colors"><Info size={14} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-app-surface p-2 rounded-card border border-app-border shadow-sm">
                        <div className="flex flex-col items-end px-3 border-r border-app-border">
                            <span className="text-[10px] uppercase font-bold text-app-text-muted tracking-wide">System Status</span>
                            <span className="text-[11px] font-mono text-success font-semibold">ONLINE</span>
                        </div>
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
                            <RefreshCw size={14} />
                        </div>
                    </div>
                </div>

                {/* AI Panel */}
                <div className="glass-panel p-8 bg-app-surface border border-app-border rounded-card shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-4 border-b border-app-border/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary">
                                    <Cpu size={24} className={isAnalyzing ? 'animate-spin' : ''} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-app-text tracking-tight">AI Diagnostic Operation</h3>
                                    <p className="text-xs text-app-text-muted font-medium mt-1">Automated Root Cause & Resolution Analysis</p>
                                </div>
                            </div>
                            {!aiAnalysis && (
                                <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="btn-zenith px-6 py-2 shadow-md">
                                    {isAnalyzing ? 'Scanning...' : 'Run Diagnostic'}
                                </button>
                            )}
                        </div>

                        {aiAnalysis ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                <div className="md:col-span-8 space-y-6">
                                    <div className="p-5 bg-app-surface-soft border border-app-border rounded-card">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-primary block mb-3">Confidence Score</span>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-2 bg-app-border rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${Math.round(aiAnalysis.confidence_score * 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-bold text-primary">{Math.round(aiAnalysis.confidence_score * 100)}%</span>
                                        </div>
                                        <div className="mt-6 space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted flex items-center gap-2"><Terminal size={14} /> Suggested Resolution Steps</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {aiAnalysis.suggested_steps.map((step, i) => (
                                                    <div key={i} className="p-3 bg-app-surface border border-app-border rounded text-[12px] font-medium text-app-text leading-relaxed shadow-sm">{step}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-4 p-5 bg-primary/5 border border-primary/20 rounded-card">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Summary</h4>
                                    <p className="text-sm text-app-text-muted leading-relaxed">{aiAnalysis.category} issue detected. Proceed with the suggested technical steps to resolve.</p>
                                    <button onClick={handleAIAnalysis} className="mt-5 w-full py-2 bg-app-surface border border-app-border text-xs font-bold uppercase tracking-wider text-app-text-muted hover:text-primary transition-all rounded">Re-run Analysis</button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-sm font-medium text-app-text-muted opacity-60">System Ready for Intelligent Analysis...</div>
                        )}
                    </div>
                </div>

                {/* Main Grid Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="glass-panel p-8 bg-app-surface border border-app-border rounded-card shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6 flex items-center gap-3"><FileText size={18} /> Incident Narrative</h3>
                            <div className="p-6 bg-app-surface-soft border border-app-border rounded-card">
                                <p className="text-sm font-medium text-app-text leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="glass-panel p-8 bg-app-surface border border-app-border rounded-card shadow-sm">
                                <TicketComments ticketId={id} currentUser={user} />
                            </div>
                            <div className="glass-panel p-8 bg-app-surface border border-app-border rounded-card shadow-sm">
                                <TicketAttachments ticketId={id} currentUser={user} />
                            </div>
                            <div className="glass-panel p-8 bg-app-surface border border-app-border rounded-card shadow-sm">
                                <TicketTimeline timeline={ticket?.timeline} />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {/* SLA Info */}
                        {(ticket.sla_response_deadline || ticket.sla_resolution_deadline) && (
                            <div className={`p-6 bg-app-surface rounded-card border ${
                                ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED' ? 'border-danger' : 'border-app-border'
                            } shadow-sm`}>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-4">SLA Status</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium"><span>Response</span> <span className={ticket.sla_response_status === 'BREACHED' ? 'text-danger font-bold uppercase' : 'text-primary font-bold uppercase'}>{ticket.sla_response_status}</span></div>
                                        <div className="h-1.5 bg-app-border rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: '100%' }} /></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium"><span>Resolution</span> <span className={ticket.sla_resolution_status === 'BREACHED' ? 'text-danger font-bold uppercase' : 'text-success font-bold uppercase'}>{ticket.sla_resolution_status}</span></div>
                                        <div className="h-1.5 bg-app-border rounded-full overflow-hidden"><div className="h-full bg-success" style={{ width: '40%' }} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="glass-panel p-6 bg-app-surface border border-app-border rounded-card shadow-sm space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-app-surface-soft border border-app-border rounded flex items-center justify-center text-primary"><User size={18} /></div>
                                <div><div className="text-[10px] uppercase font-bold text-app-text-muted tracking-wider">Requestor</div><div className="text-sm font-semibold">{ticket.requestor_name}</div></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-app-surface-soft border border-app-border rounded flex items-center justify-center text-primary"><Clock size={18} /></div>
                                <div><div className="text-[10px] uppercase font-bold text-app-text-muted tracking-wider">Created On</div><div className="text-sm font-semibold">{new Date(ticket.created_at).toLocaleDateString()}</div></div>
                            </div>
                            <div className="pt-6 border-t border-app-border/50">
                                <div className="text-[10px] uppercase font-bold text-app-text-muted tracking-wider mb-3">Related Asset</div>
                                {ticket.related_asset_id ? (
                                    <Link href={`/assets/${ticket.related_asset_id}`} className="flex items-center justify-between p-3 bg-app-surface-soft hover:bg-primary/10 border border-app-border hover:border-primary/30 rounded text-sm font-semibold transition-all">
                                        {formatId(ticket.related_asset_id, 'asset')} <Monitor size={16} className="text-primary" />
                                    </Link>
                                ) : <div className="p-3 bg-app-surface-soft border border-app-border rounded text-xs font-medium text-app-text-muted text-center">None Assigned</div>}
                            </div>
                        </div>

                        {/* Management Controls */}
                        <div className="glass-panel p-6 bg-app-surface border border-app-border rounded-card shadow-sm space-y-8">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Assignment</h4>
                                <select value={ticket.assigned_to_id || ''} onChange={(e) => handleAssignTicket(e.target.value)} disabled={isAssigning} className="w-full bg-app-surface-soft border border-app-border rounded px-3 py-2.5 text-sm font-medium focus:border-primary outline-none">
                                    <option value="">Unassigned</option>
                                    {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.full_name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-app-border/50">
                                <button onClick={() => setIsModalOpen(true)} className="btn-zenith w-full py-3 flex justify-center items-center gap-2"><MessageSquare size={16} /> Update Details</button>
                                {ticket.status === 'OPEN' && <button onClick={handleAcknowledge} className="w-full py-3 rounded bg-success text-white font-bold text-xs uppercase tracking-wider hover:bg-success/90 transition-all flex justify-center items-center gap-2"><CheckCircle size={16} /> Acknowledge</button>}
                                {ticket.status === 'ASSIGNED' && <button onClick={handleStartWork} className="w-full py-3 rounded bg-primary text-white font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all flex justify-center items-center gap-2 animate-pulse"><Zap size={16} /> Start Work</button>}
                                <button onClick={handleRemoteAssist} disabled={!ticket.related_asset_id || isRemoteRequested} className="w-full py-3 rounded bg-app-surface-soft border border-app-border font-bold text-xs uppercase tracking-wider text-app-text-muted hover:text-primary hover:border-primary transition-all disabled:opacity-50">Request Remote Assist</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Layer */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-app-bg/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-app-surface border border-app-border rounded-xl shadow-2xl p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-app-text tracking-tight">Update Ticket Status</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-app-text-muted hover:text-danger hover:bg-danger/10 p-2 rounded transition-colors"><X size={20} /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-app-text-muted block mb-3">Status</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                        <button key={status} onClick={() => setNewStatus(status)} className={`py-2 px-3 rounded border text-[11px] font-bold uppercase tracking-wide transition-all ${newStatus === status ? 'bg-primary text-white border-primary shadow' : 'bg-app-surface-soft border-app-border text-app-text-muted hover:border-primary/50'}`}>
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-app-text-muted block mb-3">Internal Note</label>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-app-surface-soft border border-app-border p-4 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded resize-none min-h-[120px]" placeholder="Add details or findings..."></textarea>
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-app-border mt-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded border border-app-border font-bold text-sm text-app-text-muted hover:bg-app-surface-soft">Cancel</button>
                                <button onClick={handleUpdate} className="flex-[2] btn-zenith py-3">Save Updates</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SmartIdGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}
