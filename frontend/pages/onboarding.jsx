import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

const STEPS = ['Welcome', 'Company Info', 'First Location', 'First Asset', 'All Done!'];

function StepIndicator({ current }) {
    return (
        <div className="flex items-center gap-0 mb-10">
            {STEPS.map((label, i) => (
                <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: i < current ? 'linear-gradient(135deg,#6366f1,#34d399)' : i === current ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                            border: i === current ? '2px solid #6366f1' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: i <= current ? '#fff' : '#475569',
                            flexShrink: 0, transition: 'all 0.3s',
                        }}>{i < current ? '✓' : i + 1}</div>
                        <span style={{ fontSize: 10, color: i === current ? '#818cf8' : '#475569', marginTop: 4, whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{ height: 2, flex: 1, background: i < current ? 'linear-gradient(90deg,#6366f1,#34d399)' : 'rgba(255,255,255,0.06)', margin: '0 4px', marginBottom: 18 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useRole();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [company, setCompany] = useState({ name: '', industry: '', timezone: 'Asia/Kolkata', currency: 'INR', contact_email: '' });
    const [location, setLocation] = useState({ name: '', address: '' });
    const [asset, setAsset] = useState({ name: '', type: 'Laptop', model: '', vendor: '', serial_number: '', status: 'In Stock', cost: '' });

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));

    const saveCompany = async () => {
        setSaving(true);
        try {
            await apiClient.completeSetup(company);
            next();
        } catch (e) { setErrors({ company: e.message }); }
        finally { setSaving(false); }
    };

    const saveLocation = async () => {
        setSaving(true);
        try {
            await apiClient.post('/reference/locations', location);
            next();
        } catch (e) {
            // tolerate if not available, proceed
            next();
        } finally { setSaving(false); }
    };

    const saveAsset = async () => {
        setSaving(true);
        try {
            const segment = user?.dept_obj?.name || user?.department || 'IT';
            const payload = { 
                ...asset, 
                segment, 
                department_id: user?.department_id || null,
                cost: asset.cost ? Number(asset.cost) : 0 
            };
            await apiClient.createAsset(payload);
            next();
        } catch (e) { setErrors({ asset: e.message }); }
        finally { setSaving(false); }
    };

    return (
        <>
            <Head><title>Onboarding – Cache Serve</title></Head>
            <style>{`
                body { background: radial-gradient(ellipse at 20% 0%,#0d1330 0%,#07070f 60%); }
                .ob-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 40px; }
                .ob-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 14px; width: 100%; outline: none; }
                .ob-input:focus { border-color: rgba(99,102,241,0.5); }
                .ob-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 5px; display: block; text-transform: uppercase; letter-spacing: 0.05em; }
                .ob-btn { padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
                .ob-btn-primary { background: linear-gradient(135deg,#6366f1,#818cf8); color: #fff; }
                .ob-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
                .ob-btn-secondary { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1) !important; }
            `}</style>

            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 680 }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>Welcome to Cache Serve</h1>
                        <p style={{ color: '#64748b', marginTop: 8 }}>Let's get your platform set up in a few minutes</p>
                    </div>

                    <StepIndicator current={step} />

                    <div className="ob-card">
                        {/* Step 0: Welcome */}
                        {step === 0 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 64, marginBottom: 20 }}>👋</div>
                                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Hi there!</h2>
                                <p style={{ color: '#64748b', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
                                    We'll walk you through setting up your company profile, adding your first location, and registering your first asset.
                                </p>
                                <button className="ob-btn ob-btn-primary" onClick={next}>Let's Get Started →</button>
                            </div>
                        )}

                        {/* Step 1: Company Info */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Company Information</h2>
                                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>This helps personalize your platform and reports.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="ob-label">Company Name *</label>
                                        <input className="ob-input" placeholder="Acme Corp" value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Industry</label>
                                        <input className="ob-input" placeholder="Technology" value={company.industry} onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Contact Email</label>
                                        <input className="ob-input" type="email" placeholder="admin@company.com" value={company.contact_email} onChange={e => setCompany(c => ({ ...c, contact_email: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Currency</label>
                                        <select className="ob-input premium-select" value={company.currency} onChange={e => setCompany(c => ({ ...c, currency: e.target.value }))}>
                                            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {errors.company && <p style={{ color: '#f87171', fontSize: 13 }}>{errors.company}</p>}
                                <div className="flex justify-between mt-6">
                                    <button className="ob-btn ob-btn-secondary" onClick={() => setStep(0)}>← Back</button>
                                    <button className="ob-btn ob-btn-primary" onClick={saveCompany} disabled={!company.name || saving}>
                                        {saving ? 'Saving…' : 'Continue →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: First Location */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📍 Add Your First Location</h2>
                                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Add your head office or primary site.</p>
                                <div>
                                    <label className="ob-label">Location Name *</label>
                                    <input className="ob-input" placeholder="e.g. Mumbai HQ" value={location.name} onChange={e => setLocation(l => ({ ...l, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="ob-label">Address</label>
                                    <input className="ob-input" placeholder="Street, City, PIN" value={location.address} onChange={e => setLocation(l => ({ ...l, address: e.target.value }))} />
                                </div>
                                <div className="flex justify-between mt-6">
                                    <button className="ob-btn ob-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                                    <div className="flex gap-3">
                                        <button className="ob-btn ob-btn-secondary" onClick={next}>Skip</button>
                                        <button className="ob-btn ob-btn-primary" onClick={saveLocation} disabled={!location.name || saving}>
                                            {saving ? 'Saving…' : 'Add Location →'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: First Asset */}
                        {step === 3 && (
                            <div className="space-y-5">
                                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📦 Register Your First Asset</h2>
                                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>You can add more assets later — just start with one.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="ob-label">Asset Name *</label>
                                        <input className="ob-input" placeholder="MacBook Pro 14" value={asset.name} onChange={e => setAsset(a => ({ ...a, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Type *</label>
                                        <select className="ob-input premium-select" value={asset.type} onChange={e => setAsset(a => ({ ...a, type: e.target.value }))}>
                                            {['Laptop', 'Desktop', 'Server', 'Mobile', 'Network Device', 'Printer', 'Display', 'Other'].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="ob-label">Model</label>
                                        <input className="ob-input" placeholder="MacBook Pro M3" value={asset.model} onChange={e => setAsset(a => ({ ...a, model: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Vendor</label>
                                        <input className="ob-input" placeholder="Apple" value={asset.vendor} onChange={e => setAsset(a => ({ ...a, vendor: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Serial Number *</label>
                                        <input className="ob-input" placeholder="SN-001" value={asset.serial_number} onChange={e => setAsset(a => ({ ...a, serial_number: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="ob-label">Cost (₹)</label>
                                        <input className="ob-input" type="number" placeholder="150000" value={asset.cost} onChange={e => setAsset(a => ({ ...a, cost: e.target.value }))} />
                                    </div>
                                </div>
                                {errors.asset && <p style={{ color: '#f87171', fontSize: 13 }}>{errors.asset}</p>}
                                <div className="flex justify-between mt-6">
                                    <button className="ob-btn ob-btn-secondary" onClick={() => setStep(2)}>← Back</button>
                                    <div className="flex gap-3">
                                        <button className="ob-btn ob-btn-secondary" onClick={next}>Skip</button>
                                        <button className="ob-btn ob-btn-primary" onClick={saveAsset} disabled={!asset.name || !asset.serial_number || saving}>
                                            {saving ? 'Saving…' : 'Register Asset →'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Done */}
                        {step === 4 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                                <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>You're all set!</h2>
                                <p style={{ color: '#64748b', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 28px' }}>
                                    Your platform is ready. Head to your dashboard to begin managing assets, users, and more.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button className="ob-btn ob-btn-primary" onClick={() => router.push('/dashboard/system-admin')}>Go to Dashboard →</button>
                                    <button className="ob-btn ob-btn-secondary" onClick={() => router.push('/assets/add')}>Add More Assets</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
