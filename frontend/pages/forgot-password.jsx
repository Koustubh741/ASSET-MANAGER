import { useState } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] bg-emerald-900/20 opacity-40 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[128px] bg-emerald-900/10 opacity-30 transition-colors duration-1000"></div>

            <div className="w-full max-w-lg z-10 transition-all duration-500">
                <div className="glass-panel p-8 md:p-10 border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">

                    {!isSubmitted ? (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-xl font-bold mb-2 text-emerald-400">
                                    Forgot Password?
                                </h1>
                                <p className="text-app-text-muted text-app-text-muted text-sm">
                                    No worries! Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-app-text-muted uppercase text-app-text-muted">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-3 text-app-text-muted" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full bg-white dark:bg-slate-900/50 border border-app-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-app-text bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-rose-400 text-xs text-center animate-pulse">{error}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-3 rounded-xl font-bold text-app-text shadow-lg transition-all transform active:scale-95 hover:brightness-110 flex justify-center items-center gap-2 bg-emerald-500 shadow-emerald-500/50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Processing...' : 'Send Reset Link'} <ArrowRight size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center animate-in fade-in zoom-in duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                    <CheckCircle2 size={40} className="text-emerald-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-emerald-400 mb-4">Request Sent!</h2>
                            <p className="text-app-text-muted text-app-text-muted text-sm mb-8">
                                If an account exists for <span className="text-app-text font-medium">{email}</span>,
                                you will receive a password reset link shortly.
                            </p>

                            {debugToken && (
                                <div className="mb-8 p-4 bg-white dark:bg-slate-900/80 border border-app-border bg-slate-50 border-slate-200 rounded-xl text-left">
                                    <p className="text-[10px] text-app-text-muted uppercase font-bold mb-2">DEBUG MODE: Reset Token</p>
                                    <Link
                                        href={`/reset-password?token=${debugToken}`}
                                        className="text-xs text-emerald-400 hover:underline break-all"
                                    >
                                        Click here to reset (Simulated Email Link)
                                    </Link>
                                </div>
                            )}

                            <Link href="/login" className="text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition-colors inline-flex items-center gap-2">
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    )}

                    {!isSubmitted && (
                        <div className="mt-8 text-center pt-6 border-t border-app-border">
                            <Link href="/login" className="text-app-text-muted hover:text-slate-900 dark:hover:text-white text-xs transition-colors inline-flex items-center gap-2">
                                <ArrowLeft size={14} /> Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
