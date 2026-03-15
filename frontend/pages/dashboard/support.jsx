import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Laptop, Ticket, RefreshCw, User, Briefcase, MapPin, Calendar, Building2, Cpu, X,
    CheckCircle, AlertCircle, Settings, Sparkles, Quote, ChevronUp, Smartphone,
    LogOut, Eye, Server, Database, Info, Shield, FileText, ShieldCheck, Globe,
    ArrowUpRight, Zap, Printer, Monitor, HardDrive, ShoppingCart, Wifi, Hand,
    VideoOff, Terminal, MousePointer, Keyboard, Headphones, Speaker, Camera,
    Battery, Bluetooth, Router, Trash2, Edit, BatteryCharging, BatteryWarning,
    BatteryLow, FileX, Droplet, WifiOff, Clock, Wind, Hash, Scan, List, Copy,
    MonitorOff, Search, Cable, Palette, ShieldAlert, CloudOff, UserCheck,
    Box, Chrome, Type, MicOff, Layout, PenTool, Signal, ArrowUpCircle, UserX, Settings2,
    ChevronLeft
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext, ASSET_STATUS } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import { ISSUE_MAPPING, ISSUE_PRIORITY, KEYWORD_MAPPING, STOP_WORDS } from '@/utils/ticketingConstants';

const LUCIDE_ICONS = {
    Laptop, Ticket, RefreshCw, User, Briefcase, MapPin, Calendar, Building2, Cpu, X,
    CheckCircle, AlertCircle, Settings, Sparkles, Quote, ChevronUp, Smartphone,
    LogOut, Eye, Server, Database, Info, Shield, FileText, ShieldCheck, Globe,
    ArrowUpRight, Zap, Printer, Monitor, HardDrive, ShoppingCart, Wifi, Hand,
    VideoOff, Terminal, MousePointer, Keyboard, Headphones, Speaker, Camera,
    Battery, Bluetooth, Router, Trash2, Edit, BatteryCharging, BatteryWarning,
    BatteryLow, FileX, Droplet, WifiOff, Clock, Wind, Hash, Scan, List, Copy,
    MonitorOff, Search, Cable, Palette, ShieldAlert, CloudOff, UserCheck,
    Box, Chrome, Type, MicOff, Layout, PenTool, Signal, ArrowUpCircle, UserX, Settings2
};

