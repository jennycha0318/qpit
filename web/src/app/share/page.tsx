"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/Logo";
import { scoreColor, scoreBadge } from "@/lib/diagnose/colors";

type SharePayload = { t: string; s: number; w: string };

function CTAs() {
  return (
    <>
      <Link href="/diagnose" className="btn btn-primary mt-6 flex items-center justify-center">
        나도 무료로 진단받기
      </Link>
      <Link href="/" className="btn btn-ghost mt-3 flex items-center justify-center">
        큐핏 알아보기
      </Link>
    </>
  );
}

export default function SharePage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<SharePayload | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("d");
      if (!raw) return;
      const parsed = JSON.parse(decodeURIComponent(raw)) as SharePayload;
      if (parsed && typeof parsed.s === "number" && typeof parsed.t === "string") {
        setData(parsed);
      }
    } catch {
      // 파싱 실패 — data는 null로 유지하고 안내 문구 표시
    }
  }, []);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-app flex-col items-center justify-center px-5">
        <p className="text-muted">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col px-5 py-10">
      <div className="flex justify-center">
        <BrandLockup />
      </div>

      <div className="card mt-8">
        {data ? (
          <>
            <p className="text-[13px] font-bold text-muted">공유받은 진단 결과</p>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="rounded-full px-3 py-1 text-[13px] font-bold"
                style={{ color: scoreColor(data.s), backgroundColor: `${scoreColor(data.s)}1a` }}
              >
                {scoreBadge(data.s)}
              </span>
            </div>
            <h1 className="mt-4 font-display text-[22px] font-bold text-ink">{data.t}</h1>
            <p className="mt-2 text-[15px] text-muted">
              <span className="font-display text-[40px] font-bold text-ink">{data.s}</span>
              <span className="text-muted">/100</span>
            </p>
            <p className="mt-3 text-[15px] text-ink">언제: {data.w}</p>
            <CTAs />
          </>
        ) : (
          <>
            <p className="text-[15px] font-bold text-ink">결과를 불러올 수 없어요</p>
            <p className="mt-2 text-[14px] text-muted">
              공유 링크가 만료되었거나 올바르지 않아요. 직접 무료로 진단받아 보세요.
            </p>
            <CTAs />
          </>
        )}
      </div>
    </main>
  );
}
