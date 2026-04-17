import { useState, useEffect } from 'react'
import { 
    Rocket, 
    Map, 
    Target, 
    CalendarDays, 
    Server, 
    PackageOpen, 
    LayoutDashboard, 
    MonitorCheck, 
    Construction,
    MapPin,
    Building2,
    CheckCircle2
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function NSODashboard() {
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
                console.error('Failed to fetch NSO stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        </div>
    )

    const NSOStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-indigo-500/30 transition-all group overflow-hidden relative">
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
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-indigo-600">New Store</span> Operating Matrix
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Rocket size={12} className="text-indigo-500" /> Rapid Location Deployment Dashboard
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NSOStat label="Active Rollouts" value="14" icon={Building2} color="indigo" />
                <NSOStat label="Pending IT Setup" value="6" icon={Server} color="rose" />
                <NSOStat label="Sites Constructing" value="8" icon={Construction} color="amber" />
                <NSOStat label="Ready For Handover" value="3" icon={CheckCircle2} color="emerald" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Store Rollout Tracker */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-indigo-500/10 text-indigo-500">
                                <Map size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Active Deployments</h3>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {[
                            { code: 'STR-BENGALURU-04', stage: 'Store IT Config', progress: 85, color: 'blue' },
                            { code: 'STR-MUMBAI-11', stage: 'Civil Construction', progress: 35, color: 'amber' },
                            { code: 'STR-DELHI-02', stage: 'Final Audit', progress: 95, color: 'emerald' },
                            { code: 'STR-PUNE-05', stage: 'Asset Requisition', progress: 15, color: 'rose' },
                        ].map((store, i) => (
                            <div key={i} className="p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <div className="text-sm font-black text-app-text uppercase tracking-tight">{store.code}</div>
                                        <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mt-1">{store.stage}</div>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase text-${store.color}-500`}>{store.progress}% COMPLETED</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${store.color}-500 transition-all duration-1000 ease-out`} 
                                        style={{ width: `${store.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline & Critical Path */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Critical Path</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { task: 'Network Rack Delivery', site: 'MUMBAI-11', date: 'Oct 22', icon: Server, color: 'rose' },
                            { task: 'POS Installation', site: 'PUNE-05', date: 'Oct 25', icon: MonitorCheck, color: 'blue' },
                            { task: 'Store Go-Live', site: 'BENGALURU-04', date: 'Nov 02', icon: Target, color: 'emerald' },
                        ].map((task, i) => (
                            <div key={i} className="group p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`p-2 rounded-none bg-${task.color}-500/10 text-${task.color}-500`}>
                                        <task.icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{task.task}</div>
                                        <div className="text-[9px] font-bold text-app-text-muted uppercase">{task.site}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-app-text uppercase tracking-widest bg-slate-200 bg-app-surface-soft px-2 py-1 inline-block">Due {task.date}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-indigo-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all">
                    Initiate Store Handover
                </button>
                <button className="px-6 py-3 rounded-none bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Request IT Deployment
                </button>
            </div>
        </div>
    )
}
