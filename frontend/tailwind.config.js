/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          teal: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          dark: {
            DEFAULT: '#0f172a',
            secondary: '#1e293b',
            tertiary: '#334155'
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          cairo: ['Cairo', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
          'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
          'elegant': '0 10px 40px -10px rgba(0,0,0,0.08)',
          'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out forwards',
          'slide-up': 'slideUp 0.6s ease-out forwards',
          'slide-right': 'slideRight 0.5s ease-out forwards',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { opacity: '0', transform: 'translateY(20px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          slideRight: {
            '0%': { opacity: '0', transform: 'translateX(-20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          }
        }
      },
    },
    plugins: [
      require('@tailwindcss/typography'),
    ],
  }