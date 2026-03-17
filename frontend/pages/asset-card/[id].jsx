import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { initialMockAssets } from '@/data/mockAssets';
import { Shield, CheckCircle, Package } from 'lucide-react';

export default function AssetCard() {
    const router = useRouter()
    const { id } = router.query
    const [asset, setAsset] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return;

        // Load Data Logic
        const savedAssets = JSON.parse(localStorage.getItem('assets') || '[]');
        const allAssets = savedAssets.length > 0 ? savedAssets : initialMockAssets;

        // Lookup (loose equality for string vs number)
        const found = allAssets.find(a => a.id == id || a.serial_number === id);

        setAsset(found || null);
        setLoading(false);
    }, [id])

    if (loading) return <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">Loading Asset Card...</div>
    if (!asset) return <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center text-red-400 font-bold text-xl">Asset Not Found</div>

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-white dark:bg-slate-900 p-8 text-center border-b border-slate-800">
                    <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50">
                        <Package size={40} className="text-slate-900 dark:text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{asset.name}</h1>
                    <p className="text-blue-400 font-mono text-sm mt-1">{asset.serial_number}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">ASSET DETAILS</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {asset.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Model</span>
                            <span className="font-semibold text-slate-900">{asset.model}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Type</span>
                            <span className="font-semibold text-slate-900">{asset.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Serial Number</span>
                            <span className="font-semibold text-slate-900">{asset.serial_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Location</span>
                            <span className="font-semibold text-slate-900">{asset.location}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Assigned To</span>
                            <span className="font-semibold text-slate-900">{asset.assigned_to || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Purchase Date</span>
                            <span className="font-semibold text-slate-900">{asset.purchase_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Warranty Expiry</span>
                            <span className="font-semibold text-slate-900">{asset.warranty_expiry || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Internal ID</span>
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{asset.id}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100">
                    Proprietary Property • Do Not Remove
                </div>
            </div>
        </div>
    )
}
