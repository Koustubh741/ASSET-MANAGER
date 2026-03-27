import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import AssetTable from '@/components/AssetTable';
import SmartFiltersBar from '@/components/SmartFiltersBar';
import SavedViewsDrawer from '@/components/SavedViewsDrawer';
import apiClient from '@/lib/apiClient';

export default function SmartSearchPage() {
    // Generate Mock Data
    const [assets, setAssets] = useState([]);
    const [filteredAssets, setFilteredAssets] = useState([]);
    const [isSavedViewOpen, setIsSavedViewOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState(null);

    useEffect(() => {
        const loadAssets = async () => {
            try {
                const apiAssets = await apiClient.getAssets();
                setAssets(apiAssets);
                setFilteredAssets(apiAssets);
            } catch (error) {
                console.error('Failed to load assets:', error);
                setAssets([]);
                setFilteredAssets([]);
            }
        };

        loadAssets();
    }, []);

    const router = useRouter();

    // Effect to apply filters from URL query params
    useEffect(() => {
        if (!router.isReady || assets.length === 0) return;

        const { status, category, department, warranty, search } = router.query;

        // Construct initial filters based on URL or defaults
        const initialFilters = {
            status: status || 'All',
            category: category || 'All',
            department: department || 'All',
            warranty: warranty || 'All',
            search: search || ''
        };

        // We need to update the FilterBar UI as well, but for now let's just filter the results
        // Ideally SmartFiltersBar should take `initialFilters` prop. 
        // For this fix, we just run the filter logic.
        setCurrentFilters(initialFilters);
        handleFilterChange(initialFilters);

    }, [router.isReady, router.query, assets]);

    const handleFilterChange = (filters) => {
        let result = [...assets];

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.serial_number.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q)
            );
        }

        if (filters.status !== 'All') {
            result = result.filter(a => a.status === filters.status);
        }

        if (filters.category !== 'All') {
            result = result.filter(a => a.type === filters.category); // Assuming type maps to category
        }

        if (filters.department !== 'All') {
            result = result.filter(a => a.department === filters.department);
        }

        if (filters.warranty !== 'All') {
            const today = new Date();
            const warningDate = new Date();
            warningDate.setDate(today.getDate() + 30);

            result = result.filter(a => {
                const expiry = new Date(a.warranty_expiry);
                if (filters.warranty === 'Expired') return expiry < today;
                if (filters.warranty === 'Expiring Soon') return expiry >= today && expiry <= warningDate;
                if (filters.warranty === 'Active') return expiry > today;
                return true;
            });
        }

        if (filters.assignment && filters.assignment !== 'All') {
            if (filters.assignment === 'Unassigned') {
                result = result.filter(a => !a.assigned_to || a.assigned_to === 'Unassigned' || a.assigned_to === '');
            } else if (filters.assignment === 'Assigned') {
                result = result.filter(a => a.assigned_to && a.assigned_to !== 'Unassigned' && a.assigned_to !== '');
            }
        }

        setFilteredAssets(result);
    };

    const handleSaveView = (filters) => {
        setCurrentFilters(filters);
        setIsSavedViewOpen(true);
    };

    return (
        <div className="min-h-screen p-8 space-y-8">
            <Head>
                <title>Smart Search | Asset Management</title>
            </Head>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-app-text transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-app-text tracking-tight">Smart Asset Search</h1>
                        <p className="text-app-text-muted mt-1">Advanced filtering and reporting capabilities</p>
                    </div>
                </div>
                <div className="text-sm text-app-text-muted font-mono">
                    {filteredAssets.length} Results Found
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-6 rounded-2xl bg-app-surface-soft border border-app-border shadow-xl backdrop-blur-md">
                <SmartFiltersBar
                    onFilterChange={handleFilterChange}
                    onSaveView={handleSaveView}
                    initialFilters={currentFilters}
                />
            </div>

            {/* Results Table */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AssetTable assets={filteredAssets} />
            </div>

            {/* Saved Views Drawer */}
            <SavedViewsDrawer
                isOpen={isSavedViewOpen}
                onClose={() => setIsSavedViewOpen(false)}
                currentFilters={currentFilters}
                onLoadView={(filters) => {
                    setCurrentFilters(filters);
                    handleFilterChange(filters);
                }}
            />
        </div>
    );
}
