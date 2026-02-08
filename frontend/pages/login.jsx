import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import apiClient from '@/lib/apiClient';
import { User, Mail, Lock, Briefcase, MapPin, Phone, ArrowRight, Check, Building2 } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const { login, ROLES } = useRole();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at
            };
            login(userData);
            router.push('/');
        } catch (err) {
            setError('SSO Authentication failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSSOLogin = (provider) => {
        apiClient.ssoLogin(provider);
    };

    const DOMAINS = [
        { label: 'Data/AI', value: 'data/ai' },
        { label: 'Cloud', value: 'cloud' },
        { label: 'Cyber', value: 'cyber' },
        { label: 'Development', value: 'development' }
    ];

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        company: '', // NEW: Company Name
        email: '',
        password: '',
        confirmPassword: '',
        role: 'End User',
        domain: 'development', // NEW: Domain selection
        location: 'New York HQ',
        phone: '',
        isManager: false // NEW: Manager toggle
    });

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const toggleMode = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        // Animate the cord pull
        setTimeout(() => {
            setIsLoginMode(!isLoginMode);
            setIsAnimating(false);
        }, 300); // Wait for half animation
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
                setError('Passwords do not match.');
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
                    domain: formData.role === 'End User' ? formData.domain : null,
                    location: formData.location,
                    position: formData.isManager ? 'MANAGER' : 'TEAM_MEMBER'
                };

                try {
                    await apiClient.register(registerData);
                    console.log("Registration successful!");
                    setSuccessMsg('Registration successful! Your account is pending administrator approval. You will be able to log in once activated.');
                    setIsLoginMode(true);
                    return; // Stop here, don't try to log in since status is PENDING
                } catch (regErr) {
                    console.error("Registration failed:", regErr);
                    setError(regErr.message || 'Registration failed. Please try again.');
                    return;
                }
            }

            console.log("Attempting real backend login...");
            const authResponse = await apiClient.login(formData.email, formData.password);
            console.log("Real backend login successful!");

            // Map backend response to what RoleContext expects
            const userData = {
                id: authResponse.user.id,
                userName: authResponse.user.full_name || authResponse.user.email.split('@')[0],
                role: authResponse.user.role,
                location: authResponse.user.location,
                email: authResponse.user.email,
                position: authResponse.user.position,
                domain: authResponse.user.domain,
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at
            };

            login(userData);
            router.push('/');
        } catch (e) {
            console.warn("Real backend auth failed:", e);
            setError(e.message || 'Authentication failed. Please check your credentials.');

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

    // Lamp Glow Text Color based on mode
    const glowColor = isLoginMode ? 'text-emerald-400' : 'text-purple-400';
    const glowBg = isLoginMode ? 'bg-emerald-500' : 'bg-purple-500';
    const glowShadow = isLoginMode ? 'shadow-emerald-500/50' : 'shadow-purple-500/50';

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">

            {/* Background Effects */}
            <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] transition-colors duration-1000 ${isLoginMode ? 'bg-emerald-900/20' : 'bg-purple-900/20'}`}></div>
            <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[128px] transition-colors duration-1000 ${isLoginMode ? 'bg-emerald-900/10' : 'bg-purple-900/10'}`}></div>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center z-10">

                {/* LAMP SECTION (LEFT) */}
                <div className="relative h-[500px] flex items-center justify-center hidden md:flex">
                    {/* The Light Beam */}
                    <div className={`absolute top-[180px] left-1/2 -translate-x-1/2 w-[280px] h-[400px] bg-gradient-to-b ${isLoginMode ? 'from-emerald-500/10 via-emerald-500/5' : 'from-purple-500/10 via-purple-500/5'} to-transparent blur-md transition-colors duration-700 pointer-events-none transform origin-top skew-x-[-12deg]`}></div>

                    {/* Cute Lamp SVG */}
                    <div className="relative z-20 transform -translate-y-12">
                        {/* SVG Lamp */}
                        <svg width="240" height="320" viewBox="0 0 200 300" className="drop-shadow-2xl">
                            {/* Stand */}
                            <rect x="95" y="140" width="10" height="120" fill="#cbd5e1" rx="5" />
                            {/* Base */}
                            <ellipse cx="100" cy="260" rx="40" ry="10" fill="#94a3b8" />
                            <ellipse cx="100" cy="258" rx="40" ry="10" fill="#e2e8f0" />

                            {/* Shade */}
                            <path d="M40 140 L 160 140 L 140 60 L 60 60 Z" fill={isLoginMode ? "#10b981" : "#a855f7"} className="transition-all duration-700 ease-in-out" />

                            {/* Shade Inner Top (for 3D look) */}
                            <ellipse cx="100" cy="60" rx="40" ry="8" fill={isLoginMode ? "#34d399" : "#c084fc"} className="transition-all duration-700" />

                            {/* Face (Cute) */}
                            <g transform="translate(100, 110)">
                                <circle cx="-15" cy="-5" r="3" fill="#1e293b" className="animate-pulse" />
                                <circle cx="15" cy="-5" r="3" fill="#1e293b" className="animate-pulse" />
                                <path d="M-8 5 Q 0 12 8 5" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
                                {isLoginMode ? (
                                    <path d="M-12 8 Q0 2 12 8" fill="#fda4af" opacity="0.6" />
                                ) : (
                                    <circle cx="0" cy="5" r="4" fill="#fda4af" opacity="0" />
                                )}
                            </g>

                            {/* Pull Cord */}
                            <g onClick={toggleMode} className={`cursor-pointer group hover:scale-105 transition-transform ${isAnimating ? 'animate-cord-pull' : 'animate-cord-sway'}`} style={{ transformOrigin: '100px 140px' }}>
                                <line x1="100" y1="140" x2="100" y2="190" stroke="#e2e8f0" strokeWidth="2" />
                                <circle cx="100" cy="195" r="6" fill={isLoginMode ? "#10b981" : "#a855f7"} className="transition-colors duration-700 shadow-lg" stroke="white" strokeWidth="2" />
                            </g>
                        </svg>
                    </div>
                </div>

                {/* FORM SECTION (RIGHT) */}
                <div className="relative">
                    <div className={`glass-panel p-8 md:p-10 border transition-all duration-500 ${isLoginMode ? 'border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]' : 'border-purple-500/20 shadow-[0_0_50px_-12px_rgba(168,85,247,0.2)]'}`}>

                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className={`text-3xl font-bold mb-2 transition-colors duration-500 ${glowColor}`}>
                                {isLoginMode ? 'Welcome Back' : 'Create Account'}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {isLoginMode ? 'Enter your details to access your workspace' : 'Join the team and start managing assets'}
                            </p>
                        </div>

                        {/* Form Inputs */}
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Register Only Fields */}
                            {!isLoginMode && (
                                <>
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left-4 fade-in duration-300">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-3 text-slate-500" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="John Doe"
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3 top-3 text-slate-500" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 animate-in slide-in-from-left-4 fade-in duration-300">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Company</label>
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-3 top-3 text-slate-500" />
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleInputChange}
                                                placeholder="Company Name"
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 animate-in slide-in-from-left-4 fade-in duration-300">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Role</label>
                                        <div className="relative">
                                            <Briefcase size={16} className="absolute left-3 top-3 text-slate-500" />
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={handleInputChange}
                                                className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors appearance-none cursor-pointer hover:bg-white/5 focus:border-purple-500`}
                                            >
                                                {ROLES.map(role => (
                                                    <option key={role.label} value={role.label} className="bg-slate-900">{role.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-3 pointer-events-none text-slate-500">▼</div>
                                        </div>
                                    </div>

                                    {/* Manager/Employee Toggle - ONLY for End User role */}
                                    {formData.role === 'End User' && (
                                        <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-500 uppercase">Are you a Manager?</label>
                                                <div className="flex gap-4">
                                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${!formData.isManager
                                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                                        : 'border-white/10 bg-slate-900/50 text-slate-400 hover:bg-white/5'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="isManager"
                                                            checked={!formData.isManager}
                                                            onChange={() => setFormData({ ...formData, isManager: false })}
                                                            className="sr-only"
                                                        />
                                                        <span className="font-medium text-sm">👤 Employee</span>
                                                    </label>
                                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.isManager
                                                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                                                        : 'border-white/10 bg-slate-900/50 text-slate-400 hover:bg-white/5'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="isManager"
                                                            checked={formData.isManager}
                                                            onChange={() => setFormData({ ...formData, isManager: true })}
                                                            className="sr-only"
                                                        />
                                                        <span className="font-medium text-sm">👔 Manager</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Domain Selection */}
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase">Choose Domain</label>
                                                <div className="relative">
                                                    <Briefcase size={16} className="absolute left-3 top-3 text-slate-500" />
                                                    <select
                                                        name="domain"
                                                        value={formData.domain}
                                                        onChange={handleInputChange}
                                                        className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors appearance-none cursor-pointer hover:bg-white/5 focus:border-purple-500`}
                                                    >
                                                        {DOMAINS.map(domain => (
                                                            <option key={domain.value} value={domain.value} className="bg-slate-900">{domain.label}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-3 pointer-events-none text-slate-500">▼</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="name@company.com"
                                        className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors ${isLoginMode ? 'focus:border-emerald-500' : 'focus:border-purple-500'}`}
                                    />
                                </div>
                            </div>

                            {!isLoginMode && ( // Location for Register
                                <div className="space-y-1 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Location</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="Office Location"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="••••••••"
                                        className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors ${isLoginMode ? 'focus:border-emerald-500' : 'focus:border-purple-500'}`}
                                    />
                                </div>
                            </div>

                            {!isLoginMode && ( // Confirm Password
                                <div className="space-y-1 animate-in slide-in-from-left-4 fade-in duration-300">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Confirm Password</label>
                                    <div className="relative">
                                        <Check size={16} className="absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="text-rose-400 text-xs mt-2 text-center animate-pulse">{error}</p>
                            )}

                            {successMsg && (
                                <p className="text-emerald-400 text-xs mt-2 text-center animate-bounce">{successMsg}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 hover:brightness-110 flex justify-center items-center gap-2 ${glowBg} ${glowShadow} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Processing...' : (isLoginMode ? 'Login' : 'Create Account')} <ArrowRight size={18} />
                            </button>
                        </form>

                        {/* SSO Section */}
                        {isLoginMode && (
                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                <div className="relative flex items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink mx-4 text-xs font-semibold text-slate-500 uppercase">Or continue with SSO</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => handleSSOLogin('google')}
                                        className="flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-white/5 transition-all group"
                                    >
                                        <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                                    </button>
                                    <button
                                        onClick={() => handleSSOLogin('azure')}
                                        className="flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-white/5 transition-all group"
                                    >
                                        <img src="https://img.icons8.com/color/48/000000/azure-1.png" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Azure" />
                                    </button>
                                    <button
                                        onClick={() => handleSSOLogin('okta')}
                                        className="flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-white/5 transition-all group"
                                    >
                                        <img src="https://img.icons8.com/color/48/000000/okta.png" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Okta" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {isLoginMode && (
                            <div className="mt-4 text-center">
                                <button className="text-xs text-slate-500 hover:text-white transition-colors">Forgot Password?</button>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-white/5 text-center md:hidden">
                            <p className="text-sm text-slate-400 mb-2">
                                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                            </p>
                            <button
                                onClick={toggleMode}
                                className={`font-semibold ${glowColor}`}
                            >
                                {isLoginMode ? 'Register Now' : 'Login Here'}
                            </button>
                        </div>
                    </div>

                    {/* Instructional Arrow purely visual */}
                    <div className="absolute -left-32 top-1/2 hidden md:block opacity-60 pointer-events-none">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-slate-500 text-xs font-handwriting rotate-[-12deg]">Pull to switch!</span>
                            <svg width="60" height="40" viewBox="0 0 60 40">
                                <path d="M10 10 Q 30 5 50 20" stroke="#64748b" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" strokeDasharray="4 2" />
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                                    </marker>
                                </defs>
                            </svg>
                        </div>
                    </div>
                </div>
            </div >

            <style jsx>{`
                @keyframes cord-sway {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2deg); }
                }
                .animate-cord-sway {
                    animation: cord-sway 3s ease-in-out infinite;
                }
                @keyframes cord-pull {
                    0% { transform: translateY(0); }
                    50% { transform: translateY(15px); }
                    100% { transform: translateY(0); }
                }
                .animate-cord-pull {
                    animation: cord-pull 0.3s ease-in-out;
                }
            `}</style>
        </div >
    );
}

// Add generic styles if needed mostly handled by Tailwind
