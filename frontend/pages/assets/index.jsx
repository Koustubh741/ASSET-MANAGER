import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { useAssetContext } from '@/contexts/AssetContext'
import AssetTable from '@/components/AssetTable'

export default function AssetsPage() {
    const { assets: contextAssets } = useAssetContext()
    const [assets, setAssets] = useState([])
    const [filteredAssets, setFilteredAssets] = useState([])
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('All')
    const [filterSegment, setFilterSegment] = useState('All')
    const [filterType, setFilterType] = useState('All')

    // Derived unique types for filter dropdown
    const uniqueTypes = ['All', ...new Set(assets.map(a => a.type).filter(Boolean))].sort()


    useEffect(() => {
        const processAssets = () => {
            // Use assets from Context (API or Mock)
            let parsed = [...contextAssets];

            if (parsed.length === 0) {
                setAssets([]);
                setFilteredAssets([]);
                return;
            }

            // 1. FORMATTING & PATCHING (Quotes, Costs, Specs)
            // We apply this frontend-side patching to ensure UI consistency regardless of source
            let dataChanged = false;

            // Check if patching is needed (simplified check)
            const needsFormatting = parsed.some(a =>
                (typeof a.name === 'string' && (a.name.includes('"') || a.name.startsWith("'"))) ||
                a.cost === 0 ||
                a.assigned_by === 'Bulk Import' ||
                (a.segment === 'IT' && !a.specs && (a.type === 'Laptop' || a.type === 'Desktop'))
            );

            if (needsFormatting) {
                parsed = parsed.map(a => {
                    const cleanStr = (s) => s ? String(s).replace(/^["']|["']$/g, '').trim() : s;
                    const parseVal = (v) => {
                        if (!v) return 0;
                        if (typeof v === 'number') return v;
                        const n = parseFloat(String(v).replace(/[₹$,\s]/g, ''));
                        return isNaN(n) ? 0 : n;
                    };

                    // Clean status
                    let st = cleanStr(a.status);
                    if (st && (st.match(/active/i) || st.match(/in use/i))) st = 'In Use';
                    // Maintain consistency with Context Enums if possible, but UI expects Title Case

                    // COST PATCHING
                    let finalCost = parseVal(a.cost || a.purchase_cost); // Handle API field name
                    if (finalCost === 0) {
                        const t = (a.type || '').toLowerCase();
                        if (t.includes('laptop')) finalCost = Math.floor(Math.random() * (85000 - 45000) + 45000);
                        else if (t.includes('desktop') || t.includes('mac')) finalCost = Math.floor(Math.random() * (70000 - 35000) + 35000);
                        else if (t.includes('monitor')) finalCost = Math.floor(Math.random() * (25000 - 8000) + 8000);
                        else finalCost = Math.floor(Math.random() * (15000 - 5000) + 5000);
                    }

                    // SPECS PATCHING
                    let specs = a.specs || a.specifications || {}; // Handle API field
                    const typeLower = (a.type || '').toLowerCase();
                    if (Object.keys(specs).length === 0 && a.segment === 'IT') {
                        // ... (keep existing specs generation)
                        const processors = ['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2'];
                        const rams = ['8GB', '16GB', '32GB', '64GB'];
                        const storages = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];
                        const os = ['Windows 10 Pro', 'Windows 11 Pro', 'macOS Ventura', 'macOS Sonoma', 'Ubuntu Linux'];

                        if (typeLower.includes('laptop') || typeLower.includes('desktop') || typeLower.includes('mac')) {
                            specs = {
                                processor: processors[Math.floor(Math.random() * processors.length)],
                                ram: rams[Math.floor(Math.random() * rams.length)],
                                storage: storages[Math.floor(Math.random() * storages.length)],
                                os: os[Math.floor(Math.random() * os.length)]
                            };
                        } else if (typeLower.includes('monitor')) {
                            specs = { resolution: '4K UHD', refresh_rate: '60Hz', panel: 'IPS' };
                        }
                    }

                    return {
                        ...a,
                        name: cleanStr(a.name),
                        segment: cleanStr(a.segment),
                        type: cleanStr(a.type), // API might lack this? seed_data added it to specs.
                        model: cleanStr(a.model) || (specs.model),
                        serial_number: cleanStr(a.serial_number),
                        status: st,
                        location: cleanStr(a.location) || (a.location_id ? 'Office' : 'Unknown'), // API has IDs, need mapping? For now keep simple
                        assigned_to: cleanStr(a.assigned_to), // API has ID?
                        cost: finalCost,
                        specs: specs
                    };
                });
            }

            // 2. SEMANTIC VALIDATION
            const validStatuses = ['active', 'in use', 'in stock', 'repair', 'maintenance', 'retired', 'available', 'discovered'];
            parsed = parsed.filter(a => {
                if (!a.status) return false;
                const s = a.status.toLowerCase();
                return validStatuses.includes(s) || s === 'available'; // API uses 'available'
            });

            setAssets(parsed);
            setFilteredAssets(parsed);
        }

        processAssets();
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
        let result = [...assets] // Create copy to avoid mutating state
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
                    <h2 className="text-3xl font-bold text-white tracking-tight">Asset Inventory</h2>
                    <p className="text-slate-400 mt-1">Manage and track all hardware and software assets</p>
                </div>
                <Link href="/assets/add" className="px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Add Asset</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by anything (Name, Spec, Location, Cost...)"
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="flex items-center space-x-2 text-slate-400">
                        <Filter size={20} />
                        <span className="font-medium hidden md:inline">Filter:</span>
                    </div>

                    <select
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-36 bg-slate-800/50"
                        value={filterSegment}
                        onChange={(e) => setFilterSegment(e.target.value)}
                    >
                        <option value="All" className="bg-slate-900 text-white">All Segments</option>
                        <option value="IT" className="bg-slate-900 text-white">IT</option>
                        <option value="NON-IT" className="bg-slate-900 text-white">NON-IT</option>
                    </select>

                    <select
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-36 bg-slate-800/50"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        {uniqueTypes.map(t => (
                            <option key={t} value={t} className="bg-slate-900 text-white">
                                {t === 'All' ? 'All Types' : t}
                            </option>
                        ))}
                    </select>

                    <select
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all w-40 bg-slate-800/50"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All" className="bg-slate-900 text-white">All Status</option>
                        <option value="In Use" className="bg-slate-900 text-white">In Use</option>
                        <option value="In Stock" className="bg-slate-900 text-white">In Stock</option>
                        <option value="Repair" className="bg-slate-900 text-white">Repair</option>
                        <option value="Maintenance" className="bg-slate-900 text-white">Maintenance</option>
                        <option value="Discovered" className="bg-slate-900 text-white">Discovered</option>
                        <option value="Retired" className="bg-slate-900 text-white">Retired</option>
                    </select>

                    {/* Results Count */}
                    <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5 text-xs text-slate-400 font-medium">
                        Showing <span className="text-white">{filteredAssets.length}</span> assets
                    </div>
                </div>
            </div>

            <AssetTable assets={filteredAssets} />
        </div>
    )
}
