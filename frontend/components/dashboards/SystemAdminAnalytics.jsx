import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Package, Clock, AlertTriangle, Activity, DollarSign } from 'lucide-react'
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
                const [apiAssets, apiLicenses] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getSoftwareLicenses()
                ])
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

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Analytics</span>
                </h2>
                <p className="text-slate-400 mt-2 text-sm max-w-md">
                    Understand inventory health, risk, and trends at a glance.
                </p>
            </div>

            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl p-4 h-24 animate-pulse">
                                <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                                <div className="h-8 bg-white/10 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : !stats && allAssets.length === 0 ? (
                    <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-12 text-center">
                        <p className="text-slate-400 mb-4">No asset data yet. Add assets or run a scan to see analytics.</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link href="/assets/add" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Add Asset</Link>
                            <Link href="/assets" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 light:border-slate-200">View Assets</Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6 min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Asset Analytics</h3>
                                    <p className="text-slate-400 text-sm">Distribution and lifecycle metrics</p>
                                </div>
                                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 light:border-slate-200">
                                    {['location', 'type', 'segment', 'status'].map((m) => (
                                        <button key={m} onClick={() => setChartMetric(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartMetric === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white light:hover:text-slate-900'}`}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-80 w-full animate-in fade-in duration-500">
                                {chartMetric === 'segment' ? <PieChart data={stats?.by_segment || []} onPieClick={handleGraphClick} /> : chartMetric === 'status' ? <PieChart data={stats?.by_status || []} onPieClick={handleGraphClick} /> : <BarChart data={chartMetric === 'type' ? (stats?.by_type || []) : (stats?.by_location || [])} onBarClick={handleGraphClick} />}
                            </div>
                        </div>

                        <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Activity size={18} className="text-purple-400" />
                                        Cost & Renewal Trends
                                    </h3>
                                </div>
                                <select value={trendView} onChange={(e) => setTrendView(e.target.value)} className="bg-slate-800/50 border border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none">
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                            </div>
                            <div className="h-64 w-full">
                                <TrendLineChart data={trendView === 'monthly' ? stats?.trends?.monthly : stats?.trends?.quarterly} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Link href="/assets?risk=warranty" className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-4 transition-all duration-300 hover:border-rose-500/30 hover:bg-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20"><Clock size={18} className="text-rose-400" /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">Warranty risk</p>
                                        <p className="text-xl font-bold text-white">{(stats?.warranty_risk ?? 0)}</p>
                                        <p className="text-[10px] text-slate-500">Expiring in 30 days</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href="/assets?status=Repair" className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-4 transition-all duration-300 hover:border-orange-500/30 hover:bg-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20"><AlertTriangle size={18} className="text-orange-400" /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">In repair</p>
                                        <p className="text-xl font-bold text-white">{(stats?.repair ?? 0)}</p>
                                        <p className="text-[10px] text-slate-500">Needs attention</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href="/assets?status=Discovered" className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-4 transition-all duration-300 hover:border-purple-500/30 hover:bg-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"><Activity size={18} className="text-purple-400" /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">Discovered</p>
                                        <p className="text-xl font-bold text-white">{(stats?.discovered ?? 0)}</p>
                                        <p className="text-[10px] text-slate-500">Unclaimed</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href="/assets" className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-4 transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><DollarSign size={18} className="text-emerald-400" /></div>
                                    <div>
                                        <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">Inventory value</p>
                                        <p className="text-xl font-bold text-white">₹{(stats?.total_value ?? 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-500">Total</p>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                                <h3 className="text-xl font-bold text-white mb-1">Top locations</h3>
                                <p className="text-slate-400 text-sm mb-4">Assets by location</p>
                                <div className="h-64 w-full">
                                    <BarChart data={(stats?.by_location || []).slice(0, 8)} onBarClick={(data) => { const n = data?.name ?? data?.payload?.name; if (n) router.push(`/assets?location=${encodeURIComponent(n)}`); }} />
                                </div>
                            </div>
                            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                                <h3 className="text-xl font-bold text-white mb-1">Top asset types</h3>
                                <p className="text-slate-400 text-sm mb-4">Assets by type</p>
                                <div className="h-64 w-full">
                                    <BarChart data={(stats?.by_type || []).slice(0, 8)} onBarClick={(data) => { const n = data?.name ?? data?.payload?.name; if (n) router.push(`/assets?type=${encodeURIComponent(n)}`); }} />
                                </div>
                            </div>
                        </div>

                        <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                            <h3 className="text-xl font-bold text-white mb-1">Repair vs In Use</h3>
                            <p className="text-slate-400 text-sm mb-4">Share of deployable assets in repair</p>
                            <div className="h-56 w-full max-w-xs mx-auto">
                                {(stats?.active ?? 0) + (stats?.repair ?? 0) === 0 ? <div className="flex items-center justify-center h-full text-slate-500">No data available</div> : <PieChart minAngle={8} data={[{ name: 'In Use', value: stats?.active ?? 0 }, { name: 'In Repair', value: stats?.repair ?? 0 }]} onPieClick={(data) => { if (data?.name) router.push(`/assets?status=${encodeURIComponent(data.name === 'In Use' ? 'In Use' : 'Repair')}`); }} />}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                                <h3 className="text-xl font-bold text-white mb-1">Warranty expiring by month</h3>
                                <p className="text-slate-400 text-sm mb-4">Assets with warranty expiry per month</p>
                                <div className="h-64 w-full"><BarChart data={stats?.warranty_by_month || []} /></div>
                            </div>
                            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                                <h3 className="text-xl font-bold text-white mb-1">Asset age distribution</h3>
                                <p className="text-slate-400 text-sm mb-4">Fleet age by purchase date</p>
                                <div className="h-64 w-full"><BarChart data={stats?.age_distribution || []} /></div>
                            </div>
                        </div>

                        <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Software & SaaS</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <Link href="/software" className="rounded-xl p-4 bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200 hover:bg-white/10 transition-colors">
                                    <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">Active licenses</p>
                                    <p className="text-xl font-bold text-white mt-1">{saasStats.total_licenses}</p>
                                </Link>
                                <Link href="/software" className="rounded-xl p-4 bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200 hover:bg-white/10 transition-colors">
                                    <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">SaaS spend</p>
                                    <p className="text-xl font-bold text-white mt-1">₹{saasStats.monthly_spend.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500">Monthly</p>
                                </Link>
                                <Link href="/software" className="rounded-xl p-4 bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200 hover:bg-white/10 transition-colors">
                                    <p className="text-xs text-slate-400 light:text-slate-600 uppercase tracking-wider">Discovered via agent</p>
                                    <p className="text-xl font-bold text-white mt-1">{saasStats.discovered_count}</p>
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
