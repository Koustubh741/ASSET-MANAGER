import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

export default function RFIDPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tagInputs, setTagInputs] = useState({});
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});

    useEffect(() => {
        apiClient.get('/assets')
            .then(r => {
                const list = Array.isArray(r) ? r : r?.assets || [];
                setAssets(list);
            })
            .catch(() => setAssets([]))
            .finally(() => setLoading(false));
    }, []);

    const assignTag = async (asset) => {
        const tag = tagInputs[asset.id]?.trim();
        if (!tag || tag === asset.serial_number) return;

        setSaving(s => ({ ...s, [asset.id]: true }));
        try {
            await apiClient.patch(`/assets/${asset.id}`, { serial_number: tag });
            setSaved(s => ({ ...s, [asset.id]: true }));

            // Root Fix: Clear input after successful save
            setTagInputs(p => {
                const newInputs = { ...p };
                delete newInputs[asset.id];
                return newInputs;
            });

            setTimeout(() => setSaved(s => ({ ...s, [asset.id]: false })), 2000);
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, serial_number: tag } : a));
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(s => ({ ...s, [asset.id]: false }));
        }
    };

    const filtered = assets.filter(a =>
        !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Head><title>RFID Management – Asset Manager Pro</title></Head>
            <div className="space-y-6">
                <header>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">📡 RFID Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Assign and manage RFID tags for physical asset tracking</p>
                </header>

                <div className="glass-card p-4 flex gap-4 items-center flex-wrap">
                    <input
                        type="text"
                        placeholder="Search assets by name or tag…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-white/15 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 min-w-[200px]"
                    />
                    <div className="flex gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <span><span className="text-slate-900 dark:text-white font-semibold">{assets.length}</span> total assets</span>
                        <span>•</span>
                        <span><span className="text-indigo-400 font-semibold">{assets.filter(a => a.serial_number).length}</span> tagged</span>
                    </div>
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">Loading assets…</div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-left">
                                    <th className="px-4 py-3 font-semibold">Asset Name</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Current RFID / Serial</th>
                                    <th className="px-4 py-3 font-semibold">Update Tag</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(asset => (
                                    <tr key={asset.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{asset.name}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{asset.type}</td>
                                        <td className="px-4 py-3">
                                            <span style={{
                                                background: asset.status === 'In Use' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.1)',
                                                color: asset.status === 'In Use' ? '#34d399' : '#9ca3af',
                                                padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600
                                            }}>{asset.status}</span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-indigo-300">
                                            {asset.serial_number || <span className="text-slate-500 dark:text-slate-400 italic">Not tagged</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="Enter RFID tag…"
                                                    value={tagInputs[asset.id] || ''}
                                                    onChange={e => setTagInputs(p => ({ ...p, [asset.id]: e.target.value }))}
                                                    className="bg-slate-100 dark:bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white w-36"
                                                />
                                                <button
                                                    onClick={() => assignTag(asset)}
                                                    disabled={
                                                        saving[asset.id] ||
                                                        !tagInputs[asset.id]?.trim() ||
                                                        tagInputs[asset.id]?.trim() === asset.serial_number
                                                    }
                                                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-semibold border ${saved[asset.id]
                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                            : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed'
                                                        }`}
                                                >
                                                    {saved[asset.id]
                                                        ? '✓ Saved'
                                                        : saving[asset.id]
                                                            ? '...'
                                                            : asset.serial_number ? 'Update' : 'Assign'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">No assets match your search.</div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
