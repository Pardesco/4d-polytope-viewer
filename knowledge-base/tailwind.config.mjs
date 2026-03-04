/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Cyberpunk color palette
        cyber: {
          cyan: '#00d9ff',
          'cyan-dim': '#00a8c6',
          'cyan-glow': '#00ffff',
          magenta: '#ff00ff',
          'dark': '#0a0a0f',
          'darker': '#050508',
          'panel': 'rgba(10, 15, 25, 0.85)',
          'border': 'rgba(0, 217, 255, 0.3)',
          'border-bright': 'rgba(0, 217, 255, 0.6)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        display: ['"Orbitron"', '"Rajdhani"', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px)`,
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 217, 255, 0.3)',
        'cyber-lg': '0 0 40px rgba(0, 217, 255, 0.4)',
        'cyber-inset': 'inset 0 0 20px rgba(0, 217, 255, 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 217, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.6)' },
        }
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#e0e0e0',
            a: {
              color: '#00d9ff',
              '&:hover': {
                color: '#00ffff',
              },
            },
            h1: { color: '#ffffff' },
            h2: { color: '#00d9ff' },
            h3: { color: '#e0e0e0' },
            h4: { color: '#e0e0e0' },
            strong: { color: '#ffffff' },
            code: {
              color: '#00d9ff',
              backgroundColor: 'rgba(0, 217, 255, 0.1)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            blockquote: {
              borderLeftColor: '#00d9ff',
              color: '#b0b0b0',
              backgroundColor: 'rgba(0, 217, 255, 0.05)',
              padding: '1rem',
            },
            hr: { borderColor: 'rgba(0, 217, 255, 0.2)' },
            'ul > li::marker': { color: '#00d9ff' },
            'ol > li::marker': { color: '#00d9ff' },
            th: {
              color: '#00d9ff',
              borderBottomColor: 'rgba(0, 217, 255, 0.3)',
            },
            td: {
              borderBottomColor: 'rgba(0, 217, 255, 0.1)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
