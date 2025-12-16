const defaultTheme = require('tailwindcss/defaultTheme');
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./resources/views/**/*.blade.php",
      "./resources/js/**/*.js",
      "./resources/js/**/*.tsx",
    ],
    theme: {
        extend: {
            animation: {
              fadeIn: 'fadeIn 0.6s ease-out',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: 0, transform: 'translateY(12px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            },
          

        fontFamily: {
            sans: ['Poppins',defaultTheme.fontFamily.sans],
          },
        colors: {
          'theme-sidebar': '#5D4037',     // Coklat tua untuk sidebar
          'theme-background': '#F5EFE6', // Krem muda untuk background
        }
        // --- BATAS TAMBAHAN ---
      },
    },
    plugins: [],
  };
