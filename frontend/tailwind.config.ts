import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        modalBackdropIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        modalPanelIn: {
          "0%": { opacity: "0", transform: "scale(0.98) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "modal-backdrop-in": "modalBackdropIn 0.22s ease-out forwards",
        "modal-panel-in":
          "modalPanelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-slide-in": "fadeSlideIn 0.45s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
