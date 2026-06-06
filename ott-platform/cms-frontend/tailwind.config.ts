import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f1', 100: '#ffe1e1', 200: '#ffc7c7',
          300: '#ffa0a0', 400: '#ff6b6b', 500: '#e50914',
          600: '#cc0812', 700: '#a5060e', 800: '#8a0810',
          900: '#720a11', 950: '#3e0205',
        },
        surface: {
          900: '#0a0a0a', 800: '#141414', 700: '#1a1a1a',
          600: '#222222', 500: '#2a2a2a', 400: '#333333',
          300: '#444444', 200: '#666666', 100: '#999999',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
