/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Darker brown color scheme matching FG-Label-Main (#5D4037)
        primary: {
          50: '#faf7f5',
          100: '#f5ede8',
          200: '#ead9d0',
          300: '#dcc0b0',
          400: '#c89e88',
          500: '#b8806a',
          600: '#a66b56',
          700: '#8d5a49',
          800: '#744c3f',
          900: '#5d4037',
        },
        brown: {
          25: '#fdfcfb',
          50: '#faf7f5',
          75: '#f8f4f1',
          100: '#f5ede8',
          200: '#ead9d0',
          300: '#dcc0b0',
          400: '#c89e88',
          500: '#b8806a',
          600: '#a66b56',
          700: '#8d5a49',
          800: '#744c3f',
          900: '#5d4037',
        },
        success: {
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
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Dashboard specific colors (darker brown theme matching FG-Label)
        dashboard: {
          clean: '#dcc0b0',    // Light brown for clean mode
          complete: '#c89e88',  // Medium brown for completed batches
          working: '#b8806a',   // Darker brown for working batches
          highlight: '#8d5a49', // Dark brown for selected buttons
          header: '#5d4037',    // Very dark brown header (matching FG-Label)
          text: '#3e2723',      // Very dark brown text
          background: '#f5f5f5', // Light gray background (matching FG-Label)
          card: '#ffffff',      // White card background (matching FG-Label)
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'dashboard': '0 2px 8px rgba(93, 64, 55, 0.1)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'flash': 'flash 1.2s infinite',
      },
      keyframes: {
        flash: {
          '0%, 100%': { backgroundColor: 'rgb(141, 90, 73)' },
          '50%': { backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
} 