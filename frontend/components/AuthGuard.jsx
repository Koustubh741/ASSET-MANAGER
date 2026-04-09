import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import apiClient from '@/lib/apiClient';

const ROLE_DASHBOARD_MAP = {
    'ADMIN': '/dashboard/system-admin',
    'ASSET_MANAGER': '/dashboard/asset-inventory-manager',
    'PROCUREMENT': '/procurement',
    'FINANCE': '/finance',
    'IT_MANAGEMENT': '/executive-dashboard',
    'CEO': '/executive-dashboard',
    'CFO': '/executive-dashboard',
    'END_USER': '/',
    'MANAGER': '/',
    'IT_SUPPORT': '/executive-dashboard'
};

export default function AuthGuard({ children }) {
    const { isAuthenticated, currentRole, isAdmin, isFinanceStaff, isProcurementStaff, isLoading, isVerified } = useRole();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);
    const [setupCompleted, setSetupCompleted] = useState(true);
    const [mounted, setMounted] = useState(false);
    const isNavigating = useRef(false);

    // ROOT FIX: Hydration Guard
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !currentRole) return;
        if (!isAdmin) {
            setSetupStatusLoaded(true);
            setSetupCompleted(true);
            return;
        }
        let cancelled = false;
        apiClient.getSetupStatus()
            .then((res) => {
                if (!cancelled) {
                    setSetupCompleted(res.setup_completed === true);
                    setSetupStatusLoaded(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSetupCompleted(true);
                    setSetupStatusLoaded(true);
                }
            });
        return () => { cancelled = true; };
    }, [isAuthenticated, currentRole]);

    useEffect(() => {
        if (!mounted || isLoading || !isVerified) {
            console.log("AuthGuard: [WAITING] System is stabilizing...", { mounted, isLoading, isVerified });
            return;
        }

        const checkAuth = async () => {
            if (isNavigating.current) return;

            const currentPath = router.asPath.split('?')[0];
            const isLoginPage = currentPath === '/login';
            const isSetupPage = currentPath === '/setup';

            console.log("AuthGuard: [CHECKING]", {
                isAuthenticated,
                role: currentRole?.slug,
                path: currentPath,
                isReady: router.isReady,
                setupStatusLoaded,
                setupCompleted,
                isVerified
            });

            if (!isAuthenticated) {
                if (!isLoginPage && !isSetupPage) {
                    console.warn("AuthGuard: [UNAUTHORIZED] No session found. Redirecting to login.");
                    isNavigating.current = true;
                    router.replace('/login').finally(() => { isNavigating.current = false; });
                } else {
                    console.log("AuthGuard: [ALLOWED] At login/setup page, unauthorized is fine.");
                    setAuthorized(true);
                }
                return;
            }


            const targetPath = ROLE_DASHBOARD_MAP[currentRole.slug] || '/';

            // Special case: if we are already at the target path, we are authorized.
            if (currentPath === targetPath) {
                setAuthorized(true);
                return;
            }

            if (isSetupPage) {
                if (!isAdmin) {
                    isNavigating.current = true;
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                    return;
                }
                if (setupStatusLoaded && setupCompleted) {
                    isNavigating.current = true;
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                    return;
                }
                setAuthorized(true);
                return;
            }

            if (currentPath === '/') {
                if (isAdmin && setupStatusLoaded && !setupCompleted) {
                    isNavigating.current = true;
                    router.replace('/setup').finally(() => { isNavigating.current = false; });
                    return;
                }
                isNavigating.current = true;
                router.replace(targetPath).finally(() => { isNavigating.current = false; });
                return;
            }

            // Only System Admin / Admin may access system-admin dashboard; others redirect to their portal
            const isSystemAdminPath = currentPath === '/dashboard/system-admin' || currentPath.startsWith('/dashboard/system-admin/');
            const isFinancePath = currentPath === '/finance' || currentPath.startsWith('/finance/');
            const isProcurementPath = currentPath === '/procurement' || currentPath.startsWith('/procurement/');

            if (isSystemAdminPath && !isAdmin) {
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            if (isFinancePath && !isFinanceStaff) {
                console.warn(`AuthGuard: [UNAUTHORIZED] ${currentRole.slug} attempted to access Finance portal. Redirecting.`);
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            if (isProcurementPath && !isProcurementStaff) {
                console.warn(`AuthGuard: [UNAUTHORIZED] ${currentRole.slug} attempted to access Procurement portal. Redirecting.`);
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            setAuthorized(true);
        };

        if (router.isReady) {
            if (isAuthenticated && isAdmin && !setupStatusLoaded) {
                return;
            }
            checkAuth();
        }

    }, [isAuthenticated, currentRole, router.asPath, router.isReady, isLoading, isVerified, mounted, setupStatusLoaded, setupCompleted]);

    const isPublicPage = router.pathname === '/login' || router.pathname === '/setup' || router.asPath === '/setup';
    const needsSetupCheck = isAuthenticated && isAdmin && !setupStatusLoaded;
    const showLoading = !mounted || isLoading || !isVerified || needsSetupCheck || (!authorized && !isPublicPage) || (!isAuthenticated && !isPublicPage);

    if (showLoading) {
        return (
            <div className="min-h-screen bg-app-bg text-app-text font-['Space_Grotesk'] flex items-center justify-center relative overflow-hidden">
                {/* BACKGROUND TELEMETRY LAYERS */}
                <div className="absolute inset-0 pointer-events-none opacity-20 select-none">
                    <div className="absolute top-10 left-10 text-[10px] space-y-1 text-primary/50 uppercase tracking-tight font-mono">
                        <div>LAT: 40.7128° N</div>
                        <div>LNG: 74.0060° W</div>
                        <div>ALT: 42.0m</div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-2 border-primary/30 flex items-center justify-center relative">
                        <div className="absolute inset-0 animate-pulse bg-primary/5"></div>
                        <div className="w-10 h-10 border border-primary animate-spin-[2s_linear_infinite] flex items-center justify-center">
                            <div className="w-4 h-4 bg-primary animate-ping"></div>
                        </div>
                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-primary"></div>
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h2 className="text-sm font-bold tracking-[0.4em] uppercase text-primary animate-pulse">
                            Handshaking_Identity
                        </h2>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-primary/30"></div>
                            <span className="text-[10px] font-mono text-app-text-muted tracking-widest uppercase">
                                Cryptographic_Sync_V.4
                            </span>
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-primary/30"></div>
                        </div>
                    </div>
                </div>

                {/* SCANNING LINE */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-scan-slow z-50 pointer-events-none"></div>

                <style jsx>{`
                    @keyframes scan-slow {
                        0% { transform: translateY(-100%); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: translateY(100vh); opacity: 0; }
                    }
                    .animate-scan-slow {
                        animation: scan-slow 3s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    return children;
}
