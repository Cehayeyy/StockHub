/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./resources/views/**/*.blade.php",
      "./resources/js/**/*.js",
      "./resources/js/**/*.tsx",
    ],
    theme: {
      extend: {
        // --- TAMBAHKAN BLOK INI ---
        colors: {
          'theme-sidebar': '#5D4037',     // Coklat tua untuk sidebar
          'theme-background': '#F5EFE6', // Krem muda untuk background
        }
        // --- BATAS TAMBAHAN ---
      },
    },
    plugins: [],
  };
