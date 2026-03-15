import { useState } from 'react';
import { useRouter } from 'next/router';
import {
    Smartphone, SmartphoneIcon, ShieldCheck, AlertCircle,
    ChevronLeft, CheckCircle, Zap, Shield, Info,
    Cpu, Monitor, Smartphone as Phone, RefreshCw, FileText
} from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';

export default function BYODRegistrationPage() {
    const router = useRouter();
    const toast = useToast();
    const { refreshData } = useAssetContext();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        device_model: '',
        os_version: '',
        serial_number: '',
        reason: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await apiClient.registerBYOD(formData);
            toast.success(`BYOD Registration for ${formData.device_model} initiated.`);
            await refreshData();
            router.push('/');
        } catch (error) {
            toast.error(`Registration Failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => router.back()}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-all group"
                >
                    <ChevronLeft size={24} className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-900 dark:text-white group-hover:-translate-x-1 transition-all" />
                </button>
                <div>
                    <h1 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight">BYOD Registration</h1>
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                        <ShieldCheck size={12} className="animate-pulse" /> Secure Endpoint Protocol
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit} className="glass-panel p-10 border border-slate-200 dark:border-white/10 shadow-2xl space-y-8 bg-white dark:bg-slate-900/60 transition-all">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Hardware Model</label>
                                <input
                                    type="text"
                                    name="device_model"
                                    required
                                    value={formData.device_model}
                                    onChange={handleInputChange}
                                    placeholder="e.g. MacBook Pro, Pixel 8"
                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-500 dark:text-slate-400 font-medium"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">OS Environment</label>
                                <input
                                    type="text"
                                    name="os_version"
                                    required
                                    value={formData.os_version}
                                    onChange={handleInputChange}
                                    placeholder="e.g. macOS Sonoma, Android 14"
                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-500 dark:text-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Unique Identifier / Serial</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="serial_number"
                                    required
                                    value={formData.serial_number}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all uppercase tracking-widest"
                                    placeholder="S/N: 00000000000"
                                />
                                <Cpu className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300" size={20} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Compliance Context</label>
                            <textarea
                                name="reason"
                                rows="3"
                                value={formData.reason}
                                onChange={handleInputChange}
                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-500 dark:text-slate-400 font-medium italic"
                                placeholder="State the intended use-case and adherence to security policies..."
                            ></textarea>
                        </div>

                        <div className="bg-sky-500/5 border border-sky-500/20 p-6 rounded-3xl flex gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center shrink-0">
                                <Shield size={24} className="text-sky-600 dark:text-sky-400" />
                            </div>
                            <p className="text-[11px] text-sky-700/80 dark:text-sky-200/80 leading-relaxed italic">
                                By registering this endpoint, you acknowledge that the device will be subject to corporate data handling protocols, including potential remote wipe of enterprise partitions in case of security breach.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-slate-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-sky-500/30 transition-all active:translate-y-1 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                        >
                            {isSubmitting ? (
                                <RefreshCwIcon className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Zap size={18} className="group-hover:scale-125 transition-transform" />
                                    Initiate Trust Sync
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel p-8 border border-slate-200 dark:border-white/10 rounded-3xl space-y-6 bg-white dark:bg-slate-900/40">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Compliance Checklist</h4>
                        <div className="space-y-4">
                            {[
                                { label: 'OS Version Support', icon: Phone },
                                { label: 'Encryption Active', icon: ShieldCheck },
                                { label: 'MDM Profile Ready', icon: FileText }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                                        <item.icon size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-8 bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 rounded-3xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="text-sky-500" size={18} />
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Next Steps</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                            Once approved by your manager, you will receive a QR code via email to enroll the device in our Mobile Device Management (MDM) portal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const RefreshCwIcon = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);
