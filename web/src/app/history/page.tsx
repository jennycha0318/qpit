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
    </div>
  );
}
