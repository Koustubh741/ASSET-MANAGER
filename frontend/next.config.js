/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
        'antd',
        '@ant-design/icons',
        '@rc-component/util',
        '@rc-component/table',
        '@rc-component/select',
        '@rc-component/picker',
        '@rc-component/input',
        '@rc-component/form',
        '@rc-component/menu',
        '@rc-component/dropdown',
        '@rc-component/checkbox',
        '@rc-component/cascader',
        '@rc-component/collapse',
        '@rc-component/dialog',
        '@rc-component/drawer',
        '@rc-component/image',
        '@rc-component/input-number',
        '@rc-component/mentions',
        '@rc-component/motion',
        '@rc-component/mutate-observer',
        '@rc-component/notification',
        '@rc-component/overflow',
        '@rc-component/pagination',
        '@rc-component/portal',
        '@rc-component/progress',
        '@rc-component/qrcode',
        '@rc-component/rate',
        '@rc-component/resize-observer',
        '@rc-component/segmented',
        '@rc-component/slider',
        '@rc-component/steps',
        '@rc-component/switch',
        '@rc-component/tabs',
        '@rc-component/textarea',
        '@rc-component/tooltip',
        '@rc-component/tour',
        '@rc-component/tree',
        '@rc-component/tree-select',
        '@rc-component/trigger',
        '@rc-component/upload',
        '@rc-component/virtual-list',
        'react-force-graph-2d',
        'force-graph',
        'kapsule',
        'react-kapsule',
        'accessor-fn',
        'd3-force',
        'd3-quadtree',
        'd3-dispatch',
        'd3-timer',
        'd3-drag',
        'd3-selection',
        'd3-zoom',
        'd3-color',
        'd3-interpolate',
        'd3-transition',
        'd3-shape',
        'd3-path',
        'd3-scale',
        'd3-array',
        'd3-format',
        'd3-time',
        'd3-time-format'
    ],
    experimental: {
        esmExternals: 'loose'
    },
    // ROOT FIX: Server-side redirects for all legacy and broken routes.
    // These are resolved at the HTTP layer before React loads — zero-flicker, no JS required.
    async redirects() {
        return [
            // Legacy support page → integrated ticketing system
            {
                source: '/dashboard/support',
                destination: '/tickets/new',
                permanent: true, // 308 — updates bookmarks and browser history
            },
            // Legacy ticket creation route (old naming convention)
            {
                source: '/tickets/create',
                destination: '/tickets/new',
                permanent: true,
            },
            // Bare /help → tickets dashboard
            {
                source: '/help',
                destination: '/tickets',
                permanent: true,
            },
            // Recover from poisoned /support redirect (break browser cache)
            {
                source: '/support',
                destination: '/unit-command',
                permanent: false, // 307 temporary redirect
            },
        ]
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://127.0.0.1:8000/api/v1/:path*',
            },
            {
                source: '/api/auth/sync',
                destination: 'http://127.0.0.1:8000/api/v1/auth/sync',
            },
        ]
    },
}

module.exports = nextConfig
