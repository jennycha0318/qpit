"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { DeleteDiagnosisButton } from "@/components/DeleteDiagnosisButton";
import { scoreColor } from "@/lib/diagnose/colors";

export interface Row {
  id: string;
  stage: Stage;
  score: number;
  result: Diagnosis | any;
  created_at: string;
}

type Filter = "all" | Stage;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "crush", label: STAGE_LABEL.crush },
  { value: "unrequited", label: STAGE_LABEL.unrequited },
  { value: "dating", label: STAGE_LABEL.dating },
  { value: "breakup", label: STAGE_LABEL.breakup },
];

const GROUP_ORDER = ["오늘", "이번 주", "이번 달", "그 이전"] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

function fmt(ts: string) {
  // 서버 타임존(Vercel=UTC)과 무관하게 한국 시간으로 표시
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// KST 기준 자정으로 정규화한 Date 반환
function kstMidnight(d: Date) {
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kst.setHours(0, 0, 0, 0);
  return kst;
}

function groupOf(ts: string, now: Date): GroupKey {
  const created = kstMidnight(new Date(ts));
  const today = kstMidnight(now);
  const diffDays = Math.round((today.getTime() - created.getTime()) / 86400000);

  if (diffDays <= 0) return "오늘";

  // 이번 주: 일요일 시작 기준 같은 주
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  if (created.getTime() >= weekStart.getTime()) return "이번 주";

  // 이번 달
  if (
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth()
  ) {
    return "이번 달";
  }

  return "그 이전";
}

export function HistoryList({
  rows,
  chatByDiag,
}: {
  rows: Row[];
  chatByDiag?: Record<string, { count: number; lastQ: string }>;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.stage === filter)),
    [rows, filter]
  );

  const groups = useMemo(() => {
    const now = new Date();
    const map = new Map<GroupKey, Row[]>();
    for (const r of filtered) {
      const key = groupOf(r.created_at, now);
      const arr = map.get(key);
      if (arr) arr.push(r);
      else map.set(key, [r]);
    }
    return GROUP_ORDER.filter((k) => map.has(k)).map((k) => ({
      key: k,
      items: map.get(k)!,
    }));
  }, [filtered]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition active:scale-[0.97] ${
                active
                  ? "border-primary/40 bg-primarySoft text-primaryDark"
                  : "border-white/60 bg-white/55 text-muted backdrop-blur hover:border-primary"
              }`}
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          해당 조건의 기록이 없어요.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 text-[12.5px] font-bold text-muted">{g.key}</h3>
              <ul className="flex flex-col gap-2.5">
                {g.items.map((r) => {
                  const color = scoreColor(r.score);
                  const chat = chatByDiag?.[r.id];
                  return (
                    <li key={r.id} className="flex flex-col gap-1.5">
                      <div className="relative">
                        <Link
                          href={`/history/${r.id}`}
                          className="flex items-center gap-3.5 rounded-[18px] border border-white/60 bg-white/55 py-3.5 pl-4 pr-12 backdrop-blur transition active:scale-[0.98] hover:border-primary"
                        >
                          <span
                            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-lg font-bold"
                            style={{ color, background: `${color}1a` }}
                          >
                            {r.score}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <b className="text-[14.5px]">
                              {STAGE_LABEL[r.stage] ?? "진단"} · {r.result?.scoreTitle ?? "결과"}
                            </b>
                            <span className="text-[12.5px] text-primaryDark">
                              {r.result?.plan?.when ?? ""}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink/70">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
                              </svg>
                              {fmt(r.created_at)}
                            </span>
                          </span>
                        </Link>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <DeleteDiagnosisButton id={r.id} />
                        </span>
                      </div>
                      {chat && (
                        <Link
                          href={`/history/${r.id}/chat`}
                          className="flex items-center gap-2.5 rounded-[18px] border border-accent/30 bg-accent/10 py-3.5 pl-4 pr-3 backdrop-blur transition active:scale-[0.98] hover:border-accent"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[12.5px] text-ink/75">Q. {chat.lastQ}</span>
                            <span className="text-[11.5px] font-bold text-accent">상담 {chat.count}개 · 전체 보기</span>
                          </span>
                          <span className="shrink-0 text-muted" aria-hidden="true">›</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
