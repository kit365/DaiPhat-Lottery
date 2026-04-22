import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        client: {
          primary: "#FF6262",
          "primary-strong": "#E33F3F",
          "primary-soft": "#FFF0F0",
          gold: "#FFB800",
          "gold-soft": "#FFF5CC",
          navy: "#102937",
          "navy-soft": "#EAF0F3",
          ink: "#17191F",
          text: "#505050",
          muted: "#78818A",
          surface: "#FFFFFF",
        },
        admin: {
          hoverIcon: "rgba(99, 115, 129, 0.08)"
        }
      },
      fontFamily: {
        "client-main": ["Public Sans", "Barlow", "sans-serif"],
        "client-display": ["Barlow", "sans-serif"],
        secondary: ["Barlow", "serif"],
        third: ["Pacifico", "cursive"]
      },
      borderRadius: {
        "client-sm": "8px",
        "client-md": "8px",
        "client-lg": "8px",
        "client-xl": "24px",
      },
      screens: {
        "2xl": { max: "1540px" },
        xl: { max: "1280px" },
        lg: { max: "1024px" },
        md: { max: "767px" },
        sm: { max: "479px" },
      },
      keyframes: {
        jumpeffect: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        jumpeffect: "jumpeffect 0.7s ease-in-out both",
      },
    },
  },
  plugins: [
    plugin(function ({ addComponents, addUtilities }) {
      addComponents({
        ".app-container": {
          "@apply w-full mx-auto max-w-[1520px] 2xl:max-w-[1300px] xl:max-w-[1100px] lg:max-w-[850px] md:max-w-[580px] sm:max-w-[400px]": {},
        },
      });

      addUtilities({
        ".font-secondary": {
          fontFamily: "'Merriweather', sans-serif",
          fontWeight: "800",
        },
        ".transition-default": {
          "@apply transition-colors duration-300 ease-linear": {},
        },
      });
    }),
  ],
};

export default config;