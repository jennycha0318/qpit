import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HistoryList, type Row } from "@/components/HistoryList";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, stage, score, result, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">진단 히스토리</h2>
        <div className="card text-center text-sm text-muted">
          기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </div>
      </div>
    );
  }
  const rows = (data ?? []) as Row[];

  // 진단별 상담 요약(개수 + 최근 질문) — 진단 카드 아래에 함께 표시. 테이블/권한 없으면 빈 값.
  const { data: chatData } = await supabase
    .from("diagnosis_chats")
    .select("q, diagnosis_id")
    .order("created_at", { ascending: false });
  const chats = (chatData ?? []) as { q: string; diagnosis_id: string | null }[];
  const chatByDiag: Record<string, { count: number; lastQ: string }> = {};
  for (const c of chats) {
    if (!c.diagnosis_id) continue;
    const g = chatByDiag[c.diagnosis_id];
    if (g) g.count++;
    else chatByDiag[c.diagnosis_id] = { count: 1, lastQ: c.q };
  }

  return (
    <div className="min-h-[calc(100svh-9rem)]">
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">진단 히스토리</h2>
      <p className="mb-5 text-sm text-muted">지난 진단 결과를 다시 볼 수 있어요.</p>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primarySoft text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">아직 진단 기록이 없어요</p>
            <p className="mt-1 text-[13px] text-muted">진단하면 결과가 여기에 안전하게 보관돼요.</p>
          </div>
          <Link href="/diagnose" className="btn btn-primary mt-1 max-w-[220px]">첫 진단 시작하기</Link>
        </div>
      ) : (
        <HistoryList rows={rows} chatByDiag={chatByDiag} />
      )}
    </div>
  );
}
