/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy palette — still used by screens not yet migrated to the
        // broadcast theme below. Keep until every screen is reskinned.
        pitch: {
          950: '#071a0e',
          900: '#0f2d1a',
          800: '#1a472a',
          700: '#2d6a3f',
          600: '#3d8b52',
          500: '#4da864',
        },
        gold: {
          300: '#fcd34d',
          400: '#f0b429',
          500: '#d97706',
        },
        // Broadcast theme — carbon background + volt/magenta accents.
        // Values are CSS custom properties (defined in index.css) so raw
        // inline styles (chart colors, dynamic club colors, etc.) can share
        // the exact same tokens via var(--color-x).
        carbon: {
          DEFAULT: 'var(--color-carbon)',
          raised: 'var(--color-surface)',
          high: 'var(--color-surface-2)',
        },
        line: 'var(--color-line)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          dim: 'var(--color-ink-dim)',
          faint: 'var(--color-ink-faint)',
        },
        volt: {
          DEFAULT: 'var(--color-volt)',
          dim: 'var(--color-volt-dim)',
          mid: 'var(--color-volt-mid)',
        },
        magenta: {
          DEFAULT: 'var(--color-magenta)',
          dim: 'var(--color-magenta-dim)',
          mid: 'var(--color-magenta-mid)',
        },
        warn: {
          DEFAULT: 'var(--color-warn)',
          dim: 'var(--color-warn-dim)',
        },
      },
      fontFamily: {
        title: ['"Archivo Black"', 'Impact', 'sans-serif'],
        data: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
