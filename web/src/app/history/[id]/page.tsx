import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Report } from "@/components/Report";
import type { Diagnosis } from "@/lib/diagnose/engine";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("result")
    .eq("id", id)
    .single();

  if (error || !data || !data.result || typeof data.result !== "object") notFound();
  const d = data.result as Diagnosis;

  return (
    <div>
      <Link href="/history" className="text-sm text-muted">← 히스토리</Link>
      <div className="mt-3">
        <Report d={d} />
      </div>
    </div>
  );
}
