/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        army: {
          dark: '#0a0e1a',
          panel: '#111827',
          border: '#1f2937',
          accent: '#00ff88',
          danger: '#ff2d2d',
          warning: '#ffaa00',
          safe: '#00cc66',
          blue: '#0ea5e9',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      }
    },
  },
  plugins: [],
}
