/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0e14',
          900: '#12161f',
          800: '#1a1f2e',
          700: '#252b3d',
          500: '#8b95a8',
          300: '#d5dbe8',
        },
        accent: {
          DEFAULT: '#4f8ef7',
          hover: '#3b7af0',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(79, 142, 247, 0.12)',
      },
    },
  },
  plugins: [],
}
