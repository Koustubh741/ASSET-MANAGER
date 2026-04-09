import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import { User, Mail, Lock, Briefcase, MapPin, Phone, ArrowRight, Check, Building2, Disc, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
    const router = useRouter();
    const { login, ROLES } = useRole();
    const toast = useToast();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // SSO Callback Effect
    useEffect(() => {
        const { provider, code } = router.query;
        if (code && provider) {
            handleSSOCallback(provider, code);
        }
    }, [router.query]);

    const handleSSOCallback = async (provider, code) => {
        setIsLoading(true);
        setError('');
        try {
            const authResponse = await apiClient.ssoCallback(provider, code);
            const userData = {
                id: authResponse.user.id,
                userName: authResponse.user.full_name || authResponse.user.email.split('@')[0],
                role: authResponse.user.role,
                location: authResponse.user.location,
                email: authResponse.user.email,
                position: authResponse.user.position,
                domain: authResponse.user.domain,
                department: authResponse.user.department,
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at,
                plan: authResponse.user.plan || 'STARTER'
            };
            login(userData);
            router.push('/');
        } catch (err) {
            const msg = 'SSO Authentication failed: ' + (err.message || 'Unknown error');
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSSOLogin = (provider) => {
        apiClient.ssoLogin(provider);
    };

    // Departments aligned with roles: IT (System Admin, IT Management), Finance, Procurement, Asset Management (Asset & Inventory Manager), rest for End Users
    const DEPT_DOMAIN_MAP = {
        'IT': ['Infrastructure', 'Network', 'System Admin', 'Hardware', 'Software'],
        'Finance': ['Accounting', 'Audit', 'Budget', 'Treasury', 'Payroll'],
        'Procurement': ['Sourcing', 'Vendor Management', 'Purchasing', 'Contracting'],
        'Engineering': ['Software Development', 'DevOps', 'Quality Assurance', 'Research'],
        'Operations': ['Logistics', 'Supply Chain', 'Facilities', 'Fleet Management'],
        'HR': ['Recruitment', 'Benefits', 'Employee Relations', 'Training'],
        'Sales': ['Inside Sales', 'Field Sales', 'Account Management'],
        'Marketing': ['Content', 'Growth', 'Brand Strategy', 'Digital Marketing'],
        'Legal': ['Compliance', 'Contracts', 'IP Management', 'Litigation'],
        'Product': ['Management', 'Design', 'Research', 'Strategy'],
        'Cloud': ['Cloud Architecture', 'Managed Services', 'Hybrid Cloud'],
        'Architecture': ['System Design', 'Enterprise Standards', 'Governance'],
        'Data & AI': ['Machine Learning', 'Data Engineering', 'Analytics', 'AI Research'],
        'Security': ['Cyber Security', 'Physical Security', 'Compliance', 'Identity'],
        'Executive': ['Strategy', 'Leadership', 'Board Relations'],
        'Customer Success': ['Support', 'Retention', 'Onboarding'],
        'Asset Management': ['Inventory', 'Lifecycle', 'Warehouse', 'Stock Control']
    };

    const DEPARTMENTS = Object.keys(DEPT_DOMAIN_MAP);

    // Role Slider Mapping → default department
    const ROLE_DEFAULT_DEPARTMENT = {
        'ADMIN': 'IT',
        'MANAGER': 'Executive',
        'SUPPORT': 'IT',
        'END_USER': 'Engineering'
    };

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        company: '', // NEW: Company Name
        email: '',
        password: '',
        confirmPassword: '',
        role: 'End User',
        domain: 'Software Development', // First domain of default department
        department: 'Engineering', // Default; use IT/Finance/Procurement/Asset Management for corresponding roles
        location: 'New York HQ',
        phone: '',
        isManager: false,
        support_id: '' // NEW: Support ID field for staff registration
    });

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const next = { ...formData, [name]: value };
        if (name === 'role') {
            const roleSlug = ROLES.find(r => r.label === value)?.slug;
            if (roleSlug && ROLE_DEFAULT_DEPARTMENT[roleSlug]) {
                next.department = ROLE_DEFAULT_DEPARTMENT[roleSlug];
                const domains = DEPT_DOMAIN_MAP[next.department];
                next.domain = domains && domains[0] ? domains[0] : next.domain;
            }
            // Auto-sync isManager based on role selection
            next.isManager = value === 'Department Manager' || value === 'System Admin';
        }
        if (name === 'department') {
            const domains = DEPT_DOMAIN_MAP[value];
            next.domain = domains && domains[0] ? domains[0] : formData.domain;
        }
        setFormData(next);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please fill in all required fields.');
            return;
        }

        if (!isLoginMode) {
            if (formData.password !== formData.confirmPassword) {
                const msg = 'Passwords do not match.';
                setError(msg);
                toast.error(msg);
                return;
            }
            if (!formData.name) {
                setError('Full Name is required.');
                return;
            }
        }

        try {
            if (!isLoginMode) {
                console.log("Attempting real backend registration...");
                const registerData = {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.name,
                    phone: formData.phone,
                    company: formData.company,
                    role: ROLES.find(r => r.label === formData.role)?.slug || 'END_USER',
                    domain: formData.domain || null,
                    department: formData.department,
                    location: formData.location,
                    position: (formData.role === 'Department Manager' || formData.role === 'System Admin') ? 'MANAGER' : 'TEAM_MEMBER',
                    persona: formData.support_id // Store Support ID in persona field
                };

                try {
                    await apiClient.register(registerData);
                    console.log("Registration successful!");
                    const msg = 'Registration successful! Your account is pending administrator approval. You will be able to log in once activated.';
                    setSuccessMsg(msg);
                    toast.success(msg);
                    setIsLoginMode(true);
                    return; // Stop here, don't try to log in since status is PENDING
                } catch (regErr) {
                    console.error("Registration failed:", regErr);
                    const msg = regErr.message || 'Registration failed. Please try again.';
                    setError(msg);
                    toast.error(msg);
                    return;
                }
            }

            console.log("Attempting real backend login...");
            const authResponse = await apiClient.login(formData.email, formData.password);
            console.log("Real backend login successful!");

            // Map backend response to what RoleContext expects
            // Root Fix: Include plan for AI Assistant subscription enforcement
            const userData = {
                id: authResponse.user.id,
                userName: authResponse.user.full_name || authResponse.user.email.split('@')[0],
                role: authResponse.user.role,
                location: authResponse.user.location,
                email: authResponse.user.email,
                position: authResponse.user.position,
                domain: authResponse.user.domain,
                department: authResponse.user.department,
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at,
                plan: authResponse.user.plan || 'STARTER'
            };

            // Root fix: do not log in if backend ever returns a non-ACTIVE user (e.g. PENDING)
            const userStatus = authResponse.user?.status;
            if (userStatus && userStatus !== 'ACTIVE') {
                setError('');
                const pendingMsg = 'Your account is pending administrator approval. You will be able to log in once activated.';
                setSuccessMsg(pendingMsg);
                toast.info?.(pendingMsg) ?? toast.success(pendingMsg);
                return;
            }

            login(userData);
            router.push('/');
        } catch (e) {
            console.warn("Real backend auth failed:", e);
            // Root fix: show clear message for PENDING / not active (backend returns 401 with activation message)
            const rawMsg = e.message || '';
            const isPendingOrInactive = /not active|activation|pending/i.test(rawMsg) || (e.response?.data?.detail && /not active|activation|pending/i.test(String(e.response.data.detail)));
            const msg = isPendingOrInactive
                ? 'Your account is pending administrator approval. You will be able to log in once activated.'
                : (rawMsg || 'Authentication failed. Please check your credentials.');
            if (isPendingOrInactive) {
                setError('');
                setSuccessMsg(msg);
                toast.success(msg);
            } else {
                setError(msg);
                toast.error(msg);
            }

            // Optional: Keep mock fallback for demonstration if desired, but user specifically asked for DB reflection
            /*
            const mockUserData = {
                userName: formData.name || formData.email.split('@')[0],
                role: formData.role,
                location: formData.location,
                email: formData.email,
                position: formData.isManager ? 'MANAGER' : 'EMPLOYEE'
            };
            login(mockUserData);
            router.push('/');
            */
        }
    };

    // NEW: Tactical Redesign
    const toggleMode = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        // Play scan "sound" or visual feedback
        setTimeout(() => {
            setIsLoginMode(!isLoginMode);
            setIsAnimating(false);
        }, 600); // Slightly longer for the biometric scan feel
    };

    const ScanningOverlay = () => (
        <div className={`absolute inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px]"></div>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_var(--color-primary)] animate-scan-fast"></div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <div className="text-[10px] font-mono text-primary tracking-[0.5em] uppercase animate-pulse">
                    &gt; RECALIBRATING_INTERFACES...
                </div>
            </div>
        </div>
    );


    return (
        <div className="min-h-screen bg-app-bg text-app-text font-['Space_Grotesk'] flex items-center justify-center p-4 md:p-8 overflow-hidden relative selection:bg-primary/30 transition-colors duration-500">
            
            {/* Background Telemetry Layers */}
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-10 dark:opacity-40"></div>
                <div className="absolute top-10 left-10 text-[10px] space-y-1 text-primary/50 uppercase tracking-tight font-mono">
                    <div>LAT: 40.7128° N</div>
                    <div>LNG: 74.0060° W</div>
                    <div>ALT: 42.0m</div>
                </div>
                <div className="absolute top-10 right-10 text-[10px] text-success/50 uppercase tracking-tight font-mono text-right">
                    <div>SYSTEM: CACHE-SERVE V1</div>
                    <div>ENCRYPTION: AES-256-GCM</div>
                    <div>STATUS: OPERATIONAL</div>
                </div>
                <div className="absolute bottom-10 left-10 w-32 h-[1px] bg-gradient-to-r from-primary/50 to-transparent"></div>
                <div className="absolute bottom-10 right-10 flex gap-2">
                    <div className="w-1 h-1 bg-success animate-pulse"></div>
                    <div className="text-[10px] text-success/50 font-mono uppercase tracking-widest">{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</div>
                </div>
            </div>

            {/* SCANNING LINE */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-scan z-50 pointer-events-none"></div>

            <div className={`w-full max-w-5xl flex flex-col items-center z-10 transition-all duration-700 ${isAnimating ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                
                {/* BRAND HEADER */}
                <div className="mb-12 text-center relative group">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 border-2 border-primary flex items-center justify-center relative overflow-hidden">
                            <Disc className="text-primary animate-spin-slow" size={24} />
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-app-text"></div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-primary">
                            Cache Serve
                        </h1>
                    </div>
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                    <p className="mt-3 text-app-text-muted text-xs tracking-widest uppercase font-medium">Distributed Asset Serving & Digital Logistics</p>
                </div>

                {/* MAIN AUTH CONTAINER */}
                <div className={`w-full max-w-2xl glass-panel !rounded-none !bg-app-surface/80 backdrop-blur-xl border border-app-border/30 shadow-2xl relative overflow-hidden ${isAnimating ? 'animate-glitch' : ''}`}>
                    
                    {/* TRANSITION OVERLAY */}
                    <ScanningOverlay />
                    {/* TABS */}
                    <div className="flex border-b border-app-border/30">
                        <button 
                            onClick={() => !isLoginMode && toggleMode()}
                            className={`flex-1 py-5 text-sm font-bold tracking-widest uppercase transition-all relative overflow-hidden ${isLoginMode ? 'text-primary bg-app-surface-soft' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Command Login
                            {isLoginMode && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>}
                        </button>
                        <button 
                            onClick={() => isLoginMode && toggleMode()}
                            className={`flex-1 py-5 text-sm font-bold tracking-widest uppercase transition-all relative overflow-hidden ${!isLoginMode ? 'text-success bg-app-surface-soft' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Agent Registration
                            {!isLoginMode && <div className="absolute bottom-0 left-0 w-full h-1 bg-success shadow-[0_0_10px_var(--color-success)]"></div>}
                        </button>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Status Label */}
                        <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className={`w-2 h-2 rounded-full ${isLoginMode ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-success shadow-[0_0_8px_var(--color-success)]'}`}></div>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-app-text-muted">
                                {isLoginMode ? 'Sector: Access Gateway' : 'Sector: Node Onboarding'}
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {!isLoginMode ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Personal Identity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                        <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-success/20"></div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-success uppercase tracking-widest">Full Name</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="IDENTITY_NODE"
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-success focus:ring-1 focus:ring-success/20 transition-all font-mono placeholder:text-app-text-muted/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-success uppercase tracking-widest">Network / Phone</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+X 000-0000"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-success transition-all font-mono placeholder:text-app-text-muted/30"
                                            />
                                        </div>
                                    </div>

                                    {/* Professional Scoping */}
                                    <div className="space-y-6 relative">
                                        <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20"></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Operation / Company</label>
                                                <input
                                                    type="text"
                                                    name="company"
                                                    value={formData.company}
                                                    onChange={handleInputChange}
                                                    placeholder="ORG_NAME"
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Clearance Level</label>
                                                <select
                                                    name="role"
                                                    value={formData.role}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer font-mono"
                                                >
                                                    {Array.from(new Set(ROLES.map(r => r.label))).map(label => {
                                                        const role = ROLES.find(r => r.label === label);
                                                        return <option key={role.slug} value={role.label}>{role.label}</option>;
                                                    })}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                 <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Command Position / Unit Level</label>
                                                 <div className="flex gap-2 p-[2px] bg-app-surface-soft border border-app-border/40">
                                                     <div className={`flex-1 py-2.5 text-center text-[10px] font-bold tracking-widest transition-all ${!formData.isManager ? 'bg-primary/20 text-primary border border-primary/30' : 'text-app-text-muted opacity-40'}`}>
                                                         STAFF_UNIT
                                                     </div>
                                                     <div className={`flex-1 py-2.5 text-center text-[10px] font-bold tracking-widest transition-all ${formData.isManager ? 'bg-primary text-white dark:text-[#003138]' : 'text-app-text-muted opacity-40'}`}>
                                                         COMMANDER
                                                     </div>
                                                 </div>
                                             </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Department</label>
                                                <select
                                                    name="department"
                                                    value={formData.department}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer font-mono"
                                                >
                                                    {DEPARTMENTS.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Task Domain</label>
                                                <select
                                                    name="domain"
                                                    value={formData.domain}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer font-mono"
                                                >
                                                    {(DEPT_DOMAIN_MAP[formData.department] || []).map(domain => (
                                                        <option key={domain} value={domain}>{domain}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Physical Sector / Location</label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                placeholder="COMMAND_POST_LOC"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                                            />
                                        </div>

                                        {/* Support ID for Staff Roles */}
                                        {ROLES.find(r => r.label === formData.role)?.slug === 'SUPPORT' && (
                                            <div className="space-y-2 animate-in zoom-in-95 duration-300">
                                                <label className="text-[10px] font-bold text-warning uppercase tracking-widest">Support Protocol ID</label>
                                                <input
                                                    type="text"
                                                    name="support_id"
                                                    value={formData.support_id}
                                                    onChange={handleInputChange}
                                                    placeholder="CS-STF-XXXX"
                                                    className="w-full bg-app-surface-soft border border-warning/30 rounded-none py-3 px-4 text-sm text-warning focus:outline-none focus:border-warning transition-all font-mono placeholder:text-warning/20"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {/* Credentials Section (Always visible) */}
                            <div className="space-y-6 relative">
                                <div className={`absolute -left-4 top-0 bottom-0 w-[2px] ${isLoginMode ? 'bg-primary/20' : 'bg-indigo-500/20'}`}></div>
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${isLoginMode ? 'text-primary' : 'text-indigo-500'}`}>Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className={`absolute left-4 top-3.5 ${isLoginMode ? 'text-primary' : 'text-indigo-500'} opacity-40`} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="USER@CACHE.SRV"
                                            className={`w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-4 text-sm focus:outline-none transition-all font-mono ${isLoginMode ? 'focus:border-primary' : 'focus:border-indigo-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isLoginMode ? 'text-primary' : 'text-indigo-500'}`}>Secure Credential</label>
                                        <div className="relative">
                                            <Lock size={16} className={`absolute left-4 top-3.5 ${isLoginMode ? 'text-primary' : 'text-indigo-500'} opacity-40`} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                className={`w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-12 text-sm focus:outline-none transition-all font-mono ${isLoginMode ? 'focus:border-primary' : 'focus:border-indigo-500'}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-3.5 text-app-text-muted/50 hover:text-app-text transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isLoginMode && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Verify Secure Credential</label>
                                            <div className="relative">
                                                <Check size={16} className="absolute left-4 top-3.5 text-indigo-500 opacity-40" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-3.5 text-app-text-muted/50 hover:text-app-text transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-danger/10 border-l-2 border-danger text-danger text-[10px] uppercase font-bold tracking-widest animate-shake">
                                    ERROR: {error}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-success/10 border-l-2 border-success text-success text-[10px] uppercase font-bold tracking-widest animate-pulse">
                                    SYSTEM: {successMsg}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-4 rounded-none font-bold text-sm tracking-[0.3em] uppercase transition-all transform active:scale-[0.98] relative overflow-hidden group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isLoginMode ? 'bg-primary text-white dark:text-[#122f5f] hover:bg-app-text hover:text-app-bg shadow-[0_0_20px_var(--color-primary)/30]' : 'bg-success text-white dark:text-[#003824] hover:bg-app-text hover:text-app-bg shadow-[0_0_20px_var(--color-success)/30]'}`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    {isLoading ? 'Relaying Pulse...' : (isLoginMode ? 'Authorize Node' : 'Register Node')}
                                    {!isLoading && <ArrowRight size={18} className="inline ml-2 transition-transform group-hover:translate-x-1" />}
                                </button>
                            </div>
                        </form>

                        {/* SSO Section */}
                        {isLoginMode && (
                            <div className="mt-12 space-y-6">
                                <div className="relative flex items-center">
                                    <div className="flex-grow border-t border-app-border/40"></div>
                                    <span className="flex-shrink mx-4 text-[10px] font-bold text-app-text-muted uppercase tracking-[0.2em]">External Access Gateways</span>
                                    <div className="flex-grow border-t border-app-border/40"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <button onClick={() => handleSSOLogin('google')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5 h-5" alt="Google" />
                                    </button>
                                    <button onClick={() => handleSSOLogin('azure')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://authjs.dev/img/providers/azure.svg" className="w-5 h-5" alt="Azure" />
                                    </button>
                                    <button onClick={() => handleSSOLogin('okta')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://authjs.dev/img/providers/okta.svg" className="w-5 h-5" alt="Okta" />
                                    </button>
                                </div>
                                <div className="text-center pt-4">
                                    <Link href="/forgot-password">
                                        <span className="text-[10px] font-bold text-app-text-muted hover:text-primary uppercase tracking-widest cursor-pointer transition-colors border-b border-transparent hover:border-primary">LOST_PROTOCOL? / PWD_RECOVERY</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DECORATIVE CORNER ACCENTS */}
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                        <div className="absolute top-2 right-2 w-4 h-[1px] bg-app-text/20"></div>
                        <div className="absolute top-2 right-2 w-[1px] h-4 bg-app-text/20"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(100vh); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 4s linear infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 2;
                }
                @keyframes scan-fast {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(600px); opacity: 0; }
                }
                .animate-scan-fast {
                    animation: scan-fast 0.6s ease-in-out infinite;
                }
                @keyframes glitch {
                    0% { opacity: 0.9; filter: contrast(1.1) brightness(1.2); }
                    50% { opacity: 1; filter: contrast(1) brightness(1); }
                    100% { opacity: 0.9; filter: contrast(1.1) brightness(1.2); }
                }
                .animate-glitch {
                    animation: glitch 0.1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Add generic styles if needed mostly handled by Tailwind
