import { useState, useEffect } from 'react';
import {
    Trophy,
    Medal,
    Target,
    Zap,
    CheckCircle2,
    User,
    Share2,
    TrendingUp,
    Award,
    Search,
    Filter,
    Sparkles
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/router';
import { Dropdown, Menu } from 'antd';

export default function TopPerformersPage() {
    const router = useRouter();
    const { currentRole } = useRole();
    const [solvers, setSolvers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('lifetime');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');

    useEffect(() => {
        fetchSolvers();
    }, [timeRange]);

    const fetchSolvers = async () => {
        setIsLoading(true);
        try {
            const days = timeRange === 'monthly' ? 30 : null;
            const data = await apiClient.getTicketSolverStats(days);
            // Ensure data is sorted by count descending
            const sortedData = [...data].sort((a, b) => b.count - a.count);
            setSolvers(sortedData);
        } catch (error) {
            console.error('Failed to fetch solver stats:', error);
            setSolvers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const categories = ['All Categories', ...new Set(solvers.flatMap(s => s.categories || []))];

    const filteredSolvers = solvers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All Categories' || (s.categories && s.categories.includes(selectedCategory));
        return matchesSearch && matchesCategory;
    });

    const topPerformer = filteredSolvers[0];
    const totalResolutions = solvers.reduce((sum, s) => sum + s.count, 0);

    const handleViewPortfolio = (solver) => {
        router.push(`/performers/${solver.id}`);
    };

    const getRankStyles = (index) => {
        switch (index) {
            case 0: return {
                bg: 'bg-amber-500/20',
                text: 'text-amber-500',
                border: 'border-amber-500/30',
                icon: Trophy,
                shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            };
            case 1: return {
                bg: 'bg-slate-400/20',
                text: 'text-slate-500 dark:text-slate-400',
                border: 'border-slate-400/30',
                icon: Medal,
                shadow: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]'
            };
            case 2: return {
                bg: 'bg-orange-600/20',
                text: 'text-orange-600',
                border: 'border-orange-600/30',
                icon: Award,
                shadow: 'shadow-[0_0_20px_rgba(234,88,12,0.15)]'
            };
            default: return {
                bg: 'bg-indigo-500/10',
                text: 'text-indigo-500',
                border: 'border-indigo-500/10',
                icon: User,
                shadow: ''
            };
        }
    };

    return (
        <div className="min-h-screen p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Trophy size={24} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">IT Support Champions</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-lg ml-1">Celebrating our top problem solvers and engineering excellence.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Resolved</p>
                        <p className="text-xl font-bold text-emerald-500">{totalResolutions}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Team Members</p>
                        <p className="text-xl font-bold text-indigo-500">{solvers.length}</p>
                    </div>
                </div>
            </div>

            {/* Hero / Top Performer Section */}
            {topPerformer && !isLoading && (
                <div className="relative overflow-hidden group">
                    {/* Background Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-amber-500/30 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />

                    <div className="relative glass-panel p-8 lg:p-12 overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-orange-500/[0.03]">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest">
                                    <Sparkles size={14} /> Current Leader
                                </div>
                                <h2 className="text-xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight">
                                    {topPerformer.name}
                                </h2>
                                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                                    Expertly handled <span className="text-amber-500 font-bold">{topPerformer.count} tickets</span> this period. Consistently delivering high-performance solutions.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {['Optimization Guru', 'Efficiency Master', 'Top Rated'].map(tag => (
                                        <span key={tag} className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="pt-4 flex items-center gap-4">
                                    <button 
                                        onClick={() => handleViewPortfolio(topPerformer)}
                                        className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 dark:text-white font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                                    >
                                        View Portfolio <TrendingUp size={18} />
                                    </button>
                                    <button className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 rounded-xl transition-all">
                                        <Share2 size={20} className="text-slate-500 dark:text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative flex justify-center lg:justify-end">
                                <div className="w-64 h-64 lg:w-80 lg:h-80 relative">
                                    {/* Abstract Visual Representing the Performer */}
                                    <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse" />
                                    <div className="absolute inset-4 border-2 border-dashed border-amber-500/30 rounded-full animate-spin-slow" />
                                    <div className="absolute inset-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                                        <Trophy size={100} className="text-slate-900 dark:text-white drop-shadow-lg" />
                                    </div>

                                    {/* Stats Floating around */}
                                    <div className="absolute -top-4 -right-4 glass-card p-4 border-amber-500/30 backdrop-blur-xl animate-float">
                                        <p className="text-2xl font-black text-amber-500">{topPerformer.count}</p>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Resolved</p>
                                    </div>
                                    <div className="absolute -bottom-4 -left-4 glass-card p-4 border-emerald-500/30 backdrop-blur-xl animate-float" style={{ animationDelay: '1s' }}>
                                        <p className="text-2xl font-black text-emerald-500">100%</p>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">SLA Compliance</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation / Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search performers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Dropdown
                        menu={{
                            items: categories.map(cat => ({
                                key: cat,
                                label: cat,
                            })),
                            onClick: ({ key }) => setSelectedCategory(key),
                        }}
                        trigger={['click']}
                    >
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-amber-500/50 transition-all">
                            <span className="flex items-center gap-2">
                                <Filter size={16} /> {selectedCategory}
                            </span>
                        </button>
                    </Dropdown>
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setTimeRange('lifetime')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === 'lifetime' ? 'bg-amber-500 text-slate-900 dark:text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white'}`}
                        >
                            Lifetime
                        </button>
                        <button
                            onClick={() => setTimeRange('monthly')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === 'monthly' ? 'bg-amber-500 text-slate-900 dark:text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white'}`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
            </div>

            {/* Leaderboard Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 glass-panel animate-pulse" />
                        ))}
                    </div>
                ) : filteredSolvers.length === 0 ? (
                    <div className="glass-panel p-20 text-center">
                        <User size={48} className="mx-auto text-slate-700 dark:text-slate-300 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No performers matching your search terms.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredSolvers.map((solver, index) => {
                            const styles = getRankStyles(index);
                            const percent = (solver.count / topPerformer.count) * 100;

                            return (
                                <div
                                    key={solver.id || solver.name}
                                    className={`group relative glass-panel p-6 border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${styles.border} ${styles.shadow}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center justify-center w-12 text-2xl font-black text-slate-700 dark:text-slate-300">
                                            #{index + 1}
                                        </div>

                                        <div className={`p-3 rounded-2xl ${styles.bg} ${styles.text} group-hover:scale-110 transition-transform duration-300`}>
                                            <styles.icon size={28} />
                                        </div>

                                        <div className="flex-grow">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                                        {solver.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{solver.role || 'Systems Support Engineer'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{solver.count}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resolutions</p>
                                                </div>
                                            </div>

                                            <div className="relative h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${index === 0 ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-500'} transition-all duration-1000 ease-out`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="hidden lg:flex items-center gap-6 pl-6">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-emerald-500 flex items-center gap-1 justify-center">
                                                    <Zap size={14} /> {solver.mttr_hours || 0}h
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tighter">MTTR</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-blue-500 flex items-center gap-1 justify-center">
                                                    <CheckCircle2 size={14} /> {(Math.max(2.5, 5.0 - (solver.mttr_hours || 0) * 0.1)).toFixed(1)}/5
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-tighter">Est. CSAT</p>
                                            </div>
                                            <button 
                                                onClick={() => handleViewPortfolio(solver)}
                                                className="p-2 opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 rounded-lg transition-all"
                                            >
                                                <TrendingUp size={18} className="text-amber-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer / Recognition text */}
            <div className="text-center p-8 bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-amber-500/5 rounded-3xl border border-slate-200 dark:border-white/5">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    "Great things in business are never done by one person. They're done by a team of people."
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest">
                    <Medal size={16} /> Built for Excellence
                </div>
            </div>

            <style jsx>{`
                .glass-panel {
                    @apply bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none;
                }
                .glass-card {
                    @apply bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin 12s linear infinite;
                }
            `}</style>
        </div>
    );
}
