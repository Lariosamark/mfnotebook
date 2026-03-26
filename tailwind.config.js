/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: {
          50:  '#111827',
          100: '#1f2937',
          200: '#374151',
          300: '#4b5563',
          400: '#6b7280',
          500: '#9ca3af',
          600: '#d1d5db',
          700: '#e5e7eb',
          800: '#f3f4f6',
          900: '#f9fafb',
          950: '#ffffff',
        },
      },
      boxShadow: {
        'soft':   '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'card':   '0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)',
        'lifted': '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        'glow':   '0 0 0 3px rgba(34,197,94,0.2)',
        'inner-soft': 'inset 0 1px 2px rgba(0,0,0,0.05)',
        'panel':  '2px 0 8px rgba(0,0,0,0.04)',
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.22s ease-out',
        'slide-in-right':'slideInRight 0.22s ease-out',
        'slide-up':      'slideUp 0.22s ease-out',
        'scale-in':      'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                                to: { opacity: '1' } },
        slideInLeft:  { from: { opacity: '0', transform: 'translateX(-12px)' },to: { opacity: '1', transform: 'translateX(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(8px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.96)' },      to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
