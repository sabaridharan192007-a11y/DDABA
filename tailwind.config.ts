import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f6f2",
        surface: "#ffffff",
        navy: {
          DEFAULT: "#0a2540",
          dark: "#071a30",
        },
        saffron: "#ff6a00",
        green: "#128a3e",
        border: "#e6e3da",
        muted: {
          DEFAULT: "#f0efe9",
          foreground: "#6b7280",
        },
        primary: {
          DEFAULT: "#ff6a00",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#0a2540",
          foreground: "#ffffff",
        },
        danger: "#c0392b",
        success: "#128a3e",
        warning: "#f5b400",
      },
      fontFamily: {
        display: ["'Oswald'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(10,37,64,0.15)",
        glow: "0 10px 30px -10px rgba(255,106,0,0.35)",
        "glow-purple": "0 10px 30px -10px rgba(18,138,62,0.3)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
