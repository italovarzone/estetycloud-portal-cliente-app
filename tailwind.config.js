/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#bca49d', hover: '#9d8983', soft: '#e7cac2' },
        textcol: '#1D1411'
      },
      boxShadow: { soft: '0 10px 25px rgba(0,0,0,0.08)' }
    },
  },
  plugins: [],
}
