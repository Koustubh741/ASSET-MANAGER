import Link from 'next/link';
import { ArrowLeft, Filter, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';

export default function AllTicketsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        if (router.isReady && router.query.status) {
            setFilterStatus(router.query.status);
        }
    }, [router.isReady, router.query]);

    useEffect(() => {
        const loadTickets = async () => {
            try {
                const ticketResponse = await apiClient.getTickets();
                const apiTickets = ticketResponse.data || [];

                // Map API tickets to frontend format
                const mappedTickets = apiTickets.map(t => ({
                    id: t.id,
                    display_id: t.display_id || t.id.slice(0, 8),
                    subject: t.subject,
                    priority: t.priority || 'Medium',
                    status: t.status || 'Open',
                    user: t.requestor_name || 'System',
                    created: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A',
                    description: t.description
                }));

                setTickets(mappedTickets);
            } catch (error) {
                console.error('Failed to load tickets:', error);
                setTickets([]);
            }
        };

        loadTickets();
    }, []);

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 rounded-none hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>

                    <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent">
                        {filterStatus === 'All' ? 'All Tickets' : `${filterStatus} Tickets`}
                    </h1>
                </div>

                <div className="glass-panel p-6 rounded-none bg-app-surface-soft border border-app-border">
                    <table className="w-full text-left text-sm">
                        <thead className="text-app-text-muted uppercase font-medium text-xs border-b border-app-border">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {tickets
                                .filter(t => {
                                    if (filterStatus === 'All') return true;
                                    const s = t.status?.toUpperCase();
                                    const fs = filterStatus.toUpperCase();
                                    if (fs === 'OPEN') return s === 'OPEN' || s === 'IN_PROGRESS';
                                    if (fs === 'CLOSED') return s === 'CLOSED' || s === 'RESOLVED';
                                    return s === fs;
                                })
                                .map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-[100px]">{t.display_id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{t.subject}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${t.priority === 'High' || t.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                                                t.priority === 'Medium' || t.priority === 'MEDIUM' ? 'bg-orange-500/10 text-orange-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {t.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                ['OPEN', 'IN_PROGRESS'].includes(t.status?.toUpperCase()) ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                                ['RESOLVED', 'CLOSED'].includes(t.status?.toUpperCase()) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                'bg-slate-500/10 text-slate-500'
                                            }`}>{t.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-app-text-muted text-sm truncate">{t.user}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/tickets/${t.id}`} className="text-rose-500 hover:text-rose-400 font-medium text-sm">View →</Link>
                                        </td>
                                    </tr>
                                ))}
                            {tickets.filter(t => {
                                if (filterStatus === 'All') return true;
                                const s = t.status?.toUpperCase();
                                const fs = filterStatus.toUpperCase();
                                if (fs === 'OPEN') return s === 'OPEN' || s === 'IN_PROGRESS';
                                if (fs === 'CLOSED') return s === 'CLOSED' || s === 'RESOLVED';
                                return s === fs;
                            }).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                        No tickets found for <strong>{filterStatus}</strong> filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
