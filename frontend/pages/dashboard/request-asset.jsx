import { useState } from 'react';
import { useRouter } from 'next/router';
import {
    Laptop, Briefcase, ChevronUp, ChevronLeft, CheckCircle,
    Zap, Monitor, Smartphone, Cpu, MousePointer, ShieldCheck,
    ArrowUpRight, Info, Building2, Package, Search
} from 'lucide-react';
import { useAssetContext } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';

const ASSET_CATALOG = [
    {
        id: 'Laptop',
        name: 'Standard Laptop',
        icon: Laptop,
        desc: 'Standard productivity machine for office and remote work.',
        specs: 'Intel i5/i7, 16GB RAM, 512GB SSD'
    },
    {
        id: 'Laptop_HighPerf',
        name: 'High Performance Laptop',
        icon: Cpu,
        desc: 'Workstation grade machine for developers and designers.',
        specs: 'Intel i9 / Apple M3 Max, 32GB+ RAM, GPU'
    },
    {
        id: 'Monitor',
        name: 'External Display',
        icon: Monitor,
        desc: '4K or Ultra-wide monitors for enhanced productivity.',
        specs: '27" 4K or 34" Curved Ultrawide'
    },
    {
        id: 'Smartphone',
        name: 'Mobile Device',
        icon: Smartphone,
        desc: 'Enterprise-managed mobile device for field communication.',
        specs: 'iOS / Android Enterprise Core'
    },
    {
        id: 'Peripheral',
        name: 'Peripherals Hub',
        icon: MousePointer,
        desc: 'Docks, mice, keyboards, and ergonomic accessories.',
        specs: 'Thunderbolt 4 Docks, Wireless Peripherals'
    },
    {
        id: 'BYOD',
        name: 'BYOD License',
        icon: ShieldCheck,
        desc: 'Approval for using personal hardware in a work context.',
        specs: 'Security Compliance Partition'
    }
];

export default function AssetRequestPage() {
    const router = useRouter();
    const toast = useToast();
    const { refreshData } = useAssetContext();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(ASSET_CATALOG[0]);
    const [reason, setReason] = useState('');
    const [urgency, setUrgency] = useState('Standard');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCatalog = ASSET_CATALOG.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const requestData = {
                assetType: selectedAsset.id,
                reason: reason || `Standard request for ${selectedAsset.name}`,
                urgency: urgency,
                status: 'PENDING_MANAGER'
            };

            await apiClient.createAssetRequest(requestData);
            toast.success(`${selectedAsset.name} request transmitted to Manager.`);
            await refreshData();
            router.push('/');
        } catch (error) {
            toast.error(`Transmission Failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all group shadow-sm hover:shadow-md active:scale-95"
                    >
                        <ChevronLeft size={24} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:-translate-x-1 transition-all" />
                    </button>
                    <div>
                        <h1 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Asset Provisioning</h1>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                            <Package size={12} className="animate-bounce" /> Enterprise Hardware Catalog v4.0
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors z-10" size={18} />
                    <input
                        type="text"
                        placeholder="Search Catalog..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all w-full md:w-72 shadow-sm font-bold uppercase tracking-widest placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Catalog Grid */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredCatalog.map((item) => {
                            const Icon = item.icon;
                            const isSelected = selectedAsset.id === item.id;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedAsset(item)}
                                    className={`group cursor-pointer p-6 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-56
                                        ${isSelected
                                            ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 border-blue-400 shadow-[0_20px_50px_rgba(37,99,235,0.3)] dark:shadow-[0_20px_50px_rgba(37,99,235,0.2)] -translate-y-2 scale-[1.02]'
                                            : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'}`}
                                >
                                    {/* Glossy Overlay for Selected */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                                    )}
                                    {/* Background Decor */}
                                    <div className={`absolute -right-8 -bottom-8 w-32 h-32 blur-[40px] rounded-full transition-opacity duration-1000 ${isSelected ? 'bg-white/20 opacity-100' : 'bg-blue-500/10 opacity-0 group-hover:opacity-100'}`}></div>

                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className={`p-4 rounded-2xl transition-all duration-500 ${isSelected ? 'bg-white text-blue-600 rotate-3' : 'bg-blue-500/10 text-blue-500 group-hover:rotate-6'}`}>
                                            <Icon size={28} strokeWidth={2.5} />
                                        </div>
                                        {isSelected && (
                                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-md animate-in zoom-in-0 duration-500">
                                                <CheckCircle size={16} className="text-slate-900 dark:text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative z-10">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ${isSelected ? 'text-blue-100/90' : 'text-slate-400 dark:text-slate-500'}`}>Class: {item.id}</p>
                                        <h3 className={`text-xl font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.name}</h3>
                                        <p className={`text-xs mt-2 line-clamp-2 leading-relaxed font-medium ${isSelected ? 'text-blue-50/80' : 'text-slate-500 dark:text-slate-400'}`}>{item.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Configuration Panel */}
                <div className="lg:col-span-4">
                    <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-8 md:p-10 border border-slate-200 dark:border-white/10 shadow-2xl rounded-[2.5rem] transition-all sticky top-8">
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Request Configuration</h4>
                                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center gap-4 group/item">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover/item:scale-110 transition-transform">
                                        {selectedAsset.icon && (
                                            <selectedAsset.icon size={28} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedAsset.name}</p>
                                        <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-widest mt-0.5">{selectedAsset.specs}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Business Goal</label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows="4"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium resize-none shadow-inner"
                                    placeholder="Enter business justification for this hardware..."
                                ></textarea>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operational Urgency</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Standard', 'High'].map((u) => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => setUrgency(u)}
                                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden
                                                ${urgency === u
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:border-blue-300 dark:hover:border-blue-500/30'}`}
                                        >
                                            <span className="relative z-10">{u}</span>
                                            {urgency === u && (
                                                <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                                    <Info size={18} className="text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed italic">
                                        High urgency requires managerial override and may bypass standard procurement cycles.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-3 group"
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <Zap size={18} className="group-hover:scale-125 transition-transform fill-current" />
                                            Transmission Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const RefreshCw = ({ className, size }) => (
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
