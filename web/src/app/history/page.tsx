import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import type { Diagnosis } from "@/lib/diagnose/engine";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  stage: Stage;
  score: number;
  result: Diagnosis;
  created_at: string;
}

function fmt(ts: string) {
  // 서버 타임존(Vercel=UTC)과 무관하게 한국 시간으로 표시
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
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
        <h2 className="mb-1.5 text-[23px] font-bold tracking-tight">진단 히스토리</h2>
        <div className="card text-center text-sm text-muted">
          기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </div>
      </div>
    );
  }
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <h2 className="mb-1.5 text-[23px] font-bold tracking-tight">진단 히스토리</h2>
      <p className="mb-5 text-sm text-muted">지난 진단 결과를 다시 볼 수 있어요.</p>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm leading-7 text-muted">
          아직 진단 기록이 없어요.
          <br />
          <Link href="/diagnose" className="font-bold text-primaryDark">새 진단 시작하기</Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const color = r.score >= 65 ? "#2e7d5b" : r.score >= 45 ? "#c08a2e" : "#c2564c";
            return (
              <li key={r.id}>
                <Link href={`/history/${r.id}`} className="flex items-center gap-3.5 rounded-[14px] border border-line bg-surface px-4 py-3.5 hover:border-primary">
                  <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-lg font-bold"
                    style={{ color, background: `${color}1a` }}>{r.score}</span>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-[14.5px]">{STAGE_LABEL[r.stage] ?? "진단"} · {r.result?.scoreTitle ?? "결과"}</b>
                    <span className="text-[12.5px] text-primaryDark">{r.result?.plan?.when ?? ""}</span>
                    <span className="text-[11.5px] text-muted">{fmt(r.created_at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
