/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#15803D',
          700: '#166534',
          800: '#14532D',
          900: '#052E16',
        },
        accent: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        warning: '#D97706',
        danger: '#DC2626',
        success: '#16A34A',
        ink: {
          DEFAULT: '#0A0F1A',
          muted: '#475569',
          subtle: '#697586',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F6F8F7',
          3: '#EDF1EF',
        },
        border: {
          subtle: '#EDEFF3',
          DEFAULT: '#E4E8EC',
          strong: '#CBD3DD',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Kannada"',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Plus Jakarta Sans"',
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Kannada"',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.6' }],
        lg: ['17px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.2' }],
        '5xl': ['48px', { lineHeight: '1.1' }],
        '6xl': ['60px', { lineHeight: '1.05' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '11px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      letterSpacing: {
        tightest: '-0.035em',
        tighter: '-0.025em',
        tight: '-0.015em',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(10 15 26 / 0.04)',
        sm: '0 1px 2px 0 rgb(10 15 26 / 0.05), 0 1px 1px 0 rgb(10 15 26 / 0.03)',
        md: '0 4px 14px -4px rgb(10 15 26 / 0.10), 0 2px 6px -3px rgb(10 15 26 / 0.07)',
        lg: '0 24px 48px -16px rgb(10 15 26 / 0.18), 0 8px 22px -10px rgb(10 15 26 / 0.10)',
        xl: '0 40px 72px -24px rgb(10 15 26 / 0.24), 0 16px 32px -16px rgb(10 15 26 / 0.12)',
        glow: '0 0 0 4px rgb(22 163 74 / 0.14)',
        'inner-hi': 'inset 0 1px 0 0 rgb(255 255 255 / 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        breathe: 'breathe 3.2s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgb(22 163 74 / 0.5)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 0 12px rgb(22 163 74 / 0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'leaf-pattern':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 10 C40 30, 30 60, 60 110 C90 60, 80 30, 60 10 Z' fill='none' stroke='%2316A34A' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
