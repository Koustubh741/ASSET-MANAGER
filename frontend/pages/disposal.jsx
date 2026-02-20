import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, ShieldAlert, HardDrive, CheckCircle, AlertTriangle, FileText, X, ShieldCheck, User } from 'lucide-react'
import apiClient from '../lib/apiClient'

// --- Helper: Action Modal ---
const ActionModal = ({ isOpen, onClose, title, data, onConfirm, actionLabel, stepType }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className={`relative rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${stepType === 'dispose' ? 'bg-[#1a0505] border-red-900/50' : 'bg-[#0f172a] border-white/10 light:border-slate-200'}`}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${stepType === 'dispose' ? 'bg-red-900/20 border-red-900/30' : 'bg-slate-900/50 border-white/10 light:border-slate-200'}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${stepType === 'dispose' ? 'text-red-400' : 'text-white'}`}>
                        {stepType === 'dispose' && <AlertTriangle size={20} />}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Asset Confirmation */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 light:border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Asset Target</p>
                        <h4 className="text-white font-medium text-lg">{data.name}</h4>
                        <p className="text-slate-400 text-sm font-mono">{data.serial_number}</p>
                    </div>

                    {/* Step Specific Details */}
                    {stepType === 'validate' && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Validation Summary</h4>
                            <div className="flex justify-between text-sm py-2 border-b border-white/5 light:border-slate-200">
                                <span className="text-slate-400">Current Status</span>
                                <span className="text-slate-200">{data.status}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-white/5 light:border-slate-200">
                                <span className="text-slate-400">Last Assignment</span>
                                <span className="text-slate-200">{data.assigned_to || 'None'}</span>
                            </div>
                        </div>
                    )}

                    {stepType === 'wipe' && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-yellow-500 uppercase tracking-wider">Wipe Protocol</h4>
                            <div className="bg-yellow-500/10 rounded-lg p-3 text-sm text-yellow-200 border border-yellow-500/20">
                                This action creates a permanent data destruction record. Ensure the device is connected.
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-white/5 light:border-slate-200">
                                <span className="text-slate-400">Wipe Method</span>
                                <span className="text-slate-200 font-mono">DoD 5220.22-M (3 Pass)</span>
                            </div>
                        </div>
                    )}

                    {stepType === 'dispose' && (
                        <div className="space-y-4">
                            <div className="bg-red-500/10 rounded-lg p-4 text-sm text-red-200 border border-red-500/20 flex items-start gap-3">
                                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold mb-1">Irreversible Action</p>
                                    This asset will be permanently marked as <strong>Retired</strong>. It will be removed from active inventory counts.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900/50 border-t border-white/10 light:border-slate-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors">Cancel</button>
                    <button
                        onClick={() => onConfirm(data.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all flex items-center gap-2
                            ${stepType === 'validate' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' :
                                stepType === 'wipe' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-500/20 text-black' :
                                    stepType === 'dispose' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-slate-700'}
                        `}
                    >
                        {stepType === 'validate' && <CheckCircle size={16} />}
                        {stepType === 'wipe' && <HardDrive size={16} />}
                        {stepType === 'dispose' && <Trash2 size={16} />}
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Disposal() {
    const [loading, setLoading] = useState(true)
    const [assets, setAssets] = useState([])
    const [error, setError] = useState(null)
    const [modalConfig, setModalConfig] = useState(null)

    const fetchQueue = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiClient.getDisposalQueue();
            setAssets(data);
        } catch (err) {
            console.error("Failed to fetch disposal queue:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, [])

    const openActionModal = (asset, action) => {
        let config = { isOpen: true, data: asset };

        if (action === 'validate') {
            config.title = "Validate Asset for Disposal";
            config.actionLabel = "Confirm Validation";
            config.stepType = 'validate';
            config.onConfirm = handleValidate;
        } else if (action === 'wipe') {
            config.title = "Confirm Secure Data Wipe";
            config.actionLabel = "Execute Wipe";
            config.stepType = 'wipe';
            config.onConfirm = handleWipe;
        } else if (action === 'dispose') {
            config.title = "Finalize Asset Disposal";
            config.actionLabel = "Retire Asset";
            config.stepType = 'dispose';
            config.onConfirm = handleDispose;
        }

        setModalConfig(config);
    }

    const handleValidate = async (id) => {
        try {
            await apiClient.validateDisposal(id);
            await fetchQueue();
            setModalConfig(null);
        } catch (err) {
            alert("Validation failed: " + err.message);
        }
    };

    const handleWipe = async (id) => {
        try {
            await apiClient.recordWipe(id);
            await fetchQueue();
            setModalConfig(null);
        } catch (err) {
            alert("Wipe failed: " + err.message);
        }
    };

    const handleDispose = async (id) => {
        try {
            await apiClient.finalizeDisposal(id);
            await fetchQueue();
            setModalConfig(null);
        } catch (err) {
            alert("Disposal failed: " + err.message);
        }
    };


    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p>Loading Disposal Queue...</p>
        </div>
    )

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white light:text-slate-800 tracking-tight">Disposal & Retirement</h2>
                    <p className="text-slate-400 mt-1">End-of-life Governance: Validation ➝ Wipe ➝ Dispose</p>
                </div>
                <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center transition-colors border border-white/5 light:border-slate-200">
                    <ArrowLeft size={16} className="mr-2" /> Dashboard
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                    <h3 className="text-white font-bold text-lg">Failed to load data</h3>
                    <p className="text-red-400/80 mb-4">{error}</p>
                    <button onClick={fetchQueue} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                        Try Again
                    </button>
                </div>
            )}

            {!error && assets.length === 0 && (
                <div className="bg-slate-900/40 border border-white/5 light:border-slate-200 rounded-2xl p-12 text-center">
                    <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-slate-500" size={40} />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Queue is Empty</h3>
                    <p className="text-slate-400 max-w-sm mx-auto">
                        There are currently no assets marked for disposal. Assets appear here when their status is changed to 'Scrap'.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map(asset => (
                    <div key={asset.id} className={`glass-card p-6 border-l-4 transition-all duration-300 ${asset.disposal_status === 'RETIRED' ? 'border-l-slate-600 opacity-60' :
                            asset.disposal_status === 'WIPED' ? 'border-l-red-500' :
                                asset.disposal_status === 'WIPE_PENDING' ? 'border-l-yellow-500' : 'border-l-blue-500'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-white light:text-slate-800 text-lg">{asset.name}</h3>
                                <p className="text-slate-400 text-sm font-mono">{asset.serial_number}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${asset.disposal_status === 'RETIRED' ? 'bg-slate-800 text-slate-500' : 'bg-white/5 text-white'
                                }`}>
                                {asset.disposal_status === 'RETIRED' ? <CheckCircle size={20} /> : <Trash2 size={20} />}
                            </div>
                        </div>

                        <div className="mb-6 bg-black/20 rounded-lg p-3">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-slate-500 text-xs uppercase font-bold">Status</span>
                                <span className={`font-mono font-medium text-xs px-2 py-0.5 rounded ${asset.disposal_status === 'RETIRED' ? 'bg-slate-700 text-slate-400' : 'bg-white/10 text-white'
                                    }`}>
                                    {asset.disposal_status.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {asset.disposal_status === 'SCRAP_CANDIDATE' && (
                                <button
                                    onClick={() => openActionModal(asset, 'validate')}
                                    className="btn w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Validate & Lock
                                </button>
                            )}

                            {asset.disposal_status === 'WIPE_PENDING' && (
                                <button
                                    onClick={() => openActionModal(asset, 'wipe')}
                                    className="btn w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 flex justify-center items-center py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <HardDrive size={16} className="mr-2" /> Execute Data Wipe
                                </button>
                            )}

                            {asset.disposal_status === 'WIPED' && (
                                <button
                                    onClick={() => openActionModal(asset, 'dispose')}
                                    className="btn w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex justify-center items-center py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Trash2 size={16} className="mr-2" /> Finalize Disposal
                                </button>
                            )}

                            {asset.disposal_status === 'RETIRED' && (
                                <div className="text-center py-2 text-slate-500 bg-white/5 rounded-lg text-sm flex items-center justify-center border border-white/5 light:border-slate-200 cursor-not-allowed">
                                    <CheckCircle size={14} className="mr-2" /> Archived & Locked
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <ActionModal
                isOpen={modalConfig?.isOpen}
                onClose={() => setModalConfig(null)}
                {...modalConfig}
            />
        </div>
    )
}
