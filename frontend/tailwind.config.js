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
        primary: {
          DEFAULT: '#1e40af', // Royal Blue
          light: '#3b82f6',
          dark: '#1d4ed8',
        },
        secondary: {
          DEFAULT: '#0f172a', // Dark Navy
          light: '#1e293b',
          dark: '#020617',
        },
        accent: {
          DEFAULT: '#f97316', // Orange
          light: '#fb923c',
          dark: '#ea580c',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
