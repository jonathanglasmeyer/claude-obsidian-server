/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'base': '17px',  // Standard noch größer (16px -> 17px)
        'sm': '16px',    // Small größer (15px -> 16px)
        'xs': '14px',    // Extra small größer (13px -> 14px)
      }
    }
  },
  plugins: [],
};