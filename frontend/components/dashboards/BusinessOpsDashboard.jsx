import { useState, useEffect } from 'react'
import { 
    BarChart, 
    Layers, 
    Smartphone, 
    TrendingUp, 
    Palette, 
    Briefcase, 
    PieChart, 
    Target, 
    Video, 
    Share2,
    DollarSign,
    Zap,
    Users,
    Search,
    ChevronRight,
    Monitor
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function BusinessOpsDashboard() {
    const { user } = useRole()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient.get('/departments/stats')
                setStats(data)
                setLoading(false)
            } catch (error) {
                console.error('Failed to fetch biz-ops stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
        </div>
    )

    const BizStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-purple-500/30 transition-all group overflow-hidden relative">
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-${color}-500 opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
            <div className="relative z-10 flex items-center gap-4">
                <div className={`p-3 rounded-none bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-black text-app-text uppercase tracking-tighter">{value}</div>
                    <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{label}</div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Biz Ops Header */}
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    Business <span className="text-purple-600">Growth</span> & Strategy
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Target size={12} className="text-purple-500" /> Sales, marketing & product enablement matrix
                </p>
            </div>

            {/* Core Biz Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <BizStat label="Team Assets" value={stats?.total_assets || 0} icon={Briefcase} color="purple" />
                <BizStat label="Creative Stack" value="24" icon={Palette} color="rose" />
                <BizStat label="Field Devices" value="18" icon={Smartphone} color="blue" />
                <BizStat label="Budget Spent" value={`₹${((stats?.total_value || 0) / 1000).toFixed(1)}k`} icon={TrendingUp} color="emerald" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creative & Tooling Stack */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full group-hover:bg-purple-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-purple-500/10 text-purple-500">
                                <Layers size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Strategy Enablers</h3>
                        </div>
                        <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                            12 Premium Licenses ACTIVE
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {[
                            { name: 'Adobe Creative Cloud', user: 'Design Team', status: 'Enterprise', color: 'rose', icon: Palette },
                            { name: 'Figma Professional', user: 'Product Team', status: 'In Use', color: 'purple', icon: Share2 },
                            { name: 'Salesforce CRM', user: 'Sales Team', status: 'Active', color: 'blue', icon: Monitor },
                            { name: 'HubSpot Marketing', user: 'Marketing Team', status: 'Active', color: 'orange', icon: BarChart },
                        ].map((tool, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group/tool">
                                <div className={`p-3 rounded-none bg-${tool.color}-500/10 text-${tool.color}-500 group-hover/tool:scale-110 transition-transform`}>
                                    <tool.icon size={20} />
                                </div>
                                <div>
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-tight">{tool.name}</div>
                                    <div className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest">{tool.user}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 p-6 rounded-[2.5rem] bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14} /> Campaign Resource Readiness
                            </div>
                            <span className="text-[10px] font-black text-purple-600">88%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-[88%]" />
                        </div>
                    </div>
                </div>

                {/* Team Mobility & Field Ops */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Field Readiness</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { label: 'Tablets (Field Sales)', value: 12, max: 15, color: 'blue' },
                            { label: 'Design Workstations', value: 6, max: 8, color: 'rose' },
                            { label: 'Mobile Demo Kits', value: 4, max: 5, color: 'emerald' },
                        ].map((gauge, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{gauge.label}</div>
                                    <div className={`text-[10px] font-black text-${gauge.color}-500`}>{gauge.value}/{gauge.max}</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${gauge.color}-500 transition-all duration-1000 ease-out`} 
                                        style={{ width: `${(gauge.value / gauge.max) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border text-center">
                            <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Team ROI</div>
                            <div className="text-lg font-black text-emerald-500">12.4x</div>
                        </div>
                        <div className="p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border text-center">
                            <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Asset Health</div>
                            <div className="text-lg font-black text-blue-500">94.2%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-purple-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-105 active:scale-95 transition-all">
                    Request Creative SW
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Asset Verification
                </button>
                <button className="px-6 py-3 rounded-none bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                    Project Allocation
                </button>
            </div>
        </div>
    )
}
