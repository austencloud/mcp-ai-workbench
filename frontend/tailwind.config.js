/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}", "./src/app.html"],
  theme: {
    extend: {
      colors: {
        glass: {
          50: "rgba(255, 255, 255, 0.1)",
          100: "rgba(255, 255, 255, 0.2)",
          200: "rgba(255, 255, 255, 0.3)",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
