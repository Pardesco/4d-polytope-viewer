/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./viewer.html",
    "./gallery.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',      // Purple
        'primary-dark': '#7C3AED',
        secondary: '#EC4899',    // Pink
        'secondary-dark': '#DB2777',
        dark: '#0F172A',         // Dark blue-gray
        'dark-lighter': '#1E293B',
        'dark-accent': '#334155',
        accent: '#00D9FF',       // Cyan accent
        'accent-dark': '#00B4D8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: []
};
