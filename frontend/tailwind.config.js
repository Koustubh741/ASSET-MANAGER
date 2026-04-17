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
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        outfit: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        
        // Semantic Theme Colors
        'app-bg': 'var(--bg-app)',
        'app-surface': 'var(--bg-surface)',
        'app-surface-soft': 'var(--bg-surface-soft)',
        'app-text': 'var(--text-main)',
        'app-text-muted': 'var(--text-muted)',
        'app-border': 'var(--border-main)',
        
        // Kinetic Ops Specialization
        'app-obsidian': 'var(--bg-surface-obsidian)',
        'app-void': 'var(--bg-app-void)',
        'app-panel': 'var(--bg-surface-panel)',
        'app-card': 'var(--bg-surface-card)',
        'app-primary': 'var(--color-kinetic-primary)',
        'app-secondary': 'var(--color-kinetic-secondary)',
        'app-cyan': 'var(--color-kinetic-cyan)',
        'app-rose': 'var(--color-kinetic-rose)',
        'app-gold': 'var(--color-kinetic-gold)',
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
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'morph': 'morph 8s ease-in-out infinite',
        'scan': 'scan 10s linear infinite',
      },
      keyframes: {
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 30% / 50% 60% 30% 60%' },
        },
        scan: {
          '0%': { backgroundPosition: '-100% -100%' },
          '100%': { backgroundPosition: '100% 100%' },
        }
      }
    },
  },
  plugins: [],
}
