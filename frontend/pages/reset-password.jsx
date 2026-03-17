import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] bg-purple-900/20 opacity-40 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[128px] bg-purple-900/10 opacity-30 transition-colors duration-1000"></div>

            <div className="w-full max-w-lg z-10">
                <div className="glass-panel p-8 md:p-10 border border-purple-500/20 shadow-[0_0_50px_-12px_rgba(168,85,247,0.2)] transition-all duration-500">

                    {!isSuccess ? (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-xl font-bold mb-2 text-purple-400">
                                    Reset Password
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">
                                    Secure your account with a new strong password.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Token validation warning */}
                                {!token && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400">
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <p className="text-xs">No valid token found in URL. Please use the link from your email.</p>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-slate-500 dark:text-slate-400">New Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-3 text-slate-500 dark:text-slate-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="new"
                                            required
                                            value={passwords.new}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-white bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-slate-500 dark:text-slate-400">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-3 text-slate-500 dark:text-slate-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="confirm"
                                            required
                                            value={passwords.confirm}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-rose-400 text-xs text-center animate-pulse">{error}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !token}
                                    className={`w-full py-3 rounded-xl font-bold text-slate-900 dark:text-white shadow-lg transition-all transform active:scale-95 hover:brightness-110 flex justify-center items-center gap-2 bg-purple-500 shadow-purple-500/50 ${(isLoading || !token) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Resetting...' : 'Update Password'} <ArrowRight size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center animate-in fade-in zoom-in duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20">
                                    <CheckCircle2 size={40} className="text-purple-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-purple-400 mb-4">Password Updated!</h2>
                            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm mb-8">
                                Your password has been successfully reset. You can now log in with your new credentials.
                            </p>

                            <Link href="/login" className="w-full py-3 rounded-xl font-bold text-slate-900 dark:text-white shadow-lg transition-all transform active:scale-95 hover:brightness-110 flex justify-center items-center gap-2 bg-purple-500 shadow-purple-500/50">
                                Go to Login <ArrowRight size={18} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
