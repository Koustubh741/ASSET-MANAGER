import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Package, Clock, AlertTriangle, Activity, DollarSign, ArrowUpRight, ShieldCheck, Terminal, Layers } from 'lucide-react'
import BarChart from '@/components/BarChart'
import PieChart from '@/components/PieChart'
import TrendLineChart from '@/components/TrendLineChart'
import apiClient from '@/lib/apiClient'
import { sanitizeAsset, calculateDashboardStats } from '@/utils/assetNormalizer'

export default function SystemAdminAnalytics() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [chartMetric, setChartMetric] = useState('location')
    const [trendView, setTrendView] = useState('monthly')
    const [allAssets, setAllAssets] = useState([])
    const [stats, setStats] = useState(null)
    const [saasStats, setSaasStats] = useState({
        total_licenses: 0,
        monthly_spend: 0,
        discovered_count: 0
    })

    useEffect(() => {
        const load = async () => {
            try {
                const [assetResponse, apiLicenses] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getSoftwareLicenses()
                ])
                const apiAssets = assetResponse.data || []
                setAllAssets(apiAssets.map(sanitizeAsset))
                setSaasStats({
                    total_licenses: apiLicenses.length,
                    monthly_spend: apiLicenses.reduce((acc, curr) => acc + (curr.cost || 0), 0),
                    discovered_count: apiLicenses.filter(l => l.is_discovered).length
                })
            } catch (e) {
                console.error('Analytics load failed:', e)
                setAllAssets([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (allAssets.length === 0) return
        const s = calculateDashboardStats(allAssets)
        if (s) setStats(s)
    }, [allAssets])

    const handleGraphClick = (data) => {
        const name = data?.name ?? data?.payload?.name
        if (!name) return
        router.push(`/assets?${chartMetric}=${encodeURIComponent(name)}`)
    }

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass }) => (
        <div className={`p-6 border ${borderClass || 'border-white/10'} bg-white/[0.02] relative group hover:bg-white/5 transition-all overflow-hidden`}>
            {/* Decorative Corner */}
            <div className={`absolute top-0 right-0 w-8 h-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity ${colorClass}`}>
                <Icon size={32} />
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 border ${borderClass || 'border-white/10'} bg-white/5 flex items-center justify-center`}>
                        <Icon size={18} className={colorClass} />
                    </div>
                </div>
                <h3 className="text-2xl font-mono font-bold text-app-text tracking-tighter mb-1 uppercase italic">
                    {value}
                </h3>
                <p className="text-[9px] font-bold text-app-text-muted/60 uppercase tracking-[0.2em] mb-4">
                    {title}
                </p>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-mono text-app-text-muted/40 uppercase tracking-tighter italic">{subtext}</span>
                    <ArrowUpRight size={10} className="text-app-text-muted/20 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 pb-12 relative">
            {/* Background Telemetry */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none overflow-hidden select-none">
                <div className="text-[8px] font-mono text-primary/50 uppercase tracking-tighter text-right">
                    ANALYTICS_KERNEL_V4.2<br />
                    SYNC_STATUS: ACTIVE<br />
                    LOAD: {(Math.random() * 100).toFixed(2)}%
                </div>
            </div>

            <div className="border-l-2 border-primary pl-6 py-1">
                <h2 className="text-2xl font-bold text-app-text uppercase tracking-[0.15em] flex items-center gap-4">
                    SYSTEM_ANALYTICS
                    <div className="px-2 py-0.5 border border-primary/30 bg-primary/5 text-[9px] font-mono text-primary/60 tracking-widest">
                        LOG_VSTR_99
                    </div>
                </h2>
                <p className="text-app-text-muted mt-2 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                    <Activity size={14} className="text-primary animate-pulse" />
                    Telemetric Insight & Inventory Health Matrix
                </p>
            </div>

            <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 h-32 animate-pulse">
                                <div className="h-4 bg-white/5 w-2/3 mb-4" />
                                <div className="h-8 bg-white/10 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : !stats && allAssets.length === 0 ? (
                    <div className="border border-white/10 bg-white/5 p-16 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]"></div>
                        <p className="text-[11px] font-bold text-app-text-muted uppercase tracking-[0.3em] mb-8 relative z-10 italic">NO_DATA_REGISTRY_EMPTY</p>
                        <div className="flex flex-wrap justify-center gap-4 relative z-10">
                            <Link href="/assets/add" className="px-8 py-3 bg-primary text-white text-[9px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all border border-primary">INIT_ASSET</Link>
                            <Link href="/assets" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-app-text text-[9px] font-bold uppercase tracking-widest border border-white/10 transition-all">VIEW_INVENTORY</Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Main Distribution Chart */}
                        <div className="border border-white/10 bg-white/[0.02] p-8 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-white/5">
                                <div>
                                    <h3 className="text-[12px] font-bold text-app-text uppercase tracking-widest flex items-center gap-3">
                                        <Layers size={16} className="text-primary/70" />
                                        INVENTORY_SEGMENTATION
                                    </h3>
                                    <p className="text-[9px] text-app-text-muted/60 uppercase tracking-tighter mt-1 italic font-mono tabular-nums">DATA_POOL: {allAssets.length} OBJECTS_SYNCED</p>
                                </div>
                                <div className="flex gap-[1px] bg-white/5 p-[1px] border border-white/5 mt-4 md:mt-0">
                                    {['location', 'type', 'segment', 'status'].map((m) => (
                                        <button 
                                            key={m} 
                                            onClick={() => setChartMetric(m)} 
                                            className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${chartMetric === m ? 'bg-primary/20 text-primary border-primary/30' : 'text-app-text-muted/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-80 w-full animate-in fade-in duration-1000">
                                {chartMetric === 'segment' ? (
                                    <PieChart data={stats?.by_segment || []} onPieClick={handleGraphClick} />
                                ) : chartMetric === 'status' ? (
                                    <PieChart data={stats?.by_status || []} onPieClick={handleGraphClick} />
                                ) : (
                                    <BarChart data={chartMetric === 'type' ? (stats?.by_type || []) : (stats?.by_location || [])} onBarClick={handleGraphClick} />
                                )}
                            </div>
                        </div>

                        {/* Trend Chart */}
                        <div className="border border-white/10 bg-white/[0.02] p-8">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                                <h3 className="text-[12px] font-bold text-app-text uppercase tracking-widest flex items-center gap-3">
                                    <Activity size={16} className="text-purple-500/70" />
                                    EXPENDITURE_ALGORITHM
                                </h3>
                                <div className="flex gap-[1px] bg-white/5 p-[1px] border border-white/5">
                                    {['monthly', 'quarterly'].map((view) => (
                                        <button 
                                            key={view}
                                            onClick={() => setTrendView(view)}
                                            className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${trendView === view ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'text-app-text-muted/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {view}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <TrendLineChart data={trendView === 'monthly' ? stats?.trends?.monthly : stats?.trends?.quarterly} />
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Link href="/assets?risk=warranty">
                                <StatCard 
                                    title="Warranty_Risk"
                                    value={stats?.warranty_risk || 0}
                                    subtext="EXPY_T-MINUS_30D"
                                    icon={Clock}
                                    colorClass="text-rose-500"
                                    borderClass="border-rose-500/20"
                                />
                            </Link>
                            <Link href="/assets?status=Repair">
                                <StatCard 
                                    title="Active_Repair"
                                    value={stats?.repair || 0}
                                    subtext="PROTOCOL_OFFLINE"
                                    icon={AlertTriangle}
                                    colorClass="text-orange-500"
                                    borderClass="border-orange-500/20"
                                />
                            </Link>
                            <Link href="/assets?status=Discovered">
                                <StatCard 
                                    title="Unclaimed_Node"
                                    value={stats?.discovered || 0}
                                    subtext="NET_DISCOVERY_RESULT"
                                    icon={Activity}
                                    colorClass="text-purple-500"
                                    borderClass="border-purple-500/20"
                                />
                            </Link>
                            <Link href="/assets">
                                <StatCard 
                                    title="Portfolio_Cap"
                                    value={`₹${((stats?.total_value || 0) / 1000000).toFixed(1)}M`}
                                    subtext="VALUATION_AGGREGATE"
                                    icon={ DollarSign}
                                    colorClass="text-emerald-500"
                                    borderClass="border-emerald-500/20"
                                />
                            </Link>
                        </div>

                        {/* SaaS Section */}
                        <div className="border border-white/10 bg-white/[0.02] p-8">
                            <h3 className="text-[12px] font-bold text-app-text uppercase tracking-widest mb-8 pb-4 border-b border-white/5 flex items-center gap-3">
                                <Terminal size={16} className="text-blue-500/70" />
                                SOFTWARE_LICENSE_TELEMETRY
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Link href="/software" className="group p-4 border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all">
                                    <p className="text-[8px] font-bold text-app-text-muted/60 uppercase tracking-widest mb-1">Active_Units</p>
                                    <p className="text-xl font-mono font-bold text-app-text group-hover:text-blue-400 transition-colors uppercase italic">{saasStats.total_licenses}</p>
                                </Link>
                                <Link href="/software" className="group p-4 border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all">
                                    <p className="text-[8px] font-bold text-app-text-muted/60 uppercase tracking-widest mb-1">Monthly_Burn</p>
                                    <p className="text-xl font-mono font-bold text-app-text group-hover:text-success transition-colors uppercase italic">₹{saasStats.monthly_spend.toLocaleString()}</p>
                                </Link>
                                <Link href="/software" className="group p-4 border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all">
                                    <p className="text-[8px] font-bold text-app-text-muted/60 uppercase tracking-widest mb-1">Agent_Discovery</p>
                                    <p className="text-xl font-mono font-bold text-app-text group-hover:text-purple-400 transition-colors uppercase italic">{saasStats.discovered_count}</p>
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
