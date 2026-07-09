/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Layered dark backgrounds — softer blue-grey, not pure black
        "game-dark": "#0e131c",
        "game-darker": "#090d14",
        "game-card": "#171e2b",
        "game-elevated": "#1f2738",
        // Refined borders with hover counterpart
        "game-border": "#283044",
        "game-border-hover": "#3a4560",
        // Softened brand palette — less radioactive, more premium
        "neon-blue": "#3b9eff",
        "neon-purple": "#a78bfa",
        "neon-green": "#34d399",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)",
        "card-hover":
          "0 12px 28px -8px rgba(0, 0, 0, 0.5), 0 4px 10px -4px rgba(59, 158, 255, 0.12)",
        glow: "0 0 0 1px rgba(59, 158, 255, 0.3), 0 8px 24px -6px rgba(59, 158, 255, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.25s ease-out",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "shimmer": "shimmer 1.8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
