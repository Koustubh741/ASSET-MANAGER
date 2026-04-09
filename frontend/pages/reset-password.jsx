import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, Disc, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPassword() {
    const router = useRouter();
    const { token } = router.query;

    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleInputChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setError('Missing reset token. Please request a new link.');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            setError('Passwords do not match.');
            return;
        }

        if (passwords.new.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await apiClient.resetPassword(token, passwords.new);
            setIsSuccess(true);
        } catch (err) {
            setError(err.message || 'Reset failed. Token may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6 overflow-hidden relative font-['Space_Grotesk']">
            
            {/* BACKGROUND TELEMETRY LAYER: COORDINATES */}
            <div className="absolute top-8 left-8 space-y-1 opacity-20 hidden md:block select-none pointer-events-none">
                <div className="text-[10px] font-mono tracking-widest uppercase">LAT: 40.7128° N</div>
                <div className="text-[10px] font-mono tracking-widest uppercase">LNG: 74.0060° W</div>
                <div className="text-[10px] font-mono tracking-widest uppercase">ALT: 42.0M</div>
            </div>

            {/* BACKGROUND TELEMETRY LAYER: SYSTEM STATUS */}
            <div className="absolute top-8 right-8 text-right space-y-1 opacity-20 hidden md:block select-none pointer-events-none">
                <div className="text-[10px] font-mono tracking-widest uppercase">SYSTEM: AEGIS-V4</div>
                <div className="text-[10px] font-mono tracking-widest uppercase">ENCRYPTION: AES-256-GCM</div>
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-end gap-2">
                    STATUS: <span className="text-success animate-pulse">OPERATIONAL</span>
                </div>
            </div>

            {/* BACKGROUND TELEMETRY LAYER: FOOTER */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end opacity-20 select-none pointer-events-none">
                <div className="flex gap-4">
                    <div className="w-8 h-8 border border-app-text/20 relative">
                        <div className="absolute inset-1 bg-primary/20 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="w-1 h-1 bg-success animate-pulse"></div>
                    <div className="text-[10px] text-success/50 font-mono uppercase tracking-widest">{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</div>
                </div>
            </div>

            {/* SCANNING LINE */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-scan z-50 pointer-events-none"></div>

            <div className="w-full max-w-2xl flex flex-col items-center z-10 transition-all duration-700 mt-[-5vh]">
                
                 {/* BRAND HEADER */}
                 <div className="mb-12 text-center relative group">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 border-2 border-primary flex items-center justify-center relative overflow-hidden">
                            <Disc className="text-primary animate-spin-slow" size={24} />
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-app-text"></div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-primary">
                            Aegis Command
                        </h1>
                    </div>
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                    <p className="mt-3 text-app-text-muted text-xs tracking-widest uppercase font-medium">Strategic Asset Intelligence & Control</p>
                </div>

                <div className="w-full glass-panel !rounded-none !bg-app-surface/80 backdrop-blur-xl border border-app-border/30 shadow-2xl relative overflow-hidden">
                    
                    {!isSuccess ? (
                        <div className="p-8 md:p-12">
                            {/* Status Label */}
                            <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-app-text-muted">
                                    Sector: Access Protocol Recalibration
                                </span>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-xl font-bold mb-2 text-app-text tracking-widest uppercase">
                                    Configure_Access_Credential
                                </h2>
                                <p className="text-app-text-muted text-xs tracking-wide">
                                    Establish new secure authentication tokens for agent terminal access.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Token validation warning */}
                                {!token && (
                                    <div className="p-3 bg-danger/10 border-l-2 border-danger text-danger text-[10px] uppercase font-bold tracking-widest flex items-start gap-3">
                                        <AlertCircle size={18} className="shrink-0 mt-[-2px]" />
                                        <p>Critical: Authentication token missing. Return to dispatch gateway.</p>
                                    </div>
                                )}

                                <div className="space-y-6 relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20"></div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest">New Secure Credential</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-4 top-3.5 text-primary opacity-40" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="new"
                                                required
                                                value={passwords.new}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-primary transition-all font-mono"
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

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Verify Secure Credential</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-4 top-3.5 text-primary opacity-40" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="confirm"
                                                required
                                                value={passwords.confirm}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-danger/10 border-l-2 border-danger text-danger text-[10px] uppercase font-bold tracking-widest animate-shake">
                                        ERROR: {error}
                                    </div>
                                )}

                                <div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !token}
                                        className={`w-full py-4 rounded-none font-bold text-sm tracking-[0.3em] uppercase transition-all transform active:scale-[0.98] relative overflow-hidden group ${isLoading || !token ? 'opacity-50 cursor-not-allowed' : ''} bg-primary text-white dark:text-[#122f5f] hover:bg-app-text hover:text-app-bg shadow-[0_0_20px_var(--color-primary)/30]`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                        {isLoading ? 'Commiting Signal...' : 'Commit Secure Credential'} 
                                        {!isLoading && <ArrowRight size={18} className="inline ml-2 transition-transform group-hover:translate-x-1" />}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-12 text-center pt-6 border-t border-app-border/40">
                                <Link href="/login" className="text-[10px] font-bold text-app-text-muted hover:text-primary uppercase tracking-widest cursor-pointer transition-colors border-b border-transparent hover:border-primary inline-flex items-center gap-2">
                                    <ArrowLeft size={14} /> Abort & Return to Gateway
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 md:p-12 text-center animate-in fade-in zoom-in duration-500">
                             <div className="flex justify-center mb-8">
                                <div className="w-20 h-20 bg-success/10 border border-success/30 flex items-center justify-center relative overflow-hidden">
                                     <div className="absolute top-0 left-0 w-full h-[2px] bg-success/20 animate-scan"></div>
                                     <CheckCircle2 size={40} className="text-success shadow-[0_0_15px_var(--color-success)]" />
                                     {/* Corner Accents */}
                                     <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-success"></div>
                                     <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-success"></div>
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-success mb-4 tracking-widest uppercase">Credential Applied</h2>
                            <p className="text-app-text-muted text-xs tracking-wider mb-8 max-w-sm mx-auto">
                                Secure terminal access has been restored. You can now authenticate using your updated credential sets.
                            </p>

                            <Link href="/login" className="w-full py-4 rounded-none font-bold text-sm tracking-[0.3em] uppercase transition-all transform active:scale-[0.98] relative overflow-hidden group bg-success text-white dark:text-[#003824] hover:bg-app-text hover:text-app-bg shadow-[0_0_20px_var(--color-success)/30] flex justify-center items-center gap-2">
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                Return to Secure Login <ArrowRight size={18} />
                            </Link>
                        </div>
                    )}

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
                .animate-spin-slow {
                    animation: spin 6s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
