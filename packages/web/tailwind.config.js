/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pxo: {
          bg: '#0a0a0f',
          surface: '#0f0f1a',
          border: '#1a1a2e',
          'border-glow': 'rgba(0,255,204,0.13)',
          text: '#e0e0e8',
          'text-dim': '#5a5a6e',
          cyan: '#00ffcc',
          magenta: '#ff00aa',
          amber: '#ffaa00',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 8px rgba(0,255,204,0.4), 0 0 20px rgba(0,255,204,0.15)',
        'glow-magenta': '0 0 8px rgba(255,0,170,0.4), 0 0 20px rgba(255,0,170,0.15)',
        'glow-amber': '0 0 8px rgba(255,170,0,0.4)',
      },
      animation: {
        'pulse-dot': 'pxo-pulse-dot 2s ease-in-out infinite',
        'blink': 'pxo-blink 1s step-end infinite',
        'scan': 'pxo-scan 1.2s linear infinite',
        'float': 'pxo-float 3s ease-in-out infinite',
      },
      keyframes: {
        'pxo-pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
        'pxo-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'pxo-scan': {
          from: { left: '-100%' },
          to: { left: '100%' },
        },
        'pxo-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
