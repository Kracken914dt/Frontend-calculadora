/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0b',
        accent: '#ff6b00',
        accentMuted: '#ff8a3d',
      },
    },
  },
  plugins: [],
}
