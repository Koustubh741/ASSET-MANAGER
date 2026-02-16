import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html>
            <Head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="manifest" href="/manifest.json" />
            </Head>
            <body>
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
                                        
                                        if (theme === 'light') {
                                            root.classList.remove('dark');
                                            root.classList.add('light');
                                        } else if (theme === 'dark') {
                                            root.classList.add('dark');
                                            root.classList.remove('light');
                                        } else if (theme === 'system') {
                                            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                                root.classList.add('dark');
                                                root.classList.remove('light');
                                            } else {
                                                root.classList.remove('dark');
                                                root.classList.add('light');
                                            }
                                        } else {
                                            // Default to dark
                                            root.classList.add('dark');
                                            root.classList.remove('light');
                                        }
                                    } else {
                                        // Default to dark if no settings
                                        root.classList.add('dark');
                                        root.classList.remove('light');
                                    }
                                } catch (e) {
                                    // Fallback to dark on error
                                    document.documentElement.classList.add('dark');
                                    document.documentElement.classList.remove('light');
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
