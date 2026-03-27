import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Split, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function AssetComparisonPage() {
    const [selectedAsset1, setSelectedAsset1] = useState(null);
    const [selectedAsset2, setSelectedAsset2] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // List for Selection
    const [assets, setAssets] = useState([]);

    useEffect(() => {
        // Load real assets
        const fetchAssets = async () => {
            try {
                const apiAssets = await apiClient.getAssets();
                setAssets(apiAssets);
            } catch (error) {
                console.error('Failed to fetch assets:', error);
            }
        };
        fetchAssets();
    }, []);

    const handleCompare = () => {
        if (!selectedAsset1 || !selectedAsset2) return;
        setLoading(true);

        // Simulate "Processing" for 500ms
        setTimeout(() => {
            const a1 = assets.find(a => String(a.id) === String(selectedAsset1));
            const a2 = assets.find(a => String(a.id) === String(selectedAsset2));

            if (a1 && a2 && a1.segment !== a2.segment) {
                setError("Not a valid comparison: IT and Non-IT assets cannot be compared side-by-side.");
                setComparisonData(null);
                setLoading(false);
                return;
            }

            setError(null);

            if (a1 && a2) {
                // Normalize specs to extract all keys dynamically
                const normalizeSpecs = (asset) => {
                    const s = asset.specifications || {};
                    const hw = s.hardware || {};
                    const os = s.os || {};

                    const isNonIT = asset.segment === 'NON-IT';

                    // Start with base specs
                    const baseSpecs = {
                        vendor: asset.vendor || 'Unknown',
                        segment: asset.segment || 'IT',
                        model: asset.model || 'N/A',
                        purchase_date: asset.purchase_date || 'N/A',
                        warranty: asset.warranty_expiry || 'N/A',
                        cost: asset.cost ? `₹${asset.cost.toLocaleString()}` : 'N/A'
                    };

                    // Add dynamic specs
                    let dynamicSpecs = {};
                    if (isNonIT) {
                        dynamicSpecs = {
                            material: s.material || 'N/A',
                            dimensions: s.dimensions || 'N/A',
                            color: s.color || 'N/A',
                            weight: s.weight || 'N/A',
                            brand: s.brand || 'N/A',
                            condition: s.condition || 'N/A'
                        };
                    } else {
                        // Extract everything from 'specifications' that isn't empty, 
                        // mapping common nested things (like hw/os) if they exist, but mostly trusting flat keys if present
                        dynamicSpecs = { ...s };
                        delete dynamicSpecs.hardware; // Don't try to render the raw object
                        delete dynamicSpecs.os;

                        // Map flat legacy keys if present
                        if (hw.processor) dynamicSpecs.Processor = hw.processor;
                        if (hw.cpu) dynamicSpecs.Processor = dynamicSpecs.Processor || hw.cpu;
                        if (s.cpu) dynamicSpecs.Processor = dynamicSpecs.Processor || s.cpu;

                        if (hw.ram) dynamicSpecs.RAM = hw.ram;
                        if (s.ram_mb) dynamicSpecs.RAM = dynamicSpecs.RAM || `${s.ram_mb} MB`;
                        if (s.RAM) dynamicSpecs.RAM = dynamicSpecs.RAM || s.RAM;

                        if (hw.storage) dynamicSpecs.Storage = hw.storage;
                        if (s.Storage) dynamicSpecs.Storage = dynamicSpecs.Storage || s.Storage;

                        if (hw.graphics) dynamicSpecs.Graphics = hw.graphics;
                        if (hw.gpu) dynamicSpecs.Graphics = dynamicSpecs.Graphics || hw.gpu;

                        if (os.name || os.version) dynamicSpecs['Operating System'] = `${os.name || ''} ${os.version || ''}`.trim();
                        if (s.os_name) dynamicSpecs['Operating System'] = dynamicSpecs['Operating System'] || s.os_name;
                        if (s.OS) dynamicSpecs['Operating System'] = dynamicSpecs['Operating System'] || s.OS;
                    }

                    // Clean out nulls/undefined/objects
                    for (const key in dynamicSpecs) {
                        if (dynamicSpecs[key] == null || typeof dynamicSpecs[key] === 'object' || dynamicSpecs[key] === '') {
                            delete dynamicSpecs[key];
                        }
                    }

                    return { ...baseSpecs, ...dynamicSpecs };
                };

                const specs1 = normalizeSpecs(a1);
                const specs2 = normalizeSpecs(a2);

                // Get union of all keys
                const allKeysSet = new Set([...Object.keys(specs1), ...Object.keys(specs2)]);

                // Ensure segment and model are at the top, followed by other common ones, then dynamic
                const preferredOrder = ['vendor', 'segment', 'model', 'purchase_date', 'warranty', 'cost', 'Processor', 'RAM', 'Storage', 'Operating System'];
                const allKeys = Array.from(allKeysSet).sort((keyA, keyB) => {
                    const indexA = preferredOrder.indexOf(keyA);
                    const indexB = preferredOrder.indexOf(keyB);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Both preferred: sort by preference
                    if (indexA !== -1) return -1; // Only A preferred: belongs at top
                    if (indexB !== -1) return 1; // Only B preferred: belongs at top
                    return keyA.localeCompare(keyB); // Neither preferred: alphabetical
                });

                setComparisonData({
                    asset1: { name: a1.name, condition: a1.status || 'Unknown' },
                    asset2: { name: a2.name, condition: a2.status || 'Unknown' },
                    specs1,
                    specs2,
                    allKeys
                });
            }
            setLoading(false);
        }, 300);
    };

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <Head>
                <title>Compare Assets | Asset Management</title>
            </Head>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-app-text transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Asset Comparison Tool</h1>
                        <p className="text-app-text-muted mt-1">Side-by-side specification analysis</p>
                    </div>
                </div>

                {/* Selection Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end p-6 glass-panel rounded-2xl bg-app-surface-soft border border-app-border">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-app-text-muted">Asset A</label>
                        <select
                            className="w-full bg-white dark:bg-slate-900 border border-app-border rounded-xl p-3 text-slate-900 dark:text-slate-200"
                            value={selectedAsset1 || ''}
                            onChange={(e) => setSelectedAsset1(e.target.value)}
                        >
                            <option value="">Select Asset...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.model} ({a.serial_number})</option>)}
                        </select>
                    </div>

                    <div className="hidden md:flex justify-center pb-3">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full border border-app-border text-app-text-muted">
                            <Split size={24} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-app-text-muted">Asset B</label>
                        <select
                            className="w-full bg-white dark:bg-slate-900 border border-app-border rounded-xl p-3 text-slate-900 dark:text-slate-200"
                            value={selectedAsset2 || ''}
                            onChange={(e) => setSelectedAsset2(e.target.value)}
                        >
                            <option value="">Select Asset...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.model} ({a.serial_number})</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2 flex justify-center mt-4 space-x-4">
                        <button
                            onClick={handleCompare}
                            disabled={!selectedAsset1 || !selectedAsset2 || loading}
                            className="btn btn-primary px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-app-text font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Analyzing...' : 'Compare Specifications'}
                        </button>
                        {comparisonData && (
                            <button
                                onClick={() => setComparisonData(null)}
                                className="px-8 py-3 rounded-xl bg-app-surface-soft border border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-app-text transition-all"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Comparison Result */}
                {comparisonData && (
                    <div className="grid grid-cols-3 gap-0 border border-app-border rounded-2xl bg-white dark:bg-slate-900/50 overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Headers */}
                        <div className="p-4 bg-slate-100 dark:bg-slate-950/50 border-b border-r border-app-border text-sm font-semibold text-app-text-muted uppercase tracking-wider flex items-center justify-center">
                            Specification
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900/50 border-b border-r border-app-border text-center font-bold text-lg text-emerald-400">
                            {comparisonData.asset1.name}
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900/50 border-b border-app-border text-center font-bold text-lg text-cyan-400">
                            {comparisonData.asset2.name}
                        </div>

                        {/* Rows */}
                        {comparisonData.allKeys.map(spec => {
                            const val1 = comparisonData.specs1[spec] || 'N/A';
                            const val2 = comparisonData.specs2[spec] || 'N/A';

                            const formatKey = (k) => {
                                if (k === 'segment') return 'Segment';
                                if (k === 'purchase_date') return 'Purchase Date';
                                return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            };

                            return (
                                <React.Fragment key={spec}>
                                    <div className="p-4 bg-slate-100 dark:bg-slate-950/30 border-b border-r border-app-border text-sm font-medium text-app-text-muted flex items-center justify-center text-center">
                                        {formatKey(spec)}
                                    </div>
                                    <div className="p-4 border-b border-r border-app-border text-center">
                                        <span className={`text-slate-900 dark:text-slate-200 ${spec === 'segment' ? 'px-2 py-0.5 rounded text-xs font-bold ' + (val1 === 'IT' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400') : ''}`}>
                                            {String(val1)}
                                        </span>
                                    </div>
                                    <div className="p-4 border-b border-app-border text-center">
                                        <span className={`text-slate-900 dark:text-slate-200 ${spec === 'segment' ? 'px-2 py-0.5 rounded text-xs font-bold ' + (val2 === 'IT' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400') : ''}`}>
                                            {String(val2)}
                                        </span>
                                    </div>
                                </React.Fragment>
                            );
                        })}

                        {/* Summary / Score */}
                        <div className="p-4 bg-slate-100 dark:bg-slate-950/30 border-r border-app-border text-sm font-bold text-app-text flex items-center justify-center">
                            Overall Condition
                        </div>
                        <div className="p-4 border-r border-app-border text-center">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                                {comparisonData.asset1.condition}
                            </span>
                        </div>
                        <div className="p-4 text-center">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
                                {comparisonData.asset2.condition}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
