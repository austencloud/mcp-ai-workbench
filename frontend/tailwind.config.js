/** @type {import('tailwindcss').Config} */
module.exports = {
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
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          "backdrop-filter": "blur(20px) saturate(180%)",
          "-webkit-backdrop-filter": "blur(20px) saturate(180%)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid transparent",
          "border-radius": "24px",
          "box-shadow":
            "0 12px 32px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
          position: "relative",
          "z-index": "1",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: "translateZ(0)",
        },
        ".glass:hover": {
          background: "rgba(255, 255, 255, 0.12)",
          "border-color": "rgba(255, 255, 255, 0.08)",
          "box-shadow":
            "0 24px 64px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          transform: "translateY(-2px) translateZ(0)",
        },
        ".btn-futuristic": {
          "backdrop-filter": "blur(12px)",
          "-webkit-backdrop-filter": "blur(12px)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid transparent",
          "border-radius": "0.75rem",
          padding: "0.75rem 1.5rem",
          color: "white",
          "font-weight": "500",
          transition: "all 0.3s ease",
          cursor: "pointer",
          display: "inline-flex",
          "align-items": "center",
          "text-decoration": "none",
        },
        ".btn-primary-futuristic": {
          background:
            "linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))",
          "border-color": "rgba(59, 130, 246, 0.5)",
        },
        ".btn-secondary-futuristic": {
          background: "rgba(255, 255, 255, 0.05)",
          "border-color": "rgba(255, 255, 255, 0.2)",
          color: "rgba(255, 255, 255, 0.8)",
        },
        ".hover-lift:hover": {
          transform: "translateY(-2px) translateZ(0)",
        },
        ".neon-glow:hover": {
          "box-shadow": "0 0 20px rgba(255, 255, 255, 0.1)",
        },
      });
    },
  ],
};
