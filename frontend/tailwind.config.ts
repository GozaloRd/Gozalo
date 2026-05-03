import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dash: {
          bg: "#050A14",
          sidebar: "#0D0D14",
          card: "#111118",
          border: "rgba(255, 255, 255, 0.08)",
          gold: "#C6B3E4",
          muted: "#6B7280",
          success: "#10B981",
          danger: "#EF4444",
          info: "#3B82F6",
        },
        "gozalo-bg": "#0A0A0F",
        "gozalo-gold": "#C6B3E4",
        "gozalo-purple": "#9B7FCA",
        "gozalo-dark": "#02060c",
        ice: "#F8F9FA",
        ink: "#0A0A0F",
        gozalo: {
          bg: "#0A0A0F",
          cream: "#F9FAFB",
          gold: "#C6B3E4",
          violet: "#9B7FCA",
          blue: "#2979FF",
          red: "#FF1744",
          accent: "#9B7FCA",
          "accent-hover": "#7B5EA7",
        },
        night: {
          950: "#050508",
          900: "#050A14",
          800: "#12121c",
          700: "#1a1a28",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        logoMark: ["var(--font-logo-mark)", "Georgia", "serif"],
      },
      boxShadow: {
        neonBlue: "0 0 20px rgba(41, 121, 255, 0.45), 0 0 60px rgba(41, 121, 255, 0.15)",
        neonRed: "0 0 20px rgba(255, 23, 68, 0.45), 0 0 60px rgba(255, 23, 68, 0.12)",
        neonDual:
          "0 0 25px rgba(155, 127, 202, 0.35), 0 0 45px rgba(198, 179, 228, 0.2)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-mesh":
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(155,127,202,0.22), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgba(198,179,228,0.12), transparent), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(123,94,167,0.18), transparent)",
        "btn-premium":
          "linear-gradient(135deg, #C6B3E4 0%, #9B7FCA 50%, #7B5EA7 100%)",
      },
      keyframes: {
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
        /** También definido en app/globals.css para uso con duración inline por estrella */
        twinkle: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "modal-in": "modal-in 200ms ease-out both",
        shake: "shake 300ms ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
