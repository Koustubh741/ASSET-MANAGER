import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, List, Filter, Search, Tag, Calendar, User, Trash2, Plus } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

export default function SavedViewsPage() {
    const { preferences, updatePreferences } = useRole();
    const [search, setSearch] = useState('');

    const savedViews = preferences?.saved_views || [];

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this saved view?')) return;
        const updated = savedViews.filter(v => v.id !== id);
        try {
            await updatePreferences({ saved_views: updated });
        } catch (err) {
            console.error("Failed to delete saved view", err);
        }
    };

    const filteredViews = savedViews.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <Head>
                <title>Saved Views | Asset Management</title>
            </Head>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Saved Views Library</h1>
                            <p className="text-app-text-muted mt-1">Manage your personal and shared asset filters</p>
                        </div>
                    </div>
                    <Link href="/assets/search" className="btn btn-primary bg-purple-600 hover:bg-purple-500 text-app-text px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20">
                        <Plus size={20} /> New View
                    </Link>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-app-border">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search saved views..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredViews.length > 0 ? filteredViews.map(view => (
                        <div key={view.id} className="group relative bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-app-border rounded-2xl p-6 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDelete(view.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
                                    title="Delete View"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <Link
                                    href={{
                                        pathname: '/assets/search',
                                        query: view.filters,
                                    }}
                                    className="p-2 bg-purple-600 hover:bg-purple-500 text-app-text rounded-lg shadow-lg text-xs font-semibold flex items-center gap-1"
                                >
                                    Open <ArrowLeft size={12} className="rotate-180" />
                                </Link>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                                    <Filter size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-app-text">{view.name}</h3>
                                    <span className="text-xs text-app-text-muted">{view.created}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(view.filters).map(([key, val]) => (
                                        val !== 'All' && val !== '' && (
                                            <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-700 border border-app-border">
                                                <Tag size={10} className="text-app-text-muted" />
                                                <span className="opacity-70">{key}:</span> {val}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-app-border">
                                <div className="flex items-center gap-2">
                                    {view.shared && (
                                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            <User size={10} /> Shared
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center">
                            <div className="p-6 inline-block rounded-full bg-white dark:bg-slate-900 border border-app-border mb-4">
                                <Filter size={48} className="text-slate-700" />
                            </div>
                            <h3 className="text-xl font-bold text-app-text-muted">No Saved Views Found</h3>
                            <p className="text-app-text-muted mt-2 mb-6">Create a custom filter view in Smart Search to see it here.</p>
                            <Link href="/assets/search" className="text-purple-400 hover:text-purple-300 font-bold border-b border-purple-400/30 pb-1">
                                Go to Smart Search &rarr;
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
