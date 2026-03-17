import '@/styles/globals.css'
import Layout from '@/components/Layout'
import PortalLayout from '@/components/PortalLayout'
import { RoleProvider } from '@/contexts/RoleContext'
import { AssetProvider } from '@/contexts/AssetContext'
import { ToastProvider } from '@/components/common/Toast'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

function getPortalVariant(pathname) {
    if (pathname.startsWith('/finance')) return 'finance';
    if (pathname.startsWith('/procurement')) return 'procurement';
    return null;
}

export default function App({ Component, pageProps }) {
    const router = useRouter();
    const isLoginPage = router.pathname === '/login';
    const isSetupPage = router.pathname === '/setup';
    const portalVariant = getPortalVariant(router.pathname);

    useEffect(() => {
        const handleRouteChange = (url) => {
            if (url !== '/login' && url !== '/setup' && url !== '/') {
                localStorage.setItem('lastRoute', url);
            }
        };

        router.events.on('routeChangeComplete', handleRouteChange);

        // Root fix: do NOT redirect from / to lastRoute. Let AuthGuard send user to
        // their role-specific dashboard (/finance for Finance, /procurement for Procurement).
        // Otherwise Finance users could land on Procurement hub when lastRoute was /procurement.

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router]);

    const Wrapper = portalVariant ? (
        <PortalLayout variant={portalVariant}>
            <Component {...pageProps} />
        </PortalLayout>
    ) : (
        <Layout>
            <Component {...pageProps} />
        </Layout>
    );

    return (
        <ToastProvider>
        <RoleProvider>
            <AssetProvider>
                <AuthGuard>
                    {(isLoginPage || isSetupPage) ? (
                        <Component {...pageProps} />
                    ) : (
                        Wrapper
                    )}
                </AuthGuard>
            </AssetProvider>
        </RoleProvider>
        </ToastProvider>
    )
}
