import '@/styles/globals.css'
import Layout from '@/components/Layout'
import PortalLayout from '@/components/PortalLayout'
import { RoleProvider, useRole } from '@/contexts/RoleContext'
import { AssetProvider } from '@/contexts/AssetContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ToastProvider } from '@/components/common/Toast'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

function getPortalVariant(pathname) {
    if (pathname.startsWith('/finance')) return 'finance';
    if (pathname.startsWith('/procurement')) return 'procurement';
    return null;
}

function AppContent({ Component, pageProps }) {
    const router = useRouter();
    const { isAdmin } = useRole();
    const portalVariant = getPortalVariant(router.pathname);

    // If Admin, always use global Layout to preserve full sidebar access.
    // Otherwise, use PortalLayout for Finance/Procurement specific paths.
    const Wrapper = (portalVariant && !isAdmin) ? (
        <PortalLayout variant={portalVariant}>
            <Component {...pageProps} />
        </PortalLayout>
    ) : (
        <Layout>
            <Component {...pageProps} />
        </Layout>
    );

    const isLoginPage = router.pathname === '/login';
    const isSetupPage = router.pathname === '/setup';

    return (isLoginPage || isSetupPage) ? (
        <Component {...pageProps} />
    ) : (
        Wrapper
    );
}

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        const handleRouteChange = (url) => {
            if (url !== '/login' && url !== '/setup' && url !== '/') {
                localStorage.setItem('lastRoute', url);
            }
        };

        router.events.on('routeChangeComplete', handleRouteChange);

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router]);

    return (
        <ToastProvider>
            <RoleProvider>
                <AssetProvider>
                    <NotificationProvider>
                        <AuthGuard>
                            <AppContent Component={Component} pageProps={pageProps} />
                        </AuthGuard>
                    </NotificationProvider>
                </AssetProvider>
            </RoleProvider>
        </ToastProvider>
    );
}
