/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#141413',
          dot: 'rgba(235, 235, 236, 0.12)',
          frame: '#141413',
          border: 'rgba(235, 235, 236, 0.12)'
        },
        theme: {
          black: '#141413',           // rgb(20, 20, 19)
          white: '#ebebec',           // rgb(235, 235, 236) - inverted of rgb(20, 20, 19)
          grey: 'rgb(127, 127, 127)', // in-between neutral grey
          darkGrey: 'rgb(40, 40, 39)',
          lightGrey: 'rgb(180, 180, 181)'
        },
        figma: {
          bg: '#141413',
          panel: '#141413',
          header: '#141413',
          border: 'rgba(235, 235, 236, 0.1)',
          hover: 'rgba(235, 235, 236, 0.08)',
          active: 'rgba(235, 235, 236, 0.15)',
          accent: '#ebebec',          // Inverted high-contrast accent
          accentHover: '#ffffff',
          purple: '#ebebec',
          green: '#ebebec',
          orange: '#ebebec',
          yellow: '#ebebec',
          pink: '#ebebec'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        figjam: ['Caveat', 'Comic Sans MS', 'cursive']
      },
      boxShadow: {
        'panel': '0 8px 32px rgba(0, 0, 0, 0.65)',
        'modal': '0 20px 60px -15px rgba(0, 0, 0, 0.85)',
        'figjam': '2px 4px 12px rgba(0, 0, 0, 0.3)',
        'device': '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 10px #141413, 0 0 0 12px rgba(235, 235, 236, 0.15)'
      }
    },
  },
  plugins: [],
}
