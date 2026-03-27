import { useState } from 'react';
import { X, Scan, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function QuickScanner({ isOpen, onClose }) {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleScan = async (e) => {
        if (e) e.preventDefault();
        if (!serial) return;

        setLoading(true);
        setResult(null);
        try {
            const data = await apiClient.collectBarcodeScan(serial);
            setResult(data);
            setSerial('');
        } catch (error) {
            console.error('Scan failed:', error);
            setResult({ status: 'error', message: error.message || 'Scan failed' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-app-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-surface-soft">
                    <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                        <Scan size={20} className="text-indigo-400" />
                        Quick Field Scanner
                    </h2>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" aria-label="Close" title="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <form onSubmit={handleScan} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider">
                                Barcode / Serial Number
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={serial}
                                onChange={(e) => setSerial(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border rounded-lg p-4 text-app-text text-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-700"
                                placeholder="Scan or type SN..."
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !serial}
                            className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${loading || !serial
                                    ? 'bg-slate-50 dark:bg-slate-800 text-app-text-muted cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-app-text shadow-lg shadow-indigo-500/20'
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Log Scan Event'}
                        </button>
                    </form>

                    {result && (
                        <div className={`p-4 rounded-lg border animate-in slide-in-from-bottom-2 ${result.status === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                            <div className="flex gap-3">
                                {result.status === 'success' ? <CheckCircle className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                                <div>
                                    <div className="font-bold">
                                        {result.status === 'success' ? (result.action === 'verified' ? 'Asset Verified' : 'New Registration') : 'Scan Failed'}
                                    </div>
                                    <div className="text-sm opacity-80">
                                        {result.status === 'success'
                                            ? `Successfully processed SN: ${result.serial}`
                                            : result.message}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-app-text-muted text-center uppercase tracking-tighter">
                    Technician ID: AUTO-LOGGED | Location: GPS_DISABLED
                </div>
            </div>
        </div>
    );
}
