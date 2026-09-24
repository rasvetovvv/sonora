import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        base: "#0c0b10",
        base2: "#131118",
        panel: "rgba(255,255,255,0.04)",
        accent: "#ff6b81",
        accent2: "#ffb347",
      },
      keyframes: {
        bar: {
          "0%,100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        bar: "bar 0.9s ease-in-out infinite",
        "spin-slow": "spin-slow 22s linear infinite",
        "fade-up": "fade-up 0.5s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;
