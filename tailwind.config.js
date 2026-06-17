/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
}
