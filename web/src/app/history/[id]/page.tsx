import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Report } from "@/components/Report";
import { DeleteDiagnosisButton } from "@/components/DeleteDiagnosisButton";
import { OutcomeWidget } from "@/components/OutcomeWidget";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("stage, result, created_at")
    .eq("id", id)
    .single();

  if (error || !data || !data.result || typeof data.result !== "object") notFound();
  const d = data.result as Diagnosis;
  // 필수 필드 누락(깨진 데이터)이면 Report 크래시 대신 404
  if (typeof d.score !== "number" || !d.plan || !Array.isArray(d.factors)) notFound();

  // 그 뒤 이야기(예측 검증·사후 체크인) — 테이블/권한 없으면 빈 값으로 안전 처리
  const { data: outRows } = await supabase
    .from("diagnosis_outcomes")
    .select("kind, value")
    .eq("diagnosis_id", id)
    .order("created_at", { ascending: false });
  const outcomes = (outRows ?? []) as { kind: string; value: string }[];
  const existing = {
    prediction: outcomes.find((o) => o.kind === "prediction")?.value,
    checkin: outcomes.find((o) => o.kind === "checkin")?.value,
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link href="/history" className="inline-flex items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm font-bold text-primaryDark backdrop-blur">← 히스토리</Link>
        <DeleteDiagnosisButton id={id} redirectTo="/history" />
      </div>
      <p className="mb-3 mt-3 text-[13px] text-muted">
        {STAGE_LABEL[data.stage as Stage] ?? "진단"} · {fmt(data.created_at as string)}
      </p>
      <Report d={d} diagnosisId={id} />
      {!d.needsSupport && <OutcomeWidget diagnosisId={id} d={d} existing={existing} />}
    </div>
  );
}
