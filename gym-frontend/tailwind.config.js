/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kinetic Pulse - Deep Carbon Palette
        surface: "#0e0e0e",
        "surface-container-low": "#131313",
        "surface-container": "#1c1c1c",
        "surface-container-high": "#262626",
        "surface-bright": "#3a3a3a",
        
        // Primary - Electric Lime
        primary: "#cafd00",
        "primary-light": "#f3ffca",
        "primary-container": "#d4ff42",
        "primary-dim": "#ffea00",
        "on-primary": "#000000",
        "on-primary-container": "#000000",
        
        // Secondary - Neon Orange
        secondary: "#ff7439",
        "secondary-container": "#ffb695",
        "on-secondary": "#000000",
        "on-secondary-container": "#000000",
        
        // Tertiary - Cyber Cyan
        tertiary: "#8ff5ff",
        "tertiary-container": "#a8fbff",
        "on-tertiary": "#000000",
        
        // Neutral
        "on-surface": "#ffffff",
        "on-surface-variant": "#adaaaa",
        "outline-variant": "#4a4747",
      },
      fontFamily: {
        "inter-tight": ["Inter Tight", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      letterSpacing: {
        tighter: "-0.04em",
        widest: "0.3em",
      },
      borderRadius: {
        kinetic: "10px",
      },
      backdropBlur: {
        heavy: "20px",
      },
      boxShadow: {
        kinetic: "0px 20px 40px rgba(0, 0, 0, 0.4)",
        ambient: "0 10px 30px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
