import type { Config } from "tailwindcss";

// Placeholder navy/gold palette until the University brand (logo, colours, fonts) is confirmed.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A1628", 2: "#112240" },
        gold: { DEFAULT: "#B8973A", light: "#D4AF5A" },
      },
    },
  },
  plugins: [],
};
export default config;
