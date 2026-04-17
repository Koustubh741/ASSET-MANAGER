import { useState, useEffect } from 'react'
import { 
    Truck, 
    Box, 
    MapPin, 
    ArrowRightLeft, 
    Clock, 
    AlertTriangle,
    Navigation,
    PackageSearch,
    Container
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'
import QuickActionGrid from './QuickActionGrid'

export default function SCMDashboard() {
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
                console.error('Failed to fetch ops stats:', error)
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin"></div>
        </div>
    )

    const OpsStat = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card p-6 border border-app-border hover:border-amber-500/30 transition-all group overflow-hidden relative">
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
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-amber-600 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    <span className="text-amber-500">Supply Chain</span> Management
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Truck size={12} className="text-amber-500" /> Global Asset Logistics & Delivery Networks
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OpsStat label="Active Hubs" value="28" icon={MapPin} color="amber" />
                <OpsStat label="In-Transit IT Assets" value="482" icon={Truck} color="blue" />
                <OpsStat label="Warehouse Stock Check" value="98%" icon={Box} color="emerald" />
                <OpsStat label="Logistics Bottlenecks" value="2" icon={AlertTriangle} color="rose" />
            </div>

            <QuickActionGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Tracking */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full group-hover:bg-amber-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-none bg-amber-500/10 text-amber-500">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">National Corridors</h3>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {[
                            { item: 'Bulk Server Rack Deployment', route: 'HQ DC -> Pune NSO', status: 'In Transit', progress: 65, color: 'blue' },
                            { item: 'Cashier POS Scanners x20', route: 'Mumbai DC -> Mumbai Local', status: 'Delivered', progress: 100, color: 'emerald' },
                            { item: 'Zonal Manager Workstations', route: 'OEM -> Delhi DC', status: 'Customs Check', progress: 30, color: 'rose' },
                        ].map((log, i) => (
                            <div key={i} className="p-4 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <div className="text-sm font-black text-app-text uppercase tracking-tight">{log.item}</div>
                                        <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mt-1">{log.route}</div>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase text-${log.color}-500`}>{log.status}</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                    <div className={`h-full bg-${log.color}-500 transition-all duration-1000 ease-out`} style={{ width: `${log.progress}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hub Health */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">DC Hub Signals</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { hub: 'MUMBAI CENTRAL (WH1)', status: 'Clear', signal: 100, color: 'emerald' },
                            { hub: 'DELHI NORTH (WH2)', status: 'High Traffic', signal: 75, color: 'amber' },
                            { hub: 'PUNE TRANSIT (WH4)', status: 'Delayed', signal: 30, color: 'rose' },
                        ].map((hub, i) => (
                            <div key={i} className="group p-5 rounded-none bg-slate-50 dark:bg-white/[0.02] border border-app-border">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-[11px] font-black text-app-text uppercase tracking-widest leading-tight">{hub.hub}</div>
                                    <div className={`text-[9px] font-black uppercase text-${hub.color}-500 px-2 py-0.5 border border-${hub.color}-500/20 bg-${hub.color}-500/10`}>
                                        {hub.status}
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                    <div className={`h-full bg-${hub.color}-500`} style={{ width: `${hub.signal}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-none bg-amber-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all">
                    Initiate Hub Transfer
                </button>
            </div>
        </div>
    )
}
