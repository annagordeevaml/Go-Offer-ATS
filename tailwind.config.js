/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          purple: '#7C3AED',
          cyan: '#06B6D4',
        },
        background: {
          dark: '#1a0b2e',
          darker: '#2d1b4e',
        },
        text: {
          primary: '#ffffff',
          secondary: '#e0e7ff',
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

