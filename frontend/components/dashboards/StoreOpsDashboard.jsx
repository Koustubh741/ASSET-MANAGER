import { useState, useEffect } from 'react'
import { 
    Store, 
    MonitorCheck, 
    CreditCard, 
    Wifi, 
    AlertCircle, 
    Users, 
    ClipboardCheck, 
    Zap,
    Tags,
    Smartphone
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function StoreOpsDashboard() {
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
                console.error('Failed to fetch StoreOps stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin"></div>
        </div>
    )

    const StoreStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-orange-500/30 transition-all group overflow-hidden relative">
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
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-orange-600 rounded-full shadow-[0_0_15px_rgba(234,88,12,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-orange-500">Retail</span> Store Ops
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Store size={12} className="text-orange-500" /> Ground Level Asset & Tech Readiness
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StoreStat label="Active POS Terminals" value="1,842" icon={MonitorCheck} color="blue" />
                <StoreStat label="EDC / Payment Assets" value="2,105" icon={CreditCard} color="emerald" />
                <StoreStat label="Network Degradations" value="12" icon={Wifi} color="rose" />
                <StoreStat label="Staff Handhelds" value="840" icon={Smartphone} color="orange" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Store Topography */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full group-hover:bg-orange-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-orange-500/10 text-orange-500">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Tech Readiness Map</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                        {[
                            { name: 'ZONE 1 (NORTH)', posHealth: 98, network: 'Stable', color: 'emerald' },
                            { name: 'ZONE 2 (SOUTH)', posHealth: 92, network: 'Degraded', color: 'amber' },
                            { name: 'ZONE 3 (EAST)', posHealth: 99, network: 'Stable', color: 'emerald' },
                            { name: 'ZONE 4 (WEST)', posHealth: 85, network: 'Critical Issue', color: 'rose' },
                        ].map((zone, i) => (
                            <div key={i} className="p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group/zone cursor-pointer">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{zone.name}</div>
                                    <div className={`p-1.5 bg-${zone.color}-500/10 text-${zone.color}-500 rounded-none`}>
                                        <AlertCircle size={14} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-black text-app-text-muted uppercase mb-1 tracking-widest">
                                            <span>POS Health</span>
                                            <span className={`text-${zone.color}-500`}>{zone.posHealth}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                            <div className={`h-full bg-${zone.color}-500`} style={{ width: `${zone.posHealth}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-app-border pt-2 mt-2">
                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-[0.2em]">Network Status</span>
                                        <span className={`text-[9px] font-black uppercase text-${zone.color}-500`}>{zone.network}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Maintenance Actions */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Urgent Dispatches</h3>
                    <div className="space-y-4 flex-1">
                        {[
                            { issue: 'Scanner Malfunction', store: 'STR-DEL-12', since: '2h', icon: Tags, color: 'amber' },
                            { issue: 'POS 4 Offline', store: 'STR-MUM-01', since: '4h', icon: MonitorCheck, color: 'rose' },
                            { issue: 'Staff Device Sync', store: 'STR-PUN-08', since: '1d', icon: Smartphone, color: 'blue' },
                        ].map((dispatch, i) => (
                            <div key={i} className="flex justify-between items-center gap-4 p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 bg-${dispatch.color}-500/10 text-${dispatch.color}-500`}>
                                        <dispatch.icon size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black text-app-text uppercase tracking-tight">{dispatch.issue}</div>
                                        <div className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest mt-0.5">{dispatch.store}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-500 uppercase">{dispatch.since}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-orange-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all">
                    Initiate Store Maintenance
                </button>
            </div>
        </div>
    )
}
