"use client";

import { useRouter } from "next/navigation";
import type { Diagnosis } from "@/lib/diagnose/engine";

// 결과 → 채팅 연결. 현재 진단 요약을 sessionStorage로 넘겨(handoff) 챗봇이 컨텍스트로 사용.
// (로그인 여부와 무관하게 '방금 본 그 결과'로 상담되도록)
export function AskCupidButton({ d }: { d: Diagnosis }) {
  const router = useRouter();
  function go() {
    try {
      const ctx = `점수:${d.score}점(${d.scoreTitle}) / 추천 타이밍:${d.plan?.when ?? ""} / 추천 수단:${d.plan?.channel ?? ""} / 해석:${(d.reason ?? "").slice(0, 600)}`;
      sessionStorage.setItem("qpit:chatContext", ctx);
    } catch {
      // 무시 — 컨텍스트 없이도 채팅 가능
    }
    router.push("/chat");
  }
  return (
    <button onClick={go} className="btn btn-primary flex items-center justify-center gap-2">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      이 결과로 큐핏에게 물어보기
    </button>
  );
}
