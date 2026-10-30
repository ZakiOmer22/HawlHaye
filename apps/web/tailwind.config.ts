// import type { Config } from "tailwindcss";

// // Placeholder navy/gold palette until the University brand (logo, colours, fonts) is confirmed.
// const config: Config = {
//   content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
//   theme: {
//     extend: {
//       colors: {
//         navy: { DEFAULT: "#0A1628", 2: "#112240" },
//         gold: { DEFAULT: "#B8973A", light: "#D4AF5A" },
//       },
//     },
//   },
//   plugins: [],
// };
// export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — theme-aware and opacity-aware.
        // `<alpha-value>` is what makes `bg-app/90`, `border-border/50`,
        // `text-muted/60` etc. work. Don't remove it.
        app: {
          DEFAULT: "rgb(var(--color-app) / <alpha-value>)",
          soft: "rgb(var(--color-app-soft) / <alpha-value>)",
        },
        panel: {
          DEFAULT: "rgb(var(--color-panel) / <alpha-value>)",
          hover: "rgb(var(--color-panel-hover) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        primary: "rgb(var(--color-text-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        faint: "rgb(var(--color-text-faint) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
          text: "rgb(var(--color-accent-text) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
