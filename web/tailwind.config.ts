import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 안정감을 주는 초록 메인 + 차분한 중성 배경
        bg: "#f5f7f5",
        surface: "#ffffff",
        ink: "#1e2a25",
        muted: "#6b776f",
        line: "#e3eae5",
        primary: "#2e7d5b",
        primaryDark: "#1f5c43",
        primarySoft: "#e8f2ec",
        accent: "#3f8e76",
        good: "#2e7d5b",
        warn: "#c08a2e",
        bad: "#c2564c",
      },
      fontFamily: {
        sans: ['"GamtanRoad Dotum"', "Pretendard Variable", "Pretendard", "system-ui", "sans-serif"],
      },
      maxWidth: { app: "480px" },
    },
  },
  plugins: [],
} satisfies Config;
