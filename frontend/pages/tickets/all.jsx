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
                const apiTickets = await apiClient.getTickets();
                
                // Map API tickets to frontend format
                const mappedTickets = apiTickets.map(t => ({
                    id: t.id,
                    subject: t.subject,
                    priority: t.priority || 'Medium',
                    status: t.status || 'Open',
                    user: t.requestor_id || 'System',
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
        <div className="min-h-screen p-8 bg-slate-950 text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center space-x-4">
                    <Link href="/tickets" className="p-2 rounded-xl hover:bg-white/10 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>

                    <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent">
                        {filterStatus === 'All' ? 'All Tickets' : `${filterStatus} Tickets`}
                    </h1>
                </div>

                <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/10 light:border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 uppercase font-medium text-xs border-b border-white/10 light:border-slate-200">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
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
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400">{t.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-200">{t.subject}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${t.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                                                t.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {t.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 light:text-slate-700">{t.status}</td>
                                        <td className="px-6 py-4 text-slate-400">{t.user}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/tickets/${t.id}`} className="text-rose-400 hover:text-rose-300 font-medium">View</Link>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
