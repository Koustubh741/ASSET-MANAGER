import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Scan, CheckSquare, Camera } from 'lucide-react';

export default function AuditStartPage() {
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState('');
    const [assets, setAssets] = useState([]);

    const locations = ['Headquarters (NY)', 'Satellite Office (London)', 'Warehouse A', 'Remote Workers'];

    const handleStart = () => {
        setStep(2);
        // Mock load assets
        setTimeout(() => {
            setAssets(Array.from({ length: 5 }).map((_, i) => ({
                id: `AST-90${i}`,
                name: `Device ${i}`,
                scanned: false
            })));
        }, 500);
    };

    const handleScan = (id) => {
        setAssets(assets.map(a => a.id === id ? { ...a, scanned: true } : a));
    };

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-app-border rounded-2xl overflow-hidden glass-panel shadow-2xl">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900/50 p-6 border-b border-app-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/audit/overview" className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-lg text-app-text-muted">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold">New Asset Audit</h1>
                    </div>
                    <div className="text-sm text-app-text-muted">Step {step} of 3</div>
                </div>

                {/* Content */}
                <div className="p-8 min-h-[400px]">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin size={32} />
                                </div>
                                <h2 className="text-2xl font-bold">Select Location</h2>
                                <p className="text-app-text-muted">Where are you conducting this audit?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {locations.map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocation(loc)}
                                        className={`p-4 rounded-xl border text-left transition-all ${location === loc
                                                ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                                                : 'bg-app-surface-soft border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                            }`}
                                    >
                                        <div className="font-semibold">{loc}</div>
                                        <div className="text-xs text-app-text-muted mt-1">245 Assets</div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end mt-8">
                                <button
                                    disabled={!location}
                                    onClick={handleStart}
                                    className="btn btn-primary bg-orange-600 hover:bg-orange-500 text-app-text px-8 py-3 rounded-xl disabled:opacity-50 font-bold"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">Scanning Assets</h2>
                                    <p className="text-app-text-muted text-sm">Location: {location}</p>
                                </div>
                                <button className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-app-text-muted hover:bg-slate-200 dark:bg-slate-700 flex items-center gap-2">
                                    <Camera size={16} /> Open Scanner
                                </button>
                            </div>

                            <div className="space-y-3">
                                {assets.map(asset => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 bg-app-surface-soft rounded-xl border border-app-border">
                                        <div>
                                            <div className="font-medium">{asset.name}</div>
                                            <div className="text-xs text-app-text-muted">{asset.id}</div>
                                        </div>
                                        {asset.scanned ? (
                                            <div className="text-emerald-400 flex items-center gap-2 text-sm font-medium">
                                                <CheckSquare size={16} /> Verified
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleScan(asset.id)}
                                                className="px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded-lg text-sm font-medium border border-blue-500/30"
                                            >
                                                Mark Scanned
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between mt-8 pt-4 border-t border-app-border">
                                <div className="text-sm text-app-text-muted">
                                    {assets.filter(a => a.scanned).length} / {assets.length} Verified
                                </div>
                                <button
                                    onClick={() => setStep(3)}
                                    className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-app-text px-8 py-3 rounded-xl font-bold"
                                >
                                    Finish Audit
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center animate-in zoom-in-95 duration-300 py-12">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-app-text mb-2">Audit Complete</h2>
                            <p className="text-app-text-muted mb-8 max-w-md mx-auto">
                                The audit for <strong>{location}</strong> has been submitted successfully.
                                Report #AUD-2023-089 generated.
                            </p>
                            <Link href="/audit/overview" className="inline-block bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-app-text px-8 py-3 rounded-xl font-medium transition-colors">
                                Return to Overview
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
