import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        surface: "#15181d",
        surface2: "#1c2028",
        border: "#2a2f39",
        text: "#e6e9ef",
        muted: "#8a93a6",
        accent: "#3ddc84",
        accentDim: "#2bb16c",
        warn: "#ffb454",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
