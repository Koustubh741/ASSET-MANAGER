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
  ],
}
