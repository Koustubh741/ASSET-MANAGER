import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html className="dark">
            <Head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="manifest" href="/manifest.json" />
            </Head>
            <body className="bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100 min-h-screen font-sans transition-colors duration-300 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-700">
                {/* Blocking script to prevent theme flash - runs before React hydration */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const savedSettings = localStorage.getItem('appSettings');
                                    const root = document.documentElement;
                                    
                                    if (savedSettings) {
                                        const { theme } = JSON.parse(savedSettings);
                                        
                                        if (theme === 'dark') {
                                            root.classList.add('dark');
                                        } else if (theme === 'light') {
                                            root.classList.remove('dark');
                                        } else {
                                            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                                root.classList.add('dark');
                                            } else {
                                                root.classList.remove('dark');
                                            }
                                        }
                                    } else {
                                        // Default to dark if no settings
                                        root.classList.add('dark');
                                    }
                                } catch (e) {
                                    // Fallback to dark on error
                                    document.documentElement.classList.add('dark');
                                }
                            })();
                        `,
                    }}
                />
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
