import { useState } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

export default function BarcodeScanPage() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const search = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await apiClient.get(`/assets?serial_number=${encodeURIComponent(query.trim())}`);
            const list = Array.isArray(data) ? data : data?.assets || [];
            if (list.length === 0) {
                setError(`No asset found with serial / barcode: ${query}`);
            } else {
                setResult(list[0]);
            }
        } catch (e) {
            setError('Failed to search. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const statusColor = {
        'In Use': { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        'In Stock': { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
        'Retired': { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
    };
    const sc = result ? (statusColor[result.status] || { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' }) : null;

    return (
        <>
            <Head><title>Barcode / QR Scan – Asset Manager Pro</title></Head>
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="text-center">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">📷 Barcode / QR Scan</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Look up any asset by its serial number or barcode</p>
                </header>

                {/* Camera scan placeholder */}
                <div className="glass-card p-5 flex items-center gap-4 border border-dashed border-slate-300 dark:border-white/20">
                    <div className="text-xl">📷</div>
                    <div>
                        <p className="text-slate-900 dark:text-white text-sm font-semibold">Camera Scan</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Use your device camera to scan a QR or barcode</p>
                    </div>
                    <button
                        className="ml-auto px-4 py-2 rounded-lg text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-not-allowed opacity-60"
                        disabled
                    >Coming Soon</button>
                </div>

                {/* Manual lookup */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manual Lookup</h2>
                    <form onSubmit={search} className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Enter serial number or barcode…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="flex-1 bg-slate-100 dark:bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 font-semibold text-sm transition-all"
                        >{loading ? '…' : '🔍 Search'}</button>
                    </form>
                </div>

                {error && (
                    <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm">
                        ⚠ {error}
                    </div>
                )}

                {result && (
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{result.name}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{result.type} · {result.model}</p>
                            </div>
                            <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{result.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                ['Serial Number', result.serial_number],
                                ['Vendor', result.vendor],
                                ['Assigned To', result.assigned_to || '—'],
                                ['Location', result.location || '—'],
                                ['Cost', result.cost != null ? `₹${Number(result.cost).toLocaleString()}` : '—'],
                                ['Segment', result.segment || '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-white/4 rounded-lg p-3 border border-white/8">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">{k}</p>
                                    <p className="text-slate-900 dark:text-white font-medium truncate">{v}</p>
                                </div>
                            ))}
                        </div>
                        <a
                            href={`/assets/${result.id}`}
                            className="block text-center py-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 text-sm font-semibold transition-all"
                        >View Full Asset →</a>
                    </div>
                )}
            </div>
        </>
    );
}
