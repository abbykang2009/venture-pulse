/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#e6c200',
          500: '#d4af37',
          600: '#aa8c2c',
        },
        dark: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          600: '#262626',
        }
      }
    },
  },
  plugins: [],
}
