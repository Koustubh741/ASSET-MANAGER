import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Database } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function BulkImport({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx')) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Invalid file format. Please upload a CSV or Excel file.');
                setFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const data = await apiClient.uploadSmart(file);
            setResult(data);
            setFile(null);
        } catch (err) {
            setError(err.message || 'Failed to upload and process file.');
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setIsUploading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-app-border rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-app-border bg-gradient-to-r from-blue-600/10 to-purple-600/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-none bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Database size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-app-text leading-tight">Bulk Data Import</h2>
                            <p className="text-xs text-app-text-muted">Import real staff and asset data from CSV/Excel</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-app-text-muted hover:text-app-text hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft rounded-none transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            {/* Drop Zone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    relative group cursor-pointer border-2 border-dashed rounded-none p-10 transition-all text-center
                                    ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-app-border hover:border-blue-500/30 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft'}
                                `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".csv,.xlsx"
                                />

                                <div className="flex flex-col items-center gap-4">
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <div className="p-4 rounded-none bg-emerald-500/20 text-emerald-400 mb-2">
                                                <FileText size={40} />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{file.name}</span>
                                            <span className="text-xs text-app-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800 text-app-text-muted group-hover:scale-110 transition-transform">
                                                <Upload size={32} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-slate-200">Click to upload or drag and drop</p>
                                                <p className="text-xs text-app-text-muted mt-1">Supports CSV and Excel (.xlsx) files</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-none text-rose-400 animate-in slide-in-from-top-2">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 rounded-none border border-app-border text-app-text-muted font-semibold hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || isUploading}
                                    className={`
                                        flex-[2] px-6 py-3 rounded-none font-semibold flex items-center justify-center gap-2 transition-all
                                        ${!file || isUploading
                                            ? 'bg-slate-50 dark:bg-slate-800 text-app-text-muted cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-app-text shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02]'}
                                    `}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Database size={18} />
                                            <span>Start Import</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-app-text">Import Complete</h3>
                                    <p className="text-app-text-muted">Your data has been processed successfully.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-none bg-slate-100 dark:bg-slate-950/50 border border-app-border">
                                    <span className="block text-2xl font-bold text-blue-400">{result.asset_requests_created || 0}</span>
                                    <span className="text-xs text-app-text-muted uppercase tracking-wider font-semibold">Asset Requests</span>
                                </div>
                                <div className="p-4 rounded-none bg-slate-100 dark:bg-slate-950/50 border border-app-border">
                                    <span className="block text-2xl font-bold text-purple-400">{result.procurement_requests_created || 0}</span>
                                    <span className="text-xs text-app-text-muted uppercase tracking-wider font-semibold">Procurement</span>
                                </div>
                                <div className="p-4 rounded-none bg-slate-100 dark:bg-slate-950/50 border border-app-border">
                                    <span className="block text-2xl font-bold text-emerald-400">{result.users_imported || 0}</span>
                                    <span className="text-xs text-app-text-muted uppercase tracking-wider font-semibold">Staff Records</span>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="text-left max-h-40 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950/50 border border-app-border rounded-none space-y-2">
                                    <h4 className="text-xs font-bold text-rose-500 uppercase flex items-center gap-2">
                                        <AlertCircle size={14} /> Issues encountered:
                                    </h4>
                                    {result.errors.map((err, i) => (
                                        <p key={i} className="text-xs text-app-text-muted flex items-start gap-2">
                                            <span className="shrink-0">•</span>
                                            {err}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={reset}
                                className="w-full px-6 py-3 rounded-none bg-slate-50 dark:bg-slate-800 text-app-text font-semibold hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                            >
                                Import Another File
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {!result && (
                    <div className="px-8 pb-8 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 opacity-40">
                            <Database size={12} />
                            <span className="text-[10px] font-mono tracking-tighter">SECURE TUNNEL</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-40">
                            <span className="text-[10px] font-mono tracking-tighter uppercase">Auto Mapping v2.0</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
