import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import { 
    Building2, MapPin, ArrowRight, ArrowLeft, Check, Plus, Trash2, 
    Zap, Package, Ticket, Shield, Globe, Award, Database, Terminal,
    Activity, Radio, Cpu, AlertTriangle
} from 'lucide-react';
import ExperienceCinematic from '@/components/ExperienceCinematic';

const STEPS = [
    { id: 1, title: 'Identity', icon: Award },
    { id: 2, title: 'Sector', icon: Cpu },
    { id: 3, title: 'Nodes', icon: Radio },
    { id: 4, title: 'Activate', icon: Zap },
];

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];
const V2_INDUSTRIES = [
    'Retail Operations', 
    'Supply Chain & Logistics', 
    'Finance & Governance', 
    'Loss Prevention & Security',
    'Human Capital Management',
    'Enterprise IT',
    'New Site Openings (NSO)',
    'Other Service Sector'
];

const PRESETS = [
    { name: 'Zonal Headquarters', address: 'Main Business District', timezone: 'Asia/Kolkata' },
    { name: 'Supply Hub Alpha', address: 'Logistics Sector 7', timezone: 'Asia/Kolkata' },
    { name: 'Retail Cluster X', address: 'Downtown Commercial', timezone: 'Asia/Kolkata' },
];

