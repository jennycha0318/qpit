import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 파스텔 드리미 팔레트 (레퍼런스: Floral/Lavender/Periwinkle/Wisteria/Aqua)
        floral: "#f7f4ea",
        lavender: "#ded9e2",
        periwinkle: "#c0b9dd",
        wisteria: "#80a1d4",
        aqua: "#75c9c8",
        // 역할
        bg: "#eef0fb",
        surface: "#ffffff",
        ink: "#2c2f55",
        muted: "#7b7fa6",
        line: "#e4e2f1",
        primary: "#80a1d4", // Wisteria Blue
        primaryDark: "#5f82bd",
        primarySoft: "#eaeef8",
        accent: "#75c9c8", // Pearl Aqua
        good: "#4fa3a2",
        warn: "#c79a4e",
        bad: "#b96b8f",
      },
      fontFamily: {
        sans: ['"NanumSquare"', '"Pretendard Variable"', "Pretendard", "system-ui", "sans-serif"],
        display: ['"YPairingFont"', '"NanumSquare"', "Pretendard Variable", "system-ui", "sans-serif"],
      },
      maxWidth: { app: "480px" },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
} satisfies Config;
