import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Clock, User, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function TicketDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [note, setNote] = useState('');
    const [newStatus, setNewStatus] = useState('OPEN');

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
        } catch (error) {
            alert('Failed to update ticket: ' + error.message);
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

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;
    if (!ticket) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-500">Ticket not found or inaccessible.</div>;

    const getResolutionSteps = (t) => {
        const text = (t.subject + (t.description || '')).toLowerCase();
        if (text.includes('screen') || text.includes('display') || text.includes('monitor')) {
            return "1. Check for recent OS updates and roll back if necessary.\n2. Inspect HDMI/DisplayPort cables for damage.\n3. Run manufacturer's hardware diagnostic tool.\n4. If hardware failure is confirmed, initiate RMA process.";
        }
        if (text.includes('software') || text.includes('install')) {
            return "1. Verify license availability in Asset Manager.\n2. Check user's department approval status.\n3. Remote into user machine to perform admin installation.\n4. Verify software launch post-installation.";
        }
        if (text.includes('password') || text.includes('login')) {
            return "1. Verify user identity via callback.\n2. Reset password in IDM portal.\n3. Guide user to set up new MFA.";
        }
        if (text.includes('keyboard') || text.includes('mouse')) {
            return "1. Check USB connection ports.\n2. Replace with spare peripheral to test.\n3. Order replacement if confirmed faulty.";
        }
        return "1. Triage the issue priority.\n2. Check Knowledge Base for similar past incidents.\n3. Contact user for more details if needed.";
    };

    return (
        <div className="min-h-screen p-8 bg-slate-950 text-slate-100">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center space-x-4">
                    <Link href="/tickets" className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-white">{ticket.subject}</h1>
                            <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-semibold">{ticket.priority}</span>
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-semibold">{ticket.status}</span>
                        </div>
                        <p className="text-slate-400 mt-1 font-mono text-sm">{ticket.id}</p>
                    </div>
                </div>

                {/* AI Resolution Guide */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border border-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle size={100} />
                    </div>
                    <h3 className="text-lg font-bold text-indigo-300 mb-2 flex items-center gap-2">
                        <CheckCircle size={20} /> Recommended Resolution
                    </h3>
                    <div className="text-indigo-100/80 text-sm leading-relaxed whitespace-pre-line relative z-10">
                        {getResolutionSteps(ticket)}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200">
                            <h3 className="font-semibold text-lg mb-4 text-slate-200">Description</h3>
                            <p className="text-slate-300 leading-relaxed">{ticket.description}</p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200">
                            <h3 className="font-semibold text-lg mb-4 text-slate-200 flex items-center gap-2">
                                <MessageSquare size={18} /> Activity Log
                            </h3>
                            <div className="space-y-6 border-l-2 border-white/10 light:border-slate-200 pl-6 ml-2">
                                {(ticket.timeline || []).map((h, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600" />
                                        <div className="text-sm font-semibold text-slate-200">{h.action}</div>
                                        <div className="text-sm text-slate-400 mt-1">{h.comment}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <span>{h.byUser} ({h.byRole})</span>
                                            <span>•</span>
                                            <span>{new Date(h.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl bg-slate-900 border border-white/10 light:border-slate-200">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-4">Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Requester</div>
                                    <div className="flex items-center gap-2 text-slate-200 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 border border-indigo-500/30">
                                            <User size={12} />
                                        </div>
                                        {ticket.requestor_id}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Created At</div>
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <Clock size={14} className="text-slate-500" /> {new Date(ticket.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 light:border-slate-200">
                                    <div className="text-xs text-slate-500 mb-1">Impacted Asset</div>
                                    {ticket.related_asset_id ? (
                                        <Link href={`/assets/${ticket.related_asset_id}`} className="text-blue-400 hover:text-blue-300 text-sm font-mono block truncate">
                                            {ticket.related_asset_id}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-500 text-sm italic">None linked</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full py-3 bg-white/5 light:bg-slate-50 hover:bg-white/10 rounded-xl border border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 font-medium transition-colors hover:text-white light:hover:text-slate-900"
                        >
                            Update Ticket / Resolve
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 light:border-slate-200 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Update Ticket</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">New Status</label>
                                <select
                                    className="w-full bg-slate-950 border border-white/10 light:border-slate-200 rounded-xl px-4 py-2 text-white"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <option value="OPEN">Open</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Update Notes</label>
                                <textarea
                                    className="w-full bg-slate-950 border border-white/10 light:border-slate-200 rounded-xl px-4 py-2 text-white h-24"
                                    placeholder="Enter details about the action taken..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 bg-white/5 light:bg-slate-50 hover:bg-white/10 rounded-xl text-slate-400 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-white font-bold shadow-lg shadow-rose-500/20 transition-colors"
                                >
                                    Apply Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
