import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { 
    ChevronLeft, Award, Zap, Clock, CheckCircle, 
    MessageSquare, Shield, Globe, ExternalLink, Calendar,
    BarChart3, Target, Trophy, Briefcase
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

export default function SolverPortfolio() {
    const router = useRouter();
    const { id } = router.query;
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPortfolio = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await apiClient.getSolverPortfolio(id);
            setData(res);
        } catch (err) {
            console.error('Portfolio Error:', err);
            toast.error('Failed to fetch portfolio data');
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-app-text-muted uppercase tracking-widest animate-pulse">Syncing Portfolio Data...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.profile) return (
        <Layout className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] flex items-center justify-center p-6">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-200 bg-app-surface-soft rounded-full mx-auto animate-pulse flex items-center justify-center">
                    <User className="text-slate-400" size={32} />
                </div>
                <h3 className="text-xl font-black text-app-text uppercase tracking-widest">Profile Link Offline</h3>
                <p className="text-app-text-muted text-xs font-bold uppercase tracking-widest">Synchronizing secure node data...</p>
                <button 
                    onClick={() => router.push('/performers')}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-1"
                >
                    Return to Leaderboard
                </button>
            </div>
        </Layout>
    );

    const { profile = {}, stats = {}, expertise = [], recent_work = [] } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-app-border hover:bg-slate-50 dark:hover:bg-app-surface-soft transition-all group"
                    >
                        <ChevronLeft size={24} className="text-app-text-muted group-hover:text-slate-900 dark:group-hover:text-app-text group-hover:-translate-x-1 transition-all" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-app-text uppercase tracking-tight font-['Outfit'] italic">Solver Portfolio</h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                            <Shield size={12} className="animate-pulse" /> Verified Scylla Technician
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                     <div className="px-6 py-3 bg-white dark:bg-slate-900 border border-app-border rounded-2xl flex items-center gap-3">
                        <Trophy className="text-amber-500" size={20} />
                        <div>
                             <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mb-1">Global Rank</p>
                             <p className="text-lg font-black text-app-text tracking-tight leading-none">#{stats.global_rank || 'N/A'}</p>
                        </div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Profile Card & Stats */}
                <div className="lg:col-span-4 space-y-8">
                     <div className="glass-panel p-10 border border-app-border shadow-2xl bg-white dark:bg-slate-900/40 rounded-[3rem] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-transparent"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-blue-600 p-1.5 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
                                <div className="w-full h-full rounded-[2.8rem] bg-white dark:bg-slate-900 flex items-center justify-center border-4 border-slate-300 border-app-border">
                                    <span className="text-6xl font-black text-app-text italic drop-shadow-2xl">
                                        {profile.full_name?.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-8 text-center space-y-2">
                                <h2 className="text-xl font-black text-app-text tracking-tight font-['Outfit']">{profile.full_name}</h2>
                                <p className="text-sm font-bold text-app-text-muted italic">Managed by {profile.department}</p>
                            </div>

                            <div className="w-full h-px bg-slate-200 bg-app-surface-soft my-8"></div>

                            <div className="w-full space-y-4">
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                    <span className="text-app-text-muted flex items-center gap-2"><Award size={14} className="text-indigo-500" /> Designation</span>
                                    <span className="text-app-text">{profile.role}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                    <span className="text-app-text-muted flex items-center gap-2"><Globe size={14} className="text-blue-500" /> Ecosystem</span>
                                    <span className="text-app-text">{profile.department}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                    <span className="text-app-text-muted flex items-center gap-2"><Calendar size={14} className="text-emerald-500" /> Deployed Since</span>
                                    <span className="text-app-text">{profile.join_date}</span>
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Key Metrics Table */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-6 border border-app-border bg-white dark:bg-slate-900/20 rounded-3xl group hover:border-indigo-500/30 transition-all">
                            <Zap className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
                            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 leading-none">MTTR Velocity</p>
                            <p className="text-xl font-black text-app-text tracking-tight">{stats.mttr_hours}h</p>
                        </div>
                        <div className="glass-panel p-6 border border-app-border bg-white dark:bg-slate-900/20 rounded-3xl group hover:border-emerald-500/30 transition-all">
                            <CheckCircle className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
                            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 leading-none">Total Resolved</p>
                            <p className="text-xl font-black text-app-text tracking-tight">{stats.lifetime_resolved}</p>
                        </div>
                     </div>
                </div>

                {/* Right Column: Experience & Work */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Expertise Grid */}
                    <div className="glass-panel p-10 border border-app-border bg-white dark:bg-slate-900/40 rounded-[3rem] space-y-8">
                        <div className="flex items-center justify-between border-b border-app-border pb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20 shadow-sm dark:shadow-inner">
                                    <Target size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-app-text uppercase tracking-widest">Functional Expertise</h3>
                                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">Resolution Breakdown by Vertical</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {expertise && expertise.length > 0 ? (
                                expertise.map((exp, i) => (
                                    <div key={i} className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/[0.02] border border-app-border group hover:bg-slate-100 dark:hover:bg-app-surface-soft transition-all">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                                                {exp.category}
                                            </span>
                                            <span className="text-xs font-black text-app-text-muted">
                                                {stats?.lifetime_resolved > 0 ? Math.round((exp.count / stats.lifetime_resolved) * 100) : 0}% Proficiency
                                            </span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-2xl font-black text-app-text tracking-tight">{exp.count}</p>
                                                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Incidents Mitigated</p>
                                            </div>
                                            <div className="w-16 h-16 relative">
                                                <svg className="w-full h-full rotate-[-90deg]">
                                                    <circle cx="32" cy="32" r="28" className="fill-none stroke-slate-200 dark:stroke-white/5" strokeWidth="6" />
                                                    <circle 
                                                        cx="32" cy="32" r="28" className="fill-none stroke-indigo-500" strokeWidth="6" 
                                                        strokeDasharray={2 * Math.PI * 28} 
                                                        strokeDashoffset={(2 * Math.PI * 28) * (1 - (stats?.lifetime_resolved > 0 ? exp.count / stats.lifetime_resolved : 0))} 
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Zap size={14} className="text-indigo-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-16 text-center border border-dashed border-slate-300 border-app-border rounded-[3rem] opacity-50">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No operational data recorded for this node</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recently Resolved Gallery */}
                    <div className="glass-panel p-10 border border-app-border bg-white dark:bg-slate-900/40 rounded-[3rem] space-y-8">
                        <div className="flex items-center justify-between border-b border-app-border pb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                                    <BarChart3 size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-app-text uppercase tracking-widest">Mission Log</h3>
                                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">Recently Mitigated Operational Risks</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {recent_work && recent_work.length > 0 ? (
                                recent_work.map((ticket) => (
                                    <div 
                                        key={ticket.id}
                                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                                        className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/[0.02] border border-app-border rounded-[2rem] group cursor-pointer hover:border-indigo-500/30 hover:bg-slate-100 dark:hover:bg-app-surface-soft transition-all"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-app-text-muted group-hover:text-emerald-500 transition-all border border-slate-100 border-app-border">
                                                <MessageSquare size={24} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-app-text tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{ticket.subject}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest flex items-center gap-2">
                                                        <Briefcase size={12} /> {ticket.category}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">
                                                        {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right hidden md:block">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border 
                                                    ${ticket.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                      ticket.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                      'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                    {ticket.priority} Priority
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-app-text-muted group-hover:text-indigo-500 transition-all shadow-sm">
                                                <ExternalLink size={18} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center border border-dashed border-slate-300 border-app-border rounded-[3rem] opacity-50">
                                    <div className="w-16 h-16 bg-app-surface-soft rounded-2xl flex items-center justify-center mx-auto mb-6 border border-app-border">
                                        <ShieldCheck size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">No recent ticket resolutions in node history</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
