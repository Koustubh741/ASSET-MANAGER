import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useAssetContext } from '@/contexts/AssetContext'
import AssetTable from '@/components/AssetTable'

export default function AssetsPage() {
    const { assets: contextAssets, refreshData } = useAssetContext()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refreshData()
        } finally {
            setIsRefreshing(false)
        }
    }
    const [assets, setAssets] = useState([])
    const [filteredAssets, setFilteredAssets] = useState([])
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('All')
    const [filterSegment, setFilterSegment] = useState('All')
    const [filterType, setFilterType] = useState('All')

    // Derived unique types for filter dropdown
    const uniqueTypes = ['All', ...new Set((assets || []).map(a => a?.type).filter(Boolean))].sort()


    useEffect(() => {
        // Use normalized assets from Context (Backend already sanitizes now)
        const parsed = Array.isArray(contextAssets) ? contextAssets : []
        setAssets(parsed)
        setFilteredAssets(parsed)
    }, [contextAssets])

    const router = useRouter()

    useEffect(() => {
        if (!router.isReady) return
        const { status, risk, segment, type } = router.query
        if (status) setFilterStatus(status)
        if (type) setFilterType(type)
        if (segment) {
            // Normalize Non-IT casing to match Select Option
            if (segment.toLowerCase() === 'non-it') setFilterSegment('NON-IT')
            else setFilterSegment(segment)
        }
    }, [router.isReady, router.query])

    useEffect(() => {
        let result = Array.isArray(assets) ? [...assets] : []
        const { risk, sort } = router.query || {}

        if (search) {
            const lowerSearch = search.toLowerCase();
            const deepSearch = (obj) => {
                if (!obj) return false;
                if (typeof obj === 'string' || typeof obj === 'number') {
                    return String(obj).toLowerCase().includes(lowerSearch);
                }
                if (typeof obj === 'object') {
                    return Object.values(obj).some(val => deepSearch(val));
                }
                return false;
            };

            result = result.filter(a => deepSearch(a));
        }
        if (filterStatus !== 'All') {
            if (filterStatus === 'In Use') {
                // Determine "In Use" by matching "Active"
                result = result.filter(a => a.status === 'Active' || a.status === 'In Use')
            } else {
                result = result.filter(a => (a.status || '').toLowerCase() === filterStatus.toLowerCase())
            }
        }
        if (filterSegment !== 'All') {
            result = result.filter(a => (a.segment || '').toLowerCase() === filterSegment.toLowerCase())
        }
        if (filterType !== 'All') {
            result = result.filter(a => (a.type || '').toLowerCase() === filterType.toLowerCase())
        }

        // Handle Location Query Param (Deep Linking)
        const { location } = router.query || {}
        if (location) {
            result = result.filter(a => (a.location || '').toLowerCase() === location.toLowerCase())
        }

        // Handle Warranty Risk Filter
        if (risk === 'warranty') {
            const today = new Date()
            const warningDate = new Date()
            warningDate.setDate(today.getDate() + 30)

            result = result.filter(a => {
                if (!a.warranty_expiry) return false
                const expiry = new Date(a.warranty_expiry)
                return expiry >= today && expiry <= warningDate
            })
        }

        // Handle Sorting
        if (sort === 'newest') {
            result.sort((a, b) => {
                const dateA = new Date(a.purchase_date || 0);
                const dateB = new Date(b.purchase_date || 0);
                return dateB - dateA; // Descending order
            });
        }

        setFilteredAssets(result)
    }, [search, filterStatus, filterSegment, filterType, assets, router.query])

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-app-text tracking-tight">Asset Inventory</h2>
                    <p className="text-app-text-muted mt-1">Manage and track all hardware and software assets</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh inventory (picks up newly discovered assets)"
                        className="px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 bg-app-surface hover:bg-white/20 text-app-text-muted hover:text-app-text border border-app-border backdrop-blur-sm flex items-center space-x-2 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <Link href="/assets/add" className="px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 bg-blue-600/90 hover:bg-blue-600 text-app-text shadow-lg shadow-blue-500/30 backdrop-blur-sm flex items-center space-x-2">
                        <Plus size={20} />
                        <span>Add Asset</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="backdrop-blur-md bg-app-surface-soft border border-app-border-soft border-app-border shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-text-muted" size={20} />
                    <input
                        type="text"
                        placeholder="Search by anything (Name, Spec, Location, Cost...)"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-xl py-3 pl-10 pr-4 text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-app-text-muted"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 text-app-text-muted">
                        <Filter size={20} />
                        <span className="font-medium hidden md:inline">Filter:</span>
                    </div>

                    <select
                        className="w-full px-4 py-3 bg-app-surface-soft border border-app-border rounded-lg text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-36 bg-slate-50 dark:bg-slate-800/50"
                        value={filterSegment}
                        onChange={(e) => setFilterSegment(e.target.value)}
                    >
                        <option value="All" className="bg-white dark:bg-slate-900 text-app-text">All Segments</option>
                        <option value="IT" className="bg-white dark:bg-slate-900 text-app-text">IT</option>
                        <option value="NON-IT" className="bg-white dark:bg-slate-900 text-app-text">NON-IT</option>
                    </select>

                    <select
                        className="w-full px-4 py-3 bg-app-surface-soft border border-app-border rounded-lg text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-36 bg-slate-50 dark:bg-slate-800/50"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        {uniqueTypes.map(t => (
                            <option key={t} value={t} className="bg-white dark:bg-slate-900 text-app-text">
                                {t === 'All' ? 'All Types' : t}
                            </option>
                        ))}
                    </select>

                    <select
                        className="w-full px-4 py-3 bg-app-surface-soft border border-app-border rounded-lg text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-40 bg-slate-50 dark:bg-slate-800/50"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All" className="bg-white dark:bg-slate-900 text-app-text">All Status</option>
                        <option value="In Use" className="bg-white dark:bg-slate-900 text-app-text">In Use</option>
                        <option value="In Stock" className="bg-white dark:bg-slate-900 text-app-text">In Stock</option>
                        <option value="Repair" className="bg-white dark:bg-slate-900 text-app-text">Repair</option>
                        <option value="Maintenance" className="bg-white dark:bg-slate-900 text-app-text">Maintenance</option>
                        <option value="Discovered" className="bg-white dark:bg-slate-900 text-app-text">Discovered</option>
                        <option value="Retired" className="bg-white dark:bg-slate-900 text-app-text">Retired</option>
                    </select>

                    {/* Results Count */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-app-border text-xs text-app-text-muted text-app-text-muted font-medium">
                        Showing <span className="text-app-text">{filteredAssets.length}</span> assets
                    </div>
                </div>
            </div>

            <AssetTable assets={filteredAssets} />
        </div>
    )
}
