import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useAssetContext } from '@/contexts/AssetContext'
import AssetTable from '@/components/AssetTable'
import apiClient from '@/lib/apiClient'

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
    const [departments, setDepartments] = useState([])

    // Derived unique types for filter dropdown
    const uniqueTypes = ['All', ...new Set((assets || []).map(a => a?.type).filter(Boolean))].sort()


    useEffect(() => {
        // Use normalized assets from Context (Backend already sanitizes now)
        const parsed = Array.isArray(contextAssets) ? contextAssets : []
        setAssets(parsed)
        setFilteredAssets(parsed)

        const fetchDepts = async () => {
            try {
                const depts = await apiClient.getDepartments();
                setDepartments(depts);
            } catch (error) {
                console.error('Failed to fetch departments:', error);
            }
        };
        fetchDepts();
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 border border-primary/20 text-primary">
                        <Search size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-app-text tracking-tight uppercase">Asset Inventory</h2>
                        <p className="text-xs font-semibold uppercase tracking-widest text-app-text-muted mt-1">Global Hardware & Software Log</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="btn-zenith-outline px-6 py-2.5 text-[10px] disabled:opacity-50 flex items-center gap-2 border border-white/10 text-app-text-muted hover:bg-white/5 hover:text-white"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                        <span className="hidden sm:inline">{isRefreshing ? 'SYNCING...' : 'SYNC LEDGER'}</span>
                    </button>
                    <Link href="/assets/add" className="btn-zenith">
                        <Plus size={16} strokeWidth={3} />
                        <span>Init Asset</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-6 border border-app-border flex flex-col md:flex-row gap-6 items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-2 h-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-500"></div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary/50" size={16} />
                    <input
                        type="text"
                        placeholder="Search By Keyword, Serial No., or Location..."
                        className="w-full bg-app-surface-soft border border-app-border rounded-none py-3.5 pl-12 pr-4 text-xs font-medium text-app-text focus:outline-none focus:border-primary/50 placeholder:text-app-text-muted/50 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 text-primary/70">
                        <Filter size={16} />
                        <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline">Parameters:</span>
                    </div>

                    <select
                        className="w-full md:w-40 px-4 py-3 bg-app-surface-soft border border-app-border rounded-none text-xs font-medium text-app-text focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        value={filterSegment}
                        onChange={(e) => setFilterSegment(e.target.value)}
                    >
                        <option value="All" className="bg-app-obsidian text-app-text">All Sectors</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.name} className="bg-app-obsidian text-app-text">
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="w-full md:w-36 px-4 py-3 bg-app-surface-soft border border-app-border rounded-none text-xs font-medium text-app-text focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        {uniqueTypes.map(t => (
                            <option key={t} value={t} className="bg-app-obsidian text-app-text">
                                {t === 'All' ? 'Class: All' : t}
                            </option>
                        ))}
                    </select>

                    <select
                        className="w-full md:w-40 px-4 py-3 bg-app-surface-soft border border-app-border rounded-none text-xs font-medium text-app-text focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All" className="bg-app-obsidian text-app-text">State: Global</option>
                        <option value="In Use" className="bg-app-obsidian text-app-text">Active</option>
                        <option value="In Stock" className="bg-app-obsidian text-app-text">Stock</option>
                        <option value="Repair" className="bg-app-obsidian text-app-text">Repair</option>
                        <option value="Maintenance" className="bg-app-obsidian text-app-text">Maint</option>
                        <option value="Discovered" className="bg-app-obsidian text-app-text">Detected</option>
                        <option value="Retired" className="bg-app-obsidian text-app-text">Disabled</option>
                    </select>

                    {/* Results Count */}
                    <div className="bg-primary/5 px-4 py-3 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary shrink-0">
                        Vol: <span className="text-app-text">{filteredAssets.length}</span>
                    </div>
                </div>
            </div>

            <AssetTable assets={filteredAssets} />
        </div>
    )
}
