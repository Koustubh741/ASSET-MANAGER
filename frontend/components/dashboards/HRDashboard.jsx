import { useState, useEffect } from 'react'
import { 
    Users, 
    UserPlus, 
    LogOut, 
    Gift, 
    Heart, 
    Clock, 
    ShieldCheck, 
    Briefcase, 
    FileText, 
    Search,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Activity
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function HRDashboard() {
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
                console.error('Failed to fetch HR stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
        </div>
    )

    const HRStat = ({ label, value, icon: Icon, color, trend }) => (
        <div className="glass-card p-6 border border-app-border hover:border-emerald-500/30 transition-all group overflow-hidden relative">
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-${color}-500 opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-none bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                        <Icon size={24} />
                    </div>
                    {trend && (
                        <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-none">
                            {trend}
                        </div>
                    )}
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
            {/* HR Header */}
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-emerald-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    People & <span className="text-emerald-600">Culture</span> Hub
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Heart size={12} className="text-emerald-500" /> Employee asset lifecycle & satisfaction matrix
                </p>
            </div>

            {/* Core HR Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <HRStat label="Active Members" value={stats?.total_members || 0} icon={Users} color="emerald" />
                <HRStat label="Pending Onboarding" value="12" icon={UserPlus} color="blue" trend="Next Batch" />
                <HRStat label="Offboarding Exit" value="3" icon={LogOut} color="rose" />
                <HRStat label="Employee NPS (Assets)" value="8.4" icon={Activity} color="amber" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Onboarding & Resource Readiness */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-emerald-500/10 text-emerald-500">
                                <Clock size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Onboarding Readiness</h3>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20">IT Ready: 85%</span>
                            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">Logistics: 92%</span>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {stats?.onboarding_assets?.length > 0 ? (
                            stats.onboarding_assets.slice(0, 5).map((asset, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 bg-app-surface-soft flex items-center justify-center font-black text-slate-500">
                                            {asset.assigned_user?.name?.[0] || 'A'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-app-text uppercase tracking-tight">{asset.assigned_user?.name || 'New Employee'}</div>
                                            <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{asset.model}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase text-emerald-500 mb-1">Allocated</div>
                                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Awaiting Handover</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <Activity className="mx-auto text-slate-300 mb-2" size={24} />
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending onboarding recorded</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cultural Asset Spotlight */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Swag & Culture</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { name: 'Welcome Kits', count: 45, icon: Gift, color: 'blue' },
                            { name: 'Remote Work Setup', count: 12, icon: Briefcase, color: 'emerald' },
                            { name: 'Training Budgets', count: '₹2.4L', icon: FileText, color: 'amber' },
                        ].map((item, i) => (
                            <div key={i} className="group p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`p-2 rounded-none bg-${item.color}-500/10 text-${item.color}-500`}>
                                        <item.icon size={20} />
                                    </div>
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{item.name}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-3xl font-black text-app-text uppercase tracking-tighter">{item.count}</div>
                                    <button className="p-2 rounded-none bg-slate-200 bg-app-surface-soft text-slate-500 group-hover:bg-emerald-500 group-hover:text-app-text transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-emerald-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all">
                    Initiate Onboarding
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Exit Workflow
                </button>
                <button className="px-6 py-3 rounded-none bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                    Employee Assets Audit
                </button>
            </div>
        </div>
    )
}
