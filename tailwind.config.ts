import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111827",
        foreground: "#e5e7eb",
        brand: {
          primary: "#7c3aed",
          accent: "#6f00ff",
          light: "#f3e8ff",
        },
      },
    },
  },
  plugins: [],
};
export default config;
