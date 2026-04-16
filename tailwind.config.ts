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
        background: "var(--background)",
        foreground: "var(--foreground)",
        "card-bg": "var(--card-bg)",
        "nav-bg": "var(--nav-bg)",
        border: "var(--border)",
        primary: "#795548",
        secondary: "#2E7D32",
        accent: "#A67C52",
      },
    },
  },
  plugins: [],
};
export default config;
