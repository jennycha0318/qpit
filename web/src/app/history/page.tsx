import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HistoryList, type Row } from "@/components/HistoryList";
import { STAGE_LABEL } from "@/lib/diagnose/survey";

export const dynamic = "force-dynamic";

function fmtKST(ts: string) {
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

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

  // 상담(챗봇) 기록 — 진단별로 묶어 카드로 표시. 테이블/권한 없으면 null → 조용히 미표시.
  const { data: chatData } = await supabase
    .from("diagnosis_chats")
    .select("id, q, a, created_at, diagnosis_id")
    .order("created_at", { ascending: false });
  const chats = (chatData ?? []) as { id: string; diagnosis_id: string | null; q: string; created_at: string }[];

  const rowById = new Map(rows.map((r) => [r.id, r]));
  // 진단별 그룹(최신 활동순). chats가 최신순이라 첫 등장이 가장 최근.
  const chatGroups: { diagnosisId: string; count: number; latestAt: string; lastQ: string }[] = [];
  const seenIdx = new Map<string, number>();
  for (const c of chats) {
    if (!c.diagnosis_id) continue;
    const idx = seenIdx.get(c.diagnosis_id);
    if (idx === undefined) {
      seenIdx.set(c.diagnosis_id, chatGroups.length);
      chatGroups.push({ diagnosisId: c.diagnosis_id, count: 1, latestAt: c.created_at, lastQ: c.q });
    } else {
      chatGroups[idx].count++;
    }
  }

  return (
    <div>
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
            <p className="mt-1 text-[13px] text-muted">첫 한 걸음이 가장 용감해요. 진단하면 결과가 여기에 안전하게 보관돼요.</p>
          </div>
          <Link href="/diagnose" className="btn btn-primary mt-1 max-w-[220px]">첫 진단 시작하기</Link>
        </div>
      ) : (
        <HistoryList rows={rows} />
      )}

      {chatGroups.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1.5 text-[18px] font-bold tracking-tight">상담 기록</h3>
          <p className="mb-4 text-sm text-muted">큐핏과 나눈 대화예요. 카드를 누르면 전체 내용을 볼 수 있어요.</p>
          <ul className="flex flex-col gap-2.5">
            {chatGroups.map((g) => {
              const row = rowById.get(g.diagnosisId);
              const title = row ? `${STAGE_LABEL[row.stage] ?? "진단"} · ${row.result?.scoreTitle ?? "결과"}` : "상담";
              return (
                <li key={g.diagnosisId}>
                  <Link
                    href={`/history/${g.diagnosisId}/chat`}
                    className="flex items-center gap-3.5 rounded-[18px] border border-accent/30 bg-accent/5 py-3.5 pl-4 pr-3 backdrop-blur transition active:scale-[0.98] hover:border-accent"
                  >
                    <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-[14.5px]">{title} <span className="font-normal text-muted">상담</span></b>
                      <span className="truncate text-[12.5px] text-ink/70">Q. {g.lastQ}</span>
                      <span className="mt-0.5 text-[12px] font-bold text-accent">{g.count}개 대화 · {fmtKST(g.latestAt)}</span>
                    </span>
                    <span className="shrink-0 text-xl text-muted" aria-hidden="true">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