const HighlightText = ({ text, highlight, isInverse = false }) => {
    if (!highlight?.trim() || !text) return <span>{text}</span>;
    const words = highlight.trim().split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return <span>{text}</span>;

    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) => (
                regex.test(part) ?
                    <span key={i} className={`font-black rounded-sm px-0.5 ${isInverse ? 'bg-white/40 text-slate-900 dark:text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>{part}</span> :
                    <span key={i}>{part}</span>
            ))}
        </span>
    );
};

export default function SupportTicketPage() {
    const router = useRouter();
    const toast = useToast();
    const { user } = useRole();
    const { assets, refreshData } = useAssetContext();

    const [subjectText, setSubjectText] = useState('');
    const [description, setDescription] = useState('');
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [subjectSuggestions, setSubjectSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSmartBadge, setShowSmartBadge] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categoryConfigs, setCategoryConfigs] = useState({});

    const [dropdowns, setDropdowns] = useState({ category: false, asset: false });
    const [selectedValues, setSelectedValues] = useState({
        category: 'Hardware Fault',
        linkedAssetId: null,
        linkedAssetName: 'None / General'
    });

    const assignedAssets = assets
        .filter(a => {
            const matches = (a.assigned_to?.toLowerCase() === (user?.name || 'Alex Johnson').toLowerCase()) &&
                (a.status === ASSET_STATUS.IN_USE || a.status === 'Active' || a.status === 'Reserved');
            return matches;
        });

    useEffect(() => {
        apiClient.getCategoryConfigs()
            .then(configs => {
                const map = {};
                configs.forEach(c => { map[c.name] = c; });
                setCategoryConfigs(map);
            })
            .catch(() => { });
    }, []);

    const getAssetIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('laptop')) return <Laptop size={14} />;
        if (t.includes('printer')) return <Printer size={14} />;
        if (t.includes('monitor')) return <Monitor size={14} />;
        if (t.includes('phone') || t.includes('mobile')) return <Smartphone size={14} />;
        return <Briefcase size={14} />;
    };

    const getBaseCategories = () => {
        const asset = assignedAssets.find(a => a.id === selectedValues.linkedAssetId);
        let assetType = asset?.asset_type || asset?.type || 'General';
        const typeKey = assetType.trim().charAt(0).toUpperCase() + assetType.trim().slice(1).toLowerCase();
        const baseKey = typeKey.endsWith('s') ? typeKey.slice(0, -1) : typeKey;
        return ISSUE_MAPPING[typeKey] || ISSUE_MAPPING[baseKey] || ISSUE_MAPPING['General'];
    };

    const getBestCategory = (val, assetType) => {
        if (!val.trim()) return { categories: [], autoSelect: null };
        const searchStr = val.toLowerCase().trim();
        const inputWords = searchStr.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
        const categoryScores = {};
        const keywordHits = {};

        Object.keys(KEYWORD_MAPPING).forEach(keyword => {
            const categories = KEYWORD_MAPPING[keyword];
            let points = 0;
            if (inputWords.includes(keyword)) points = 100;
            else if (keyword.length >= 3 && searchStr.includes(keyword)) points = 40;
            else if (inputWords.some(word => word.length >= 3 && keyword.startsWith(word))) points = 20;

            if (points > 0) {
                categories.forEach(cat => {
                    categoryScores[cat] = (categoryScores[cat] || 0) + points;
                    keywordHits[cat] = (keywordHits[cat] || 0) + 1;
                });
            }
        });

        const normalizedAssetType = assetType?.trim()?.charAt(0)?.toUpperCase() + assetType?.trim()?.slice(1)?.toLowerCase();
        const assetAllowedCategories = ISSUE_MAPPING[normalizedAssetType] || ISSUE_MAPPING[normalizedAssetType?.endsWith('s') ? normalizedAssetType.slice(0, -1) : normalizedAssetType] || ISSUE_MAPPING['General'] || [];

        const finalizedCategories = Object.keys(categoryScores).map(cat => {
            let totalScore = categoryScores[cat];
            if (keywordHits[cat] > 1) totalScore += (keywordHits[cat] * 15);
            if (assetAllowedCategories.includes(cat)) totalScore += 60;
            const staticPriority = ISSUE_PRIORITY[cat] ?? 5;
            return { name: cat, score: totalScore, priority: staticPriority };
        });

        finalizedCategories.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.priority - a.priority;
        });

        const sortedCategoryNames = finalizedCategories.map(c => c.name);
        return {
            categories: sortedCategoryNames,
            autoSelect: sortedCategoryNames.length > 0 ? sortedCategoryNames[0] : null
        };
    };

    const handleSubjectChange = (e) => {
        const val = e.target.value;
        setSubjectText(val);
        const currentAsset = assignedAssets.find(a => a.id === selectedValues.linkedAssetId);
        const assetType = currentAsset?.asset_type || currentAsset?.type || 'General';
        const { categories, autoSelect } = getBestCategory(val, assetType);
        setFilteredCategories(categories);

        if (autoSelect && selectedValues.category !== autoSelect) {
            setSelectedValues(prev => ({ ...prev, category: autoSelect }));
            setShowSmartBadge(true);
            setTimeout(() => setShowSmartBadge(false), 3000);
        }

        if (!val.trim()) {
            setSubjectSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const inputWords = val.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        const lastWord = inputWords[inputWords.length - 1] || '';
        if (lastWord.length >= 2) {
            const matchedKeywords = Object.keys(KEYWORD_MAPPING).filter(kw =>
                kw.startsWith(lastWord) && kw !== lastWord
            ).slice(0, 10);
            setSubjectSuggestions(matchedKeywords);
            setShowSuggestions(matchedKeywords.length > 0);
        } else {
            setSubjectSuggestions(false);
        }
    };

    const handleKeywordClick = (keyword) => {
        const words = subjectText.trimEnd().split(' ');
        words[words.length - 1] = keyword;
        const newSubject = words.join(' ') + ' ';
        setSubjectText(newSubject);
        handleSubjectChange({ target: { value: newSubject } });
        setShowSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const ticketData = {
                subject: subjectText || `${selectedValues.category} on ${selectedValues.linkedAssetName}`,
                category: selectedValues.category,
                description: description || 'No description provided',
                priority: 'MEDIUM',
                related_asset_id: selectedValues.linkedAssetId,
                status: 'OPEN'
            };

            await apiClient.createTicket(ticketData);
            toast.success("Support ticket raised successfully.");
            router.push('/');
        } catch (error) {
            toast.error(`Failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-all group"
                    >
                        <ChevronLeft size={24} className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-900 dark:text-white group-hover:-translate-x-1 transition-all" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight">Raise Support Ticket</h1>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                            <Sparkles size={12} className="animate-pulse" /> Intelligent Diagnostic Hub
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 bg-rose-500/10 px-6 py-3 rounded-2xl border border-rose-500/20">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <Ticket size={20} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 dark:text-rose-300/60 uppercase tracking-widest">Priority Line</p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase">Express Resolution</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="glass-panel p-10 border border-slate-200 dark:border-white/10 shadow-2xl space-y-8 bg-white dark:bg-slate-900/60 transition-all">
                        {/* Incident Subject */}
                        <div className="space-y-3 relative">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Incident Subject</label>
                            <input
                                type="text"
                                required
                                value={subjectText}
                                onChange={handleSubjectChange}
                                onFocus={() => subjectSuggestions.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 transition-all placeholder:text-slate-500 dark:text-slate-400 font-medium"
                                placeholder="e.g. Broken screen, printer jam, vpn connection failing..."
                            />

                            {showSuggestions && subjectSuggestions.length > 0 && (
                                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {subjectSuggestions.map(kw => (
                                            <button
                                                key={kw}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleKeywordClick(kw)}
                                                className="px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-slate-900 dark:text-white hover:border-rose-500 transition-all flex items-center gap-2 group/kw"
                                            >
                                                <Sparkles size={12} className="opacity-0 group-hover/kw:opacity-100 transition-opacity" />
                                                {kw}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Linked Asset */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3 relative">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Target Asset</label>
                                <div
                                    onClick={() => setDropdowns(prev => ({ ...prev, asset: !prev.asset }))}
                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-900 dark:text-white flex justify-between items-center cursor-pointer hover:border-rose-500/50 transition-all group/asset"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover/asset:text-rose-500 transition-colors">
                                            {getAssetIcon(assignedAssets.find(a => a.id === selectedValues.linkedAssetId)?.asset_type || 'General')}
                                        </div>
                                        <div>
                                            <p className="font-black uppercase tracking-tight">{selectedValues.linkedAssetName}</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Operational Hardware</p>
                                        </div>
                                    </div>
                                    <ChevronUp size={20} className={`text-slate-500 dark:text-slate-400 transition-transform duration-500 ${dropdowns.asset ? '' : 'rotate-180'}`} />
                                </div>

                                {dropdowns.asset && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-40 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 max-h-64 overflow-y-auto custom-scrollbar">
                                        <div
                                            onClick={() => {
                                                const { categories, autoSelect } = getBestCategory(subjectText, 'General');
                                                setSelectedValues(prev => ({
                                                    ...prev,
                                                    linkedAssetId: null,
                                                    linkedAssetName: 'None / General',
                                                    category: autoSelect || 'Hardware Fault'
                                                }));
                                                setFilteredCategories(categories);
                                                setDropdowns(prev => ({ ...prev, asset: false }));
                                            }}
                                            className={`p-4 cursor-pointer hover:bg-rose-500/5 transition-all flex items-center gap-4 border-l-4 ${!selectedValues.linkedAssetId ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                                <Briefcase size={14} />
                                            </div>
                                            <span className="text-sm font-bold uppercase tracking-widest">None / General</span>
                                        </div>
                                        {assignedAssets.map(asset => (
                                            <div
                                                key={asset.id}
                                                onClick={() => {
                                                    const assetType = asset.asset_type || asset.type || 'General';
                                                    const { categories, autoSelect } = getBestCategory(subjectText, assetType);
                                                    setSelectedValues(prev => ({
                                                        ...prev,
                                                        linkedAssetId: asset.id,
                                                        linkedAssetName: asset.name,
                                                        category: autoSelect || (ISSUE_MAPPING[assetType] || ISSUE_MAPPING['General'])[0]
                                                    }));
                                                    setFilteredCategories(categories);
                                                    setDropdowns(prev => ({ ...prev, asset: false }));
                                                }}
                                                className={`p-4 cursor-pointer hover:bg-rose-500/5 transition-all flex items-center justify-between border-l-4 ${selectedValues.linkedAssetId === asset.id ? 'bg-rose-500/10 border-rose-500' : 'border-transparent'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                        {getAssetIcon(asset.asset_type || asset.type)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-black uppercase tracking-tight ${selectedValues.linkedAssetId === asset.id ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>{asset.name}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{asset.asset_type || asset.type || 'Device'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Issue Category */}
                            <div className="space-y-3 relative">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Issue Classification</label>
                                <div
                                    onClick={() => setDropdowns(prev => ({ ...prev, category: !prev.category }))}
                                    className={`w-full bg-slate-50 dark:bg-black/40 border rounded-2xl px-6 py-4 text-sm flex justify-between items-center cursor-pointer transition-all relative overflow-hidden group/cat 
                                        ${showSmartBadge ? 'border-rose-500 ring-4 ring-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'border-slate-200 dark:border-white/10 hover:border-rose-500/40'}`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover/cat:text-rose-500 transition-colors">
                                            {(() => {
                                                const iconName = categoryConfigs[selectedValues.category]?.icon_name;
                                                const Icon = LUCIDE_ICONS[iconName] || Briefcase;
                                                return <Icon size={20} />;
                                            })()}
                                        </div>
                                        <div>
                                            <p className="font-black uppercase tracking-tight flex items-center gap-3">
                                                {selectedValues.category}
                                                {showSmartBadge && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-tighter animate-bounce flex items-center gap-1">
                                                        <Sparkles size={8} /> Match
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Diagnostic Protocol</p>
                                        </div>
                                    </div>
                                    <ChevronUp size={20} className={`text-slate-500 dark:text-slate-400 transition-transform duration-500 relative z-10 ${dropdowns.category ? '' : 'rotate-180'}`} />
                                </div>

                                {dropdowns.category && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-40 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300 max-h-64 overflow-y-auto custom-scrollbar">
                                        {(filteredCategories.length > 0 ? filteredCategories : getBaseCategories()).map(opt => (
                                            <div
                                                key={opt}
                                                onClick={() => {
                                                    setSelectedValues(prev => ({ ...prev, category: opt }));
                                                    setDropdowns(prev => ({ ...prev, category: false }));
                                                }}
                                                className={`p-4 cursor-pointer hover:bg-rose-500/5 transition-all flex items-center justify-between border-l-4 ${selectedValues.category === opt ? 'bg-rose-500/10 border-rose-500' : 'border-transparent'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedValues.category === opt ? 'bg-rose-500 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                                                        {(() => {
                                                            const iconName = categoryConfigs[opt]?.icon_name;
                                                            const Icon = LUCIDE_ICONS[iconName] || Briefcase;
                                                            return <Icon size={14} />;
                                                        })()}
                                                    </div>
                                                    <span className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${selectedValues.category === opt ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        <HighlightText text={opt} highlight={subjectText} />
                                                        {getBestCategory(subjectText, assignedAssets.find(a => a.id === selectedValues.linkedAssetId)?.asset_type || 'General').categories.includes(opt) && (
                                                            <Sparkles size={12} className="text-rose-500 animate-pulse" />
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryConfigs[opt]?.color || '#94a3b8' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Diagnostic Details */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Diagnostic Briefing</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="8"
                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-6 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 transition-all placeholder:text-slate-500 dark:text-slate-400 font-medium italic"
                                placeholder="Please provide exact error messages, steps to reproduce, or incident telemetry..."
                            ></textarea>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex gap-6">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 py-5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                            >
                                Abort Mission
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-[2] py-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-slate-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-rose-500/30 transition-all active:translate-y-1 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                            >
                                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} className="group-hover:scale-125 transition-transform" />}
                                {isSubmitting ? 'Transmitting Signal...' : 'Transmit Diagnostic Data'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Urgency Alert */}
                    <div className="glass-panel p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-rose-500" size={24} />
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Protocol Criticality</h4>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed italic">
                            For P1 total workspace blockages, use the direct IT extension <b>#4499</b>. Standard support tickets are triaged within 4 operational hours.
                        </p>
                    </div>

                    {/* Operational Tips */}
                    <div className="glass-panel p-8 border border-slate-200 dark:border-white/10 rounded-3xl space-y-6 bg-white dark:bg-slate-900/40">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Diagnostic Metrics</h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Latency Boost', value: 'Active', color: 'emerald', icon: Zap },
                                { label: 'Sync Status', value: 'Encrypted', color: 'blue', icon: ShieldCheck },
                                { label: 'Global Node', value: 'US-EAST-1', color: 'indigo', icon: Globe }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <item.icon size={14} className={`text-${item.color}-500`} />
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    <span className={`text-[10px] font-black text-${item.color}-600 uppercase tracking-tighter`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="glass-panel p-8 border border-slate-200 dark:border-white/10 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-transparent">
                        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4">Enterprise Support KB</h4>
                        <button className="w-full p-4 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all group">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Troubleshooting VPN</span>
                            <ArrowUpRight size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
