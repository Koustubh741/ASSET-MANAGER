import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Upload, FileText, User, ShoppingBag, Camera } from 'lucide-react';
import BarcodeScanner from './common/BarcodeScanner';

const ProcurementActionModal = ({ isOpen, onClose, request, onUploadPO, onReject, onConfirmDelivery }) => {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [serialNumber, setSerialNumber] = useState('');
    const [receivedAssetName, setReceivedAssetName] = useState(request?.asset_name || request?.assetType || '');
    const [receivedAssetModel, setReceivedAssetModel] = useState(request?.asset_model || '');
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const onEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !request) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleApprove = async () => {
        if (!selectedFile) {
            setError("Please select a PO file to upload.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onUploadPO(request.id, selectedFile);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to upload PO.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!comment) {
            setError("Reason is required for rejection.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onReject(request.id, comment);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to reject request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!serialNumber) {
            setError("Physical Serial Number is required for inventory registration.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirmDelivery(request.id, {
                serial_number: serialNumber,
                asset_name: receivedAssetName,
                asset_model: receivedAssetModel
            });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to confirm delivery.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFinanceApproved = request.procurementStage === 'FINANCE_APPROVED';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10 light:border-slate-200">

                {/* Header */}
                <div className="bg-white/5 px-6 py-4 border-b border-white/10 light:bg-slate-50 light:border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent light:from-blue-100">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-blue-400 light:text-blue-600" />
                        Process Procurement Request
                    </h3>
                    <button onClick={onClose} className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 light:focus:ring-offset-slate-100 rounded" aria-label="Close modal" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 light:bg-slate-50 light:border-slate-200">
                                <label className="text-xs uppercase tracking-wider text-slate-500 light:text-slate-600 font-bold block mb-1">Request Information</label>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 light:text-slate-600">Request ID</span>
                                        <span className="text-white light:text-slate-900 font-mono text-xs">{request.id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 light:text-slate-600">Asset Type</span>
                                        <span className="text-blue-400 light:text-blue-600 font-bold">{request.assetType}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 light:text-slate-600">Priority</span>
                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 light:bg-slate-50 light:border-slate-200">
                                <label className="text-xs uppercase tracking-wider text-slate-500 light:text-slate-600 font-bold block mb-1">Requester Details</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 light:bg-indigo-100 flex items-center justify-center text-indigo-400 light:text-indigo-600">
                                        <User size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-sm font-bold text-white light:text-slate-900">{request.requestedBy.name}</div>
                                        <div className="text-xs text-slate-400 light:text-slate-600 mb-1">{request.requestedBy.email || request.requester_email}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 light:text-slate-600">{request.requestedBy.role}</span>
                                            {request.requester_department && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                                                    {request.requester_department}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 light:bg-slate-50 light:border-slate-200 flex flex-col">
                            <label className="text-xs uppercase tracking-wider text-slate-500 light:text-slate-600 font-bold block mb-1">Business Justification</label>
                            <div className="text-sm text-slate-300 light:text-slate-700 flex-grow italic leading-relaxed max-w-prose">
                                "{request.justification || 'No justification provided.'}"
                            </div>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="space-y-4">
                        {isFinanceApproved ? (
                            <>
                                <div className="bg-emerald-500/5 text-emerald-300 text-xs p-4 rounded-xl border border-emerald-500/20 flex gap-3 items-center">
                                    <CheckCircle className="w-6 h-6 shrink-0 text-emerald-400" />
                                    <div>
                                        <p className="font-bold text-emerald-400 mb-1">Funds Released & Delivery Pending</p>
                                        <p>Finance has approved the budget. Please unbox the asset and **input the physical details below** to register it into the inventory.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10 light:bg-slate-50 light:border-slate-200">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider flex justify-between items-center">
                                            Physical Serial Number
                                            <button
                                                onClick={() => setShowScanner(true)}
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Scan Barcode"
                                            >
                                                <Camera size={12} />
                                                <span className="text-xs">Scan Barcode</span>
                                            </button>
                                        </label>
                                        <input
                                            type="text"
                                            value={serialNumber}
                                            onChange={(e) => setSerialNumber(e.target.value)}
                                            placeholder="e.g. SN-12345678"
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">
                                            Final Asset Name
                                        </label>
                                        <input
                                            type="text"
                                            value={receivedAssetName}
                                            onChange={(e) => setReceivedAssetName(e.target.value)}
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-white font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-full">
                                        <label className="block text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">
                                            Hardware Model (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={receivedAssetModel}
                                            onChange={(e) => setReceivedAssetModel(e.target.value)}
                                            placeholder="e.g. Dell UltraSharp U2723QE"
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-white"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-blue-500/5 text-blue-300 text-xs p-3 rounded-lg border border-blue-500/20 flex gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                                <p>To approve this request for purchase, you must upload the generated Purchase Order (PDF). This will trigger a notification to Finance for final budget clearance.</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-lg border border-rose-500/20">
                                {error}
                            </div>
                        )}

                        {!isFinanceApproved && (
                            <>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wide">
                                        1. Upload Purchase Order (PDF)
                                    </label>
                                    <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${selectedFile ? 'border-emerald-500/40 bg-emerald-500/5 light:bg-emerald-50 light:border-emerald-200' : 'border-white/10 hover:border-blue-500/40 bg-white/5 light:border-slate-200 light:bg-slate-50 light:hover:border-blue-300'}`}>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            {selectedFile ? (
                                                <>
                                                    <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="text-sm font-bold text-emerald-400">{selectedFile.name}</div>
                                                    <button onClick={(e) => { e.preventDefault(); setSelectedFile(null); }} className="text-xs text-slate-500 light:text-slate-600 underline">Change file</button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                                                        <Upload size={24} />
                                                    </div>
                                                    <div className="text-sm text-slate-300 light:text-slate-600">Click or drag & drop PO PDF here</div>
                                                    <div className="text-xs text-slate-500 light:text-slate-600 font-mono italic">Must be valid PDF under 5MB</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wide">
                                        2. Notes / Remarks (Optional)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-white min-h-[80px] transition-all"
                                        placeholder="Enter any notes for Finance or the Requester..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white/5 px-6 py-4 border-t border-white/10 light:bg-slate-50 light:border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-bold text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </button>

                    {isFinanceApproved ? (
                        <button
                            onClick={handleConfirmDelivery}
                            disabled={isSubmitting}
                            className={`px-6 py-2 text-sm font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20`}
                        >
                            {isSubmitting ? 'Confirming...' : (
                                <>
                                    <CheckCircle size={16} />
                                    Confirm Delivery → Inventory
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
                            >
                                Reject Request
                            </button>

                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting || !selectedFile}
                                className={`px-6 py-2 text-sm font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 ${selectedFile && !isSubmitting ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'}`}
                            >
                                {isSubmitting ? 'Processing...' : (
                                    <>
                                        <CheckCircle size={16} />
                                        Approve & Upload PO
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showScanner && (
                <BarcodeScanner
                    onScanSuccess={(val) => {
                        setSerialNumber(val);
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};

export default ProcurementActionModal;
