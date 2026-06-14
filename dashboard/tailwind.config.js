/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        romantic: {
          rose: "#E3919F",
          peach: "#F2C0BD",
          lime: "#E9F6CE",
          mint: "#BBDDCE",
        },
        brand: {
          50: "#fdf5f6",
          100: "#F2C0BD",
          200: "#ebb0bc",
          500: "#E3919F",
          600: "#d67d8c",
          700: "#c46878",
        },
        ink: {
          DEFAULT: "#4a3540",
          muted: "#8b6b73",
          faint: "#b89aa3",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(227, 145, 159, 0.18)",
        card: "0 2px 16px -2px rgba(74, 53, 64, 0.08)",
      },
    },
  },
  plugins: [],
};
