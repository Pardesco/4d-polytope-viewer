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
        // Primary neon colors
        'neon-cyan': '#00ffff',
        'neon-magenta': '#ff00ff',
        'neon-blue': '#0080ff',
        
        // Background layers
        'hud-bg': '#050810',
        'hud-panel': '#0a0e1a',
        'hud-panel-light': '#151b2e',
        
        // Accents
        'accent-green': '#00ff00',
        'accent-amber': '#ffaa00',
        'accent-red': '#ff0040',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 255, 255, 0.5)',
        'neon-magenta': '0 0 20px rgba(255, 0, 255, 0.5)',
        'neon-multi': '0 0 30px rgba(0, 255, 255, 0.3), 0 0 60px rgba(255, 0, 255, 0.2)',
      },
      dropShadow: {
        'neon': '0 0 10px currentColor',
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
