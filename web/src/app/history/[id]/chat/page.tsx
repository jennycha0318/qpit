import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import { scoreColor } from "@/lib/diagnose/colors";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default async function ChatHistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 연결된 진단(결과로의 연결 표시용) — RLS로 본인 것만 조회됨
  const { data: diag } = await supabase
    .from("diagnoses")
    .select("stage, score, result, created_at")
    .eq("id", id)
    .single();
  if (!diag) notFound();

  const { data: chatData } = await supabase
    .from("diagnosis_chats")
    .select("q, a, created_at")
    .eq("diagnosis_id", id)
    .order("created_at", { ascending: true });
  const chats = (chatData ?? []) as { q: string; a: string; created_at: string }[];

  const result = diag.result as { scoreTitle?: string; plan?: { when?: string } } | null;
  const color = scoreColor(diag.score as number);

  return (
    <div>
      <Link href="/history" className="inline-flex items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm font-bold text-primaryDark backdrop-blur">← 히스토리</Link>

      <h2 className="mb-3 mt-3 flex items-center gap-2 text-[22px] font-bold tracking-tight">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        상담 기록
      </h2>

      {/* 연결된 진단 결과 — 누르면 결과로 이동 */}
      <Link href={`/history/${id}`} className="card mb-5 flex items-center gap-3 transition hover:border-primary">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold" style={{ color, background: `${color}1a` }}>
          {diag.score as number}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">관련 진단 결과</span>
          <b className="text-[14px]">{STAGE_LABEL[diag.stage as Stage] ?? "진단"} · {result?.scoreTitle ?? "결과"}</b>
          <span className="text-[12.5px] text-primaryDark">{result?.plan?.when ?? ""}</span>
        </span>
        <span className="shrink-0 text-xl text-muted" aria-hidden="true">›</span>
      </Link>

      {chats.length === 0 ? (
        <div className="card text-center text-sm text-muted">아직 이 진단에 대한 상담 내용이 없어요.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {chats.map((c, i) => (
            <div key={i} className="card">
              <p className="mb-2 flex gap-1.5 text-[13.5px]">
                <span className="font-bold text-primaryDark">Q.</span>
                <span>{c.q}</span>
              </p>
              <p className="flex gap-1.5 text-[14px]">
                <span className="font-bold text-accent">A.</span>
                <span className="whitespace-pre-wrap leading-relaxed">{c.a}</span>
              </p>
              <p className="mt-2 text-right text-[11.5px] text-muted">{fmt(c.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
