import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

export default function NewTicketPage() {
    const router = useRouter();
    const { user, isStaff, isManagerial } = useRole();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [formData, setFormData] = useState({
        subject: '',
        priority: 'Medium',
        related_asset_id: '',
        description: '',
        assignment_group_id: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            // Ensure user is loaded before fetching restricted data
            if (!user) return;

            try {
                // Determine privileged status based on backend rules in assets.py
                const isPrivileged = isStaff || isManagerial;
                
                const [apiAssets, apiGroups] = await Promise.all([
                    isPrivileged ? apiClient.getAssets() : apiClient.getMyAssets(),
                    apiClient.getAssignmentGroups()
                ]);
                setAssets(apiAssets);
                setGroups(apiGroups);
            } catch (error) {
                console.error('Failed to load assets or groups:', error);
            }
        };
        fetchData();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            // ROOT FIX: Do NOT send requestor_id — backend derives it from JWT.
            // Also convert empty strings to null for optional UUID fields to prevent 422 errors.
            const ticketData = {
                subject: formData.subject,
                description: formData.description,
                priority: formData.priority,
                related_asset_id: formData.related_asset_id || null,
                assignment_group_id: formData.assignment_group_id || null,
            };

            await apiClient.createTicket(ticketData);
            setSubmitted(true);
        } catch (error) {
            alert('Failed to create ticket: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-xl font-bold text-emerald-400">Ticket Created!</h1>
                    <p className="text-app-text-muted">Your request has been submitted to the IT team.</p>
                    <Link href="/tickets" className="inline-block px-6 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:bg-slate-700 transition font-medium">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent">New Ticket</h1>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl bg-white dark:bg-slate-900 border border-app-border space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-app-text-muted text-app-text-muted mb-2">Subject</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none text-app-text"
                            placeholder="Brief summary of the issue"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-app-text-muted text-app-text-muted mb-2">Priority</label>
                            <select
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none text-app-text"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-app-text-muted text-app-text-muted mb-2">Related Asset</label>
                            <select
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none text-app-text"
                                value={formData.related_asset_id}
                                onChange={(e) => setFormData({ ...formData, related_asset_id: e.target.value })}
                            >
                                <option value="">Select Asset (Optional)</option>
                                {assets.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-app-text-muted mb-2">Assignment Group</label>
                            <select
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none text-app-text"
                                value={formData.assignment_group_id}
                                onChange={(e) => setFormData({ ...formData, assignment_group_id: e.target.value })}
                            >
                                <option value="">Auto-route (Default)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} {g.department ? `[${g.department}]` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Leave empty for automatic routing based on category.</p>
                        </div>
                        <div>
                            {/* Empty slot for layout alignment or category selection if needed */}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-app-text-muted text-app-text-muted mb-2">Description</label>
                        <textarea
                            rows={5}
                            required
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 outline-none text-app-text"
                            placeholder="Detailed description..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary bg-rose-600 hover:bg-rose-500 text-app-text px-8 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={20} /> {loading ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
