import type { Metadata } from "next";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "큐핏 — AI 연애 타이밍 컨설팅",
  description: "연애의 결정적 순간, 언제·어떻게 행동해야 할지 분석해 드립니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@master/nanumsquare.css"
        />
      </head>
      <body>
        <div className="mx-auto flex min-h-[100svh] max-w-app flex-col px-5 pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom)))] pt-6">
          <div className="my-auto w-full">{children}</div>
        </div>
        <TabBar />
        <SplashScreen />
      </body>
    </html>
  );
}
