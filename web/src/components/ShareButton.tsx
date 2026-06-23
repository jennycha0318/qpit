"use client";

import { useState } from "react";
import type { Diagnosis } from "@/lib/diagnose/engine";

export function ShareButton({ d }: { d: Diagnosis }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      if (typeof window === "undefined") return;
      const payload = { t: d.scoreTitle, s: d.score, w: d.plan.when };
      const url = `${window.location.origin}/share?d=${encodeURIComponent(JSON.stringify(payload))}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "큐핏", text: "큐핏을 통해 공유한 내용 보러가기", url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // 사용자가 공유를 취소했거나 권한이 없는 경우 — 조용히 무시
    }
  }

  return (
    <button type="button" onClick={onShare} className="btn btn-ghost flex items-center justify-center gap-2">
      {copied ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          링크 복사됐어요
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          결과 공유
        </>
      )}
    </button>
  );
}
