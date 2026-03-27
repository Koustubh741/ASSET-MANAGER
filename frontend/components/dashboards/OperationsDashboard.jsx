import { useState, useEffect } from 'react'
import { 
    Truck, 
    Home, 
    Box, 
    MapPin, 
    HardHat, 
    Settings, 
    Navigation, 
    Layers, 
    ArrowRightLeft,
    Clock,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { useRole } from '@/contexts/RoleContext'

export default function OperationsDashboard() {
    const { user } = useRole()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient.get('/api/v1/departments/stats')
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

    const OpsStat = ({ label, value, icon: Icon, color, trend }) => (
        <div className="glass-card p-6 border border-app-border hover:border-amber-500/30 transition-all group overflow-hidden relative">
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-${color}-500 opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                        <Icon size={24} />
                    </div>
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
            {/* Ops Header */}
            <div className="relative">
                <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-amber-600 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">
                    Logistics & <span className="text-amber-600">Facilities</span> Ops
                </h2>
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Truck size={12} className="text-amber-500" /> Infrastructure, supply chain & site maintenance matrix
                </p>
            </div>

            {/* Core Ops Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <OpsStat label="Total Site Assets" value={stats?.total_assets || 0} icon={Home} color="amber" />
                <OpsStat label="Active Shipments" value="8" icon={Truck} color="blue" />
                <OpsStat label="Maintenance Due" value="14" icon={Settings} color="rose" />
                <OpsStat label="Inventory Level" value="High" icon={Box} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Logistics & Movement */}
                <div className="lg:col-span-2 glass-panel p-8 border border-app-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full group-hover:bg-amber-500/10 transition-all duration-700"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Active Logistics</h3>
                        </div>
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                            8 In-Transit / 4 PENDING
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {[
                            { item: 'Office Furniture Set', route: 'HQ -> Pune Site', status: 'In Transit', progress: 65, color: 'blue' },
                            { item: 'Bulk Laptop Shipment', route: 'Vendor -> Bangalore', status: 'Customs Check', progress: 30, color: 'rose' },
                            { item: 'Server Rack Rails', route: 'Warehouse -> DC-1', status: 'Out for Delivery', progress: 92, color: 'emerald' },
                            { item: 'Workstation Monitors', route: 'Local Store -> Office', status: 'Delivered', progress: 100, color: 'slate' },
                        ].map((log, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <div className="text-sm font-black text-app-text uppercase tracking-tight">{log.item}</div>
                                        <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mt-1">{log.route}</div>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase text-${log.color}-500`}>{log.status}</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 bg-app-surface-soft rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${log.color}-500 transition-all duration-1000 ease-out`} 
                                        style={{ width: `${log.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Maintenance & Site Health */}
                <div className="glass-panel p-8 border border-app-border shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-8">Site Maintenance</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { site: 'Main HQ', task: 'HVAC Service', date: 'Oct 22', icon: HardHat, color: 'rose' },
                            { site: 'DC-1', task: 'UPS Testing', date: 'Oct 25', icon: Settings, color: 'blue' },
                            { site: 'Site B', task: 'Office Upgrade', date: 'Nov 02', icon: Layers, color: 'amber' },
                        ].map((task, i) => (
                            <div key={i} className="group p-5 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-app-border hover:border-amber-500/30 transition-all">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`p-2 rounded-xl bg-${task.color}-500/10 text-${task.color}-500`}>
                                        <task.icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black text-app-text uppercase tracking-widest">{task.task}</div>
                                        <div className="text-[9px] font-bold text-app-text-muted uppercase">{task.site}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-app-text uppercase tracking-widest bg-slate-200 bg-app-surface-soft px-2 py-1 rounded-lg">Due {task.date}</div>
                                    <button className="text-amber-500 hover:scale-110 transition-transform">
                                        <Navigation size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-2xl bg-amber-600 text-app-text text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/30 hover:shadow-amber-600/50 hover:scale-105 active:scale-95 transition-all">
                    New Dispatch
                </button>
                <button className="px-6 py-3 rounded-2xl bg-app-surface-soft text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                    Schedule Audit
                </button>
                <button className="px-6 py-3 rounded-2xl bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                    Track Containers
                </button>
            </div>
        </div>
    )
}
