/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Keto Tracker Palette: warm beige, clean white, deep black
        cream: {
          50:  '#fdfcf8',
          100: '#f8f4ec',
          200: '#f0e9d8',
          300: '#e5d9c0',
          400: '#d4c4a0',
        },
        charcoal: {
          800: '#1a1a18',
          900: '#111110',
        },
        accent: {
          green:  '#3d6b4f',  // ketosis indicator
          yellow: '#c49a2a',  // caution / near-limit
          red:    '#b03a2e',  // over limit
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
