import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/apiClient';
import { Shield, CheckCircle, Package } from 'lucide-react';

export default function AssetCard() {
    const router = useRouter()
    const { id } = router.query
    const [asset, setAsset] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return;

        const fetchAsset = async () => {
            setLoading(true);
            try {
                const data = await apiClient.getAsset(id);
                setAsset(data);
            } catch (err) {
                console.error("Failed to load asset card", err);
                setAsset(null);
            } finally {
                setLoading(false);
            }
        };

        fetchAsset();
    }, [id])

    if (loading) return <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center text-app-text">Loading Asset Card...</div>
    if (!asset) return <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center text-red-400 font-bold text-xl">Asset Not Found</div>

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-white dark:bg-slate-900 p-8 text-center border-b border-slate-800">
                    <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50">
                        <Package size={40} className="text-app-text" />
                    </div>
                    <h1 className="text-2xl font-bold text-app-text tracking-tight">{asset.name}</h1>
                    <p className="text-blue-400 font-mono text-sm mt-1">{asset.serial_number}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <span className="text-app-text-muted font-medium text-sm">ASSET DETAILS</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {asset.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Model</span>
                            <span className="font-semibold text-slate-900">{asset.model}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Type</span>
                            <span className="font-semibold text-slate-900">{asset.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Serial Number</span>
                            <span className="font-semibold text-slate-900">{asset.serial_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Location</span>
                            <span className="font-semibold text-slate-900">{asset.location}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Assigned To</span>
                            <span className="font-semibold text-slate-900">{asset.assigned_to || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Purchase Date</span>
                            <span className="font-semibold text-slate-900">{asset.purchase_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Warranty Expiry</span>
                            <span className="font-semibold text-slate-900">{asset.warranty_expiry || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <span className="text-app-text-muted text-xs">Internal ID</span>
                            <span className="font-mono text-xs text-app-text-muted">{asset.id}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 text-center text-xs text-app-text-muted border-t border-slate-100">
                    Proprietary Property • Do Not Remove
                </div>
            </div>
        </div>
    )
}