export default function Setup() {
    const router = useRouter();
    const { user, theme, isAdmin, setHasSeenExperience } = useRole();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCinematic, setShowCinematic] = useState(true);

    const [company, setCompany] = useState({
        name: '',
        legal_name: '',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        contact_email: '',
        industry: 'Retail Operations',
        address: '',
    });

    const [locations, setLocations] = useState([
        { name: '', address: '', timezone: 'Asia/Kolkata' },
    ]);

    const handleCompanyChange = (e) => {
        const { name, value } = e.target;
        setCompany((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleLocationChange = (idx, field, value) => {
        setLocations((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
        setError('');
    };

    const addLocation = (preset = null) => {
        if (preset) {
            setLocations((prev) => [...prev, { ...preset }]);
        } else {
            setLocations((prev) => [...prev, { name: '', address: '', timezone: 'Asia/Kolkata' }]);
        }
    };

    const removeLocation = (idx) => {
        if (locations.length <= 1) return;
        setLocations((prev) => prev.filter((_, i) => i !== idx));
    };

    const validateStep2 = () => {
        if (!company.name?.trim()) {
            setError('Account/Company name is required.');
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        const valid = locations.every((loc) => loc.name?.trim());
        if (!valid) {
            setError('Each deployment site must have a name.');
            return false;
        }
        return true;
    };

    const nextStep = () => {
        setError('');
        if (step === 2 && !validateStep2()) return;
        if (step === 3 && !validateStep3()) return;
        if (step < 4) setStep((s) => s + 1);
    };

    const prevStep = () => {
        setError('');
        if (step > 1) setStep((s) => s - 1);
    };

    const handleComplete = async () => {
        setError('');
        setIsLoading(true);
        try {
            await apiClient.completeSetup({
                company: {
                    name: company.name.trim(),
                    legal_name: company.legal_name?.trim() || null,
                    timezone: company.timezone,
                    currency: company.currency,
                    contact_email: company.contact_email?.trim() || null,
                    industry: company.industry?.trim() || null,
                    address: company.address?.trim() || null,
                },
                locations: locations
                    .filter((loc) => loc.name?.trim())
                    .map((loc) => ({
                        name: loc.name.trim(),
                        address: loc.address?.trim() || null,
                        timezone: loc.timezone,
                    })),
            });
            
            await setHasSeenExperience(true);
            toast.success('V2 Retail Environment Activated!');
            const targetPath = isAdmin ? '/dashboard/system-admin' : '/dashboard';
            router.push(targetPath);
        } catch (err) {
            const msg = err.message || 'Setup failed. Please verify credentials.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (showCinematic) {
        return (
            <ExperienceCinematic 
                user={user} 
                theme={theme} 
                onComplete={() => setShowCinematic(false)} 
            />
        );
    }

    const accentColor = theme?.color || 'primary';

    return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 overflow-hidden relative font-sans select-none zenith-vacuum">
            {/* V2 Tactical Backdrop */}
            <div className="absolute inset-0 pixel-grid-overlay opacity-20 pointer-events-none" />
            
            <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] rounded-full blur-[150px] bg-primary/10 opacity-20 animate-pulse" />
            <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full blur-[150px] bg-primary/5 opacity-10" />
            
            <div className="w-full max-w-5xl z-10 transition-all">
                <div className="command-panel p-1 md:p-1 relative border-none shadow-[0_0_100px_rgba(0,0,0,0.3)]">
                    <div className="scanning-corner scanning-corner-tl" />
                    <div className="scanning-corner scanning-corner-tr" />
                    <div className="scanning-corner scanning-corner-bl" />
                    <div className="scanning-corner scanning-corner-br" />
                    
                    <div className="bg-app-surface/60 backdrop-blur-3xl p-8 md:p-16 border border-app-border">
                        
                        <div className="absolute top-8 right-12 flex items-center gap-6 opacity-60">
                            <div className="flex items-center gap-2">
                                <Database size={16} className="text-primary" />
                                <span className="text-xs font-mono font-black uppercase tracking-[0.2em] text-app-text-muted">Sector_Live_0xRET</span>
                            </div>
                            <div className="h-4 w-px bg-app-border" />
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-secondary animate-pulse" />
                                <span className="text-xs font-mono font-black uppercase tracking-[0.2em] text-app-text-muted">Node_Sync: {locations.length}</span>
                            </div>
                        </div>

                        {/* High-Fidelity Stepper Matrix */}
                        <div className="flex items-center justify-between mb-20 relative px-4">
                            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10" />
                            <div 
                                className="absolute top-1/2 left-0 h-px bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)] transition-all duration-1000 -z-10" 
                                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
                            />
                            {STEPS.map((s, i) => (
                                <div key={s.id} className="flex flex-col items-center gap-4 relative">
                                    <div
                                        className={`w-14 h-14 rounded-none flex items-center justify-center transition-all duration-700 transform ${step === s.id ? 'scale-110 zenith-node-active shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]' : 'scale-100'} ${step === s.id 
                                            ? 'bg-primary/10 text-primary border-2 border-primary' 
                                            : step > s.id 
                                                ? 'bg-primary text-white border-2 border-primary'
                                                : 'bg-app-surface-soft text-app-text-muted border border-app-border'
                                        }`}
                                    >
                                        <s.icon size={22} className={step === s.id ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="absolute -bottom-8 flex flex-col items-center w-full">
                                        <span className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 whitespace-nowrap ${step === s.id ? 'text-primary' : 'text-app-text-muted/60'}`}>
                                            {s.title}
                                        </span>
                                        {step === s.id && (
                                            <div className="w-1 h-1 bg-primary mt-2 animate-bounce" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Tactical Briefing */}
                        {step === 1 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-4xl md:text-5xl font-black text-app-text tracking-tight uppercase italic">
                                        Tactical <span className="text-primary">Briefing</span>
                                    </h1>
                                    <div className="h-0.5 w-16 bg-primary" />
                                    <p className="text-app-text-muted text-base font-medium tracking-normal max-w-xl leading-relaxed">
                                        The V2 Retail matrix is ready for deployment. This protocol will establish your organizational anchor and synchronize departmental silos.
                                    </p>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    {[
                                        { icon: Shield, title: 'Compliance Shield', desc: 'Auto-scoping for 16 core departments.' },
                                        { icon: Globe, title: 'Hub Continuity', desc: 'Secure location nodes for multi-site ops.' }
                                    ].map((feat, i) => (
                                        <div key={i} className="p-8 bg-app-surface-soft border border-app-border flex flex-col gap-6 group hover:bg-app-surface transition-all cursor-default">
                                            <div className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                                                <feat.icon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-app-text font-black uppercase text-sm tracking-tight mb-2">{feat.title}</h3>
                                                <p className="text-app-text-muted text-xs leading-none">{feat.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Operational Sector */}
                        {step === 2 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right duration-700">
                                <h2 className="text-4xl font-black text-app-text italic uppercase tracking-tighter">Organization Setup</h2>
                                <div className="grid gap-8">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-primary uppercase tracking-wider">Company / Organization Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={company.name}
                                            onChange={handleCompanyChange}
                                            placeholder="e.g., Acme Retail Corp"
                                            className="zenith-input border-b border-primary/20 pb-2 focus:border-primary transition-colors text-app-text font-bold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider">Industry / Vertical</label>
                                            <select
                                                name="industry"
                                                value={company.industry}
                                                onChange={handleCompanyChange}
                                                className="zenith-input premium-select border-b border-app-border pb-2 focus:border-primary transition-colors"
                                            >
                                                {V2_INDUSTRIES.map((ind) => (
                                                    <option key={ind} value={ind} className="bg-app-surface text-app-text">{ind}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider">Base Currency</label>
                                            <select
                                                name="currency"
                                                value={company.currency}
                                                onChange={handleCompanyChange}
                                                className="zenith-input premium-select border-b border-app-border pb-2 focus:border-primary transition-colors"
                                            >
                                                {CURRENCIES.map((c) => (
                                                    <option key={c} value={c} className="bg-app-surface text-app-text">{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-app-text-muted uppercase tracking-wider">Headquarters Address</label>
                                        <textarea
                                            name="address"
                                            value={company.address}
                                            onChange={handleCompanyChange}
                                            placeholder="123 Business Rd, Building A..."
                                            rows={2}
                                            className="zenith-input resize-none border-b border-app-border pb-2 focus:border-primary transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Hub Nodes */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700 max-h-[550px] overflow-y-auto pr-6 custom-scrollbar">
                                <div className="flex justify-between items-center bg-app-surface-soft p-4 border border-app-border">
                                    <h2 className="text-2xl font-black text-app-text italic uppercase tracking-tighter">Locations / Branches</h2>
                                    <div className="flex gap-4">
                                        {PRESETS.map((p, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => addLocation(p)}
                                                className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border border-white/10 text-app-text-muted hover:border-primary hover:text-primary transition-all"
                                            >
                                                + {p.name.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    {locations.map((loc, idx) => (
                                        <div key={idx} className="group relative glass-zenith p-8 transition-all hover:border-primary/30">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-primary/20 text-primary font-black text-xs">0{idx + 1}</div>
                                                    <span className="text-xs font-bold text-app-text-muted uppercase tracking-wider">Branch Details</span>
                                                </div>
                                                {locations.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLocation(idx)}
                                                        className="text-app-text-muted/40 hover:text-rose-500 transition-all p-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <input
                                                    type="text"
                                                    placeholder="Branch Name (e.g., Downtown Store) *"
                                                    value={loc.name}
                                                    onChange={(e) => handleLocationChange(idx, 'name', e.target.value)}
                                                    className="zenith-input py-3 border-b border-primary/20 focus:border-primary text-app-text font-bold transition-colors"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Physical Address"
                                                    value={loc.address}
                                                    onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                                                    className="zenith-input py-3 border-b border-app-border focus:border-primary text-app-text font-bold transition-colors"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addLocation()}
                                        className="w-full flex items-center justify-center gap-4 py-8 border border-dashed border-app-border text-app-text-muted/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold uppercase tracking-widest"
                                    >
                                        <Plus size={20} />
                                        Add Another Location
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Final Activation Handshake */}
                        {step === 4 && (
                            <div className="space-y-12 animate-in zoom-in duration-1000 text-center py-10 relative">
                                <div className="absolute inset-0 bg-primary/5 blur-[100px] animate-pulse -z-10" />
                                <div className="relative inline-block">
                                    <div className="w-28 h-28 border border-app-border flex items-center justify-center relative bg-app-surface">
                                        <div className="absolute inset-[-15px] border border-primary/20 animate-spin-slow" />
                                        <div className="absolute inset-[-15px] border-t-2 border-primary animate-spin" />
                                        <Zap size={50} className="text-primary fill-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h2 className="text-6xl font-black text-app-text italic uppercase tracking-tighter leading-none animate-shimmer bg-gradient-to-r from-app-text via-primary to-app-text bg-[length:200%_100%] bg-clip-text text-transparent">Activation Point</h2>
                                    <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                                        {[
                                            { label: 'designated', val: company.name || 'ROOT_ENV' },
                                            { label: 'sector', val: company.industry },
                                            { label: 'active_nodes', val: locations.length }
                                        ].map((stat, i) => (
                                            <div key={stat.label} className="fui-status-card p-8 border border-app-border space-y-3 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-8 h-8 opacity-10">
                                                    <Database className="w-full h-full" />
                                                </div>
                                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1">{stat.label}</p>
                                                <p className="text-xl font-black text-app-text truncate">{stat.val}</p>
                                                <div className="h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-8">
                                    <div className="w-full h-[2px] bg-white/5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-primary animate-scanning" />
                                    </div>
                                    <p className="text-[10px] font-mono text-primary/60 mt-4 uppercase tracking-[0.5em] animate-pulse font-bold">Bridging V2_RETAIL_MATRIX.RET_STAGING...</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-8 p-5 bg-rose-500/10 border-l-4 border-rose-500 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-left duration-300">
                                <AlertTriangle size={18} />
                                Protocol Error: {error}
                            </div>
                        )}

                        {/* Navigation Interface */}
                        <div className="flex justify-between mt-16 pt-10 border-t border-white/10">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={step === 1}
                                className="group flex items-center gap-4 px-10 py-4 bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all font-black uppercase text-[10px] tracking-[0.4em]"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />
                                Recede
                            </button>
                            {step < 4 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="group flex items-center gap-6 px-14 py-4 bg-primary text-on-dark font-black uppercase text-[10px] tracking-[0.4em] shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.5)] active:scale-95 transition-all relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                                    <span className="relative z-10">Advance Phase</span>
                                    <ArrowRight size={16} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleComplete}
                                    disabled={isLoading}
                                    className="group flex items-center gap-6 px-16 py-5 bg-app-text text-app-bg hover:bg-primary hover:text-white font-black uppercase text-[11px] tracking-[0.5em] shadow-[0_30px_60px_-10px_rgba(var(--bg-app-rgb),0.2)] active:scale-95 transition-all disabled:opacity-50 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-primary translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                                    {isLoading ? (
                                        <span className="relative z-10 flex items-center gap-4">
                                            Handshaking... <Activity size={18} className="animate-spin" />
                                        </span>
                                    ) : (
                                        <span className="relative z-10 flex items-center gap-4">
                                            Begin Deployment <Check size={20} strokeWidth={4} />
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Attribution Overlay */}
                        <div className="mt-12 flex items-center justify-center gap-4 opacity-20 group hover:opacity-100 transition-opacity">
                            <div className="h-px w-8 bg-primary/40 group-hover:w-16 transition-all" />
                            <span className="text-[9px] font-black uppercase tracking-[0.6em] text-app-text-muted">Retail Powered by cacheinfotech</span>
                            <div className="h-px w-8 bg-primary/40 group-hover:w-16 transition-all" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes scanning {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes shimmer {
                    0% { background-position: 100% 0; }
                    100% { background-position: 0 0; }
                }
                .animate-spin-slow {
                    animation: spin-slow 15s linear infinite;
                }
                .animate-scanning {
                    animation: scanning 3s ease-in-out infinite;
                    width: 100%;
                }
                .animate-shimmer {
                    animation: shimmer 4s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary-rgb), 0.2);
                }
                .zenith-input:focus {
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 0 var(--primary);
                }
            `}</style>
        </div>
    );
}
