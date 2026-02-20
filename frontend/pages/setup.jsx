import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import { Building2, MapPin, ArrowRight, ArrowLeft, Check, Plus, Trash2, Zap, Package, Ticket } from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Welcome', icon: Zap },
    { id: 2, title: 'Company', icon: Building2 },
    { id: 3, title: 'Locations', icon: MapPin },
    { id: 4, title: 'Confirm', icon: Check },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Government', 'Other'];

export default function Setup() {
    const router = useRouter();
    const { currentRole } = useRole();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [company, setCompany] = useState({
        name: '',
        legal_name: '',
        timezone: 'UTC',
        currency: 'USD',
        contact_email: '',
        industry: '',
        address: '',
    });

    const [locations, setLocations] = useState([
        { name: '', address: '', timezone: 'UTC' },
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

    const addLocation = () => {
        setLocations((prev) => [...prev, { name: '', address: '', timezone: 'UTC' }]);
    };

    const removeLocation = (idx) => {
        if (locations.length <= 1) return;
        setLocations((prev) => prev.filter((_, i) => i !== idx));
    };

    const validateStep2 = () => {
        if (!company.name?.trim()) {
            setError('Company name is required.');
            return false;
        }
        return true;
    };

    const validateStep3 = () => {
        const valid = locations.every((loc) => loc.name?.trim());
        if (!valid) {
            setError('Each location must have a name.');
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
            toast.success('Setup completed successfully!');
            const targetPath = currentRole?.label === 'System Admin' ? '/dashboard/system-admin' : '/';
            router.push(targetPath);
        } catch (err) {
            const msg = err.message || 'Setup failed. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 light:bg-slate-100 flex items-center justify-center p-6 overflow-hidden relative">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] bg-emerald-900/20 light:opacity-40" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[128px] bg-emerald-900/10 light:opacity-30" />

            <div className="w-full max-w-2xl z-10">
                <div className="glass-panel p-8 md:p-10 border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-8">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                        step >= s.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 light:bg-slate-200 light:text-slate-600'
                                    }`}
                                >
                                    {step > s.id ? <Check size={18} /> : <s.icon size={18} />}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-12 md:w-16 h-0.5 mx-1 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h1 className="text-2xl font-bold text-emerald-400">Welcome to ITSM Asset Manager</h1>
                            <p className="text-slate-400 light:text-slate-600">
                                Let's configure your organization. This platform helps you manage:
                            </p>
                            <ul className="space-y-2 text-slate-300 light:text-slate-700">
                                <li className="flex items-center gap-2">
                                    <Package size={18} className="text-emerald-500 flex-shrink-0" />
                                    Asset lifecycle tracking and inventory
                                </li>
                                <li className="flex items-center gap-2">
                                    <Zap size={18} className="text-emerald-500 flex-shrink-0" />
                                    Procurement workflows and approvals
                                </li>
                                <li className="flex items-center gap-2">
                                    <Ticket size={18} className="text-emerald-500 flex-shrink-0" />
                                    IT support ticketing and helpdesk
                                </li>
                            </ul>
                            <p className="text-slate-400 light:text-slate-600 text-sm">We'll collect your company details and primary locations to get started.</p>
                        </div>
                    )}

                    {/* Step 2: Company */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-emerald-400">Company Information</h2>
                            <div className="grid gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Company Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={company.name}
                                        onChange={handleCompanyChange}
                                        placeholder="Acme Inc."
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Legal Name</label>
                                    <input
                                        type="text"
                                        name="legal_name"
                                        value={company.legal_name}
                                        onChange={handleCompanyChange}
                                        placeholder="Acme Corporation"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Timezone</label>
                                        <select
                                            name="timezone"
                                            value={company.timezone}
                                            onChange={handleCompanyChange}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                        >
                                            {TIMEZONES.map((tz) => (
                                                <option key={tz} value={tz} className="bg-slate-900 light:bg-white light:text-slate-900">
                                                    {tz}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Currency</label>
                                        <select
                                            name="currency"
                                            value={company.currency}
                                            onChange={handleCompanyChange}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                        >
                                            {CURRENCIES.map((c) => (
                                                <option key={c} value={c} className="bg-slate-900 light:bg-white light:text-slate-900">
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Contact Email</label>
                                    <input
                                        type="email"
                                        name="contact_email"
                                        value={company.contact_email}
                                        onChange={handleCompanyChange}
                                        placeholder="admin@company.com"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Industry</label>
                                    <select
                                        name="industry"
                                        value={company.industry}
                                        onChange={handleCompanyChange}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="" className="bg-slate-900 light:bg-white light:text-slate-900">Select...</option>
                                        {INDUSTRIES.map((ind) => (
                                            <option key={ind} value={ind} className="bg-slate-900 light:bg-white light:text-slate-900">
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Address</label>
                                    <textarea
                                        name="address"
                                        value={company.address}
                                        onChange={handleCompanyChange}
                                        placeholder="123 Main St, City, Country"
                                        rows={2}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Locations */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-emerald-400">Primary Locations</h2>
                            <p className="text-slate-400 light:text-slate-600 text-sm">Add your main office or site locations.</p>
                            <div className="space-y-4">
                                {locations.map((loc, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-white/5 light:bg-slate-50 light:border-slate-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-500 uppercase light:text-slate-600">Location {idx + 1}</span>
                                            {locations.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLocation(idx)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid gap-3">
                                            <input
                                                type="text"
                                                placeholder="Location name *"
                                                value={loc.name}
                                                onChange={(e) => handleLocationChange(idx, 'name', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Address"
                                                value={loc.address}
                                                onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                            />
                                            <select
                                                value={loc.timezone}
                                                onChange={(e) => handleLocationChange(idx, 'timezone', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white light:bg-white light:border-slate-300 light:text-slate-900 focus:outline-none focus:border-emerald-500/50"
                                            >
                                                {TIMEZONES.map((tz) => (
                                                    <option key={tz} value={tz} className="bg-slate-900 light:bg-white light:text-slate-900">
                                                        {tz}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addLocation}
                                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"
                                >
                                    <Plus size={18} />
                                    Add another location
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirm */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-emerald-400">Review & Finish</h2>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Company</h3>
                                    <p className="text-white font-medium">{company.name}</p>
                                    {company.legal_name && <p className="text-slate-400 text-sm">{company.legal_name}</p>}
                                    <p className="text-slate-500 text-sm mt-1">{company.timezone} · {company.currency}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Locations</h3>
                                    <ul className="space-y-1">
                                        {locations.filter((l) => l.name?.trim()).map((loc, i) => (
                                            <li key={i} className="text-white text-sm">
                                                {loc.name}
                                                {loc.address && <span className="text-slate-500"> — {loc.address}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-400 light:border-slate-200 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                                Next
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleComplete}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-70"
                            >
                                {isLoading ? 'Completing...' : 'Complete Setup'}
                                <Check size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
