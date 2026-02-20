/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '2.5rem' }],
        title: ['1.25rem', { lineHeight: '1.75rem' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '0.75rem',
        panel: '1rem',
      },
    },
  },
  plugins: [
    // Light theme variant: use light:bg-slate-100 etc. when html.light
    function ({ addVariant }) {
      addVariant('light', 'html.light &');
    },
    // Glass panels (dark default)
    function ({ addUtilities }) {
      addUtilities({
        '.glass-panel': {
          backgroundColor: 'rgb(15 23 42 / 0.6)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgb(255 255 255 / 0.1)',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          transition: 'all 200ms',
        },
        '.glass-panel:hover': {
          borderColor: 'rgb(99 102 241 / 0.3)',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        },
        '.glass-card': {
          backgroundColor: 'rgb(30 41 59 / 0.5)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgb(255 255 255 / 0.1)',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
      });
    },
    // Light theme: body, glass, and scrollbar via Tailwind (no globals.css)
    function ({ addBase }) {
      addBase({
        'html.light body': {
          backgroundImage: 'none',
          backgroundColor: '#f1f5f9',
          color: '#0f172a',
        },
        'html.light .glass-panel': {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        },
        'html.light .glass-panel:hover': {
          borderColor: 'rgba(99, 102, 241, 0.35)',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        },
        'html.light .glass-card': {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)',
        },
        'html.light ::-webkit-scrollbar-thumb': {
          backgroundColor: '#cbd5e1',
          borderRadius: '9999px',
        },
        'html.light ::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#94a3b8',
        },
      });
    },
  ],
}
