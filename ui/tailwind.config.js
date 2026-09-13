/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        adp: {
          red: '#d12030',
          dark: '#9e1220',
          crimson: '#e52538',
          glow: 'rgba(209, 32, 48, 0.35)',
        },
        space: {
          950: '#06090e',
          900: '#0b0f19',
          850: '#0f1726',
          800: '#172033',
          700: '#1e293b',
          600: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -5px rgba(209, 32, 48, 0.4)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-spin': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
