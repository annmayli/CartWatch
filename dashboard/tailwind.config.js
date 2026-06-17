/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        romantic: {
          rose: "rgb(var(--color-romantic-rose) / <alpha-value>)",
          peach: "rgb(var(--color-romantic-peach) / <alpha-value>)",
          lime: "rgb(var(--color-romantic-lime) / <alpha-value>)",
          mint: "rgb(var(--color-romantic-mint) / <alpha-value>)",
        },
        brand: {
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          100: "rgb(var(--color-brand-100) / <alpha-value>)",
          200: "rgb(var(--color-brand-200) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)",
          700: "rgb(var(--color-brand-700) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
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
        soft: "0 4px 24px -4px rgb(var(--color-brand-500) / 0.18)",
        card: "0 2px 16px -2px rgb(var(--color-ink) / 0.08)",
      },
    },
  },
  plugins: [],
};
