"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { ShareButton } from "@/components/ShareButton";

// 재방문 시 '예측 맞았나요 + 그때 어떻게 됐어요'를 기록(diagnosis_outcomes). '잘됨'이면 공유 유도.
// 추천(NPS) 정점은 '예측이 맞았다/잘 됐다'는 검증 순간에서만 나오므로, 그 순간을 포착·공유로 연결.
type Existing = { prediction?: string; checkin?: string };

const PRED = [
  ["correct", "맞았어요"],
  ["partial", "반반"],
  ["wrong", "틀렸어요"],
] as const;
const CHECK = [
  ["good", "잘됐어요"],
  ["soso", "그저그럼"],
  ["bad", "아쉬웠어요"],
] as const;
const labelOf = (opts: readonly (readonly [string, string])[], v: string) =>
  opts.find((o) => o[0] === v)?.[1] ?? v;

export function OutcomeWidget({
  diagnosisId,
  d,
  existing,
}: {
  diagnosisId: string;
  d: Diagnosis;
  existing: Existing;
}) {
  const [predAns, setPredAns] = useState(existing.prediction ?? "");
  const [checkAns, setCheckAns] = useState(existing.checkin ?? "");
  const [busy, setBusy] = useState(false);

  async function record(kind: "prediction" | "checkin", value: string, set: (v: string) => void) {
    set(value); // 낙관적 갱신(베스트에포트)
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("diagnosis_outcomes").insert({ diagnosis_id: diagnosisId, kind, value });
    } catch {
      // 테이블 미생성/권한 등 — 조용히 스킵(UI는 기록된 것으로 표시)
    }
    setBusy(false);
  }

  const pill =
    "rounded-full border border-primary/30 bg-white/60 px-4 py-2 text-sm font-bold text-primaryDark backdrop-blur transition active:scale-95 hover:bg-primarySoft disabled:opacity-50";

  return (
    <section className="mt-7 flex flex-col gap-3.5">
      <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">그 뒤 이야기</p>

      {d.prediction && (
        <div className="card border border-accent/30">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primaryDark">큐핏의 예측, 맞았나요?</p>
          <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">“{d.prediction}”</p>
          {predAns ? (
            <p className="text-sm font-bold text-primaryDark">기록됨: {labelOf(PRED, predAns)} · 알려줘서 고마워요!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {PRED.map(([v, l]) => (
                <button key={v} disabled={busy} onClick={() => record("prediction", v, setPredAns)} className={pill}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-primaryDark">그때 상황은 어떻게 됐어요?</p>
        {checkAns ? (
          <div>
            <p className="text-sm font-bold text-primaryDark">기록됨: {labelOf(CHECK, checkAns)}</p>
            {checkAns === "good" && (
              <div className="mt-4">
                <p className="mb-2.5 text-sm text-ink">잘됐다니 큐핏도 기뻐요! 이 경험을 친구에게도 살짝 추천해줄래요?</p>
                <ShareButton d={d} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {CHECK.map(([v, l]) => (
              <button key={v} disabled={busy} onClick={() => record("checkin", v, setCheckAns)} className={pill}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
