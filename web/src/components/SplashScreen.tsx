"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

// 웹앱 첫 진입(전체 페이지 로드)마다 보이는 스플래시.
// 최소 1.4초 표시 후 페이드아웃 → 제거. SSR로 초기 HTML에 포함되어 흰 화면 없이 즉시 노출.
// (레이아웃은 클라이언트 라우트 전환 시 리마운트되지 않으므로, 앱 내 이동에선 다시 뜨지 않음)
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 1400);
    const t2 = setTimeout(() => setPhase("gone"), 1950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`pm-mesh fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 transition-opacity duration-500 ${
        phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="pm-bounce">
        <Logo size={96} decorative />
      </div>
      <span className="font-display text-[28px] font-bold tracking-tight text-ink">큐핏</span>
      <span className="text-[13px] font-bold text-primaryDark">AI 연애 타이밍 컨설팅</span>
    </div>
  );
}
