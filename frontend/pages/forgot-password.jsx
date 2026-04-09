import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Disc } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [debugToken, setDebugToken] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await apiClient.forgotPassword(email);
            setIsSubmitted(true);
            if (response.debug_token) {
                setDebugToken(response.debug_token);
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
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
                    
                    {!isSubmitted ? (
                        <div className="p-8 md:p-12">
                            {/* Status Label */}
                            <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_var(--color-warning)]"></div>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-app-text-muted">
                                    Sector: Recovery Relay / Lost Protocol
                                </span>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-xl font-bold mb-2 text-app-text tracking-widest uppercase">
                                    Lost_Protocol? / Pwd_Recovery
                                </h2>
                                <p className="text-app-text-muted text-xs tracking-wide">
                                    Input agent identifier email to dispatch secure recovery link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-6 relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-warning/20"></div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-warning uppercase tracking-widest">Agent Identifier (Email)</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-4 top-3.5 text-warning opacity-40" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="USER@AEGIS.CMD"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-warning transition-all font-mono placeholder:text-app-text-muted/30"
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
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-none font-bold text-sm tracking-[0.3em] uppercase transition-all transform active:scale-[0.98] relative overflow-hidden group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} bg-app-text text-app-bg hover:bg-warning hover:text-white dark:hover:text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                        {isLoading ? 'Relaying Signal...' : 'Dispatch Link'} 
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
                            
                            <h2 className="text-2xl font-bold text-success mb-4 tracking-widest uppercase">Signal Dispatched</h2>
                            <p className="text-app-text-muted text-xs tracking-wider mb-8 max-w-sm mx-auto">
                                If identifier <span className="text-app-text font-bold text-primary font-mono">{email}</span> is recognized,
                                a restoration link has been relayed to that terminal.
                            </p>

                            {debugToken && (
                                <div className="mb-8 p-4 bg-app-surface-soft border border-app-border/40 rounded-none text-left relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                                    <p className="text-[10px] text-app-text-muted uppercase font-bold mb-2 tracking-widest">DEBUG_MODE: RESTORATION_TOKEN</p>
                                    <Link
                                        href={`/reset-password?token=${debugToken}`}
                                        className="text-xs text-primary hover:text-white transition-colors font-mono break-all"
                                    >
                                        &gt; ACCESS_SIMULATED_LINK [CLICK_HERE]
                                    </Link>
                                </div>
                            )}

                            <Link href="/login" className="text-[10px] font-bold text-success hover:text-white uppercase tracking-[0.3em] cursor-pointer transition-colors border border-success/30 py-4 px-6 inline-flex items-center gap-2 hover:bg-success/10">
                                <ArrowLeft size={16} /> Return to Login Securely
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
