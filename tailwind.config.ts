import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080706",
        glow: "#D9A35F",
        ember: "#8A3A15",
        parchment: "#F6E7D1",
        muted: "#9B8A78",
        success: "#E6C58A",
        error: "#6A2727",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "var(--font-playfair)", "serif"],
        body: ["var(--font-inter)", "var(--font-grotesk)", "system-ui", "sans-serif"],
        grotesk: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      letterSpacing: {
        ritual: "0.42em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "45%": { opacity: "0.86" },
          "55%": { opacity: "0.95" },
          "70%": { opacity: "0.82" },
        },
        drift: {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-18px) rotate(0.4deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.06)", opacity: "0.8" },
        },
      },
      animation: {
        "fade-up": "fade-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        flicker: "flicker 6s ease-in-out infinite",
        drift: "drift 9s ease-in-out infinite",
        breathe: "breathe 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
