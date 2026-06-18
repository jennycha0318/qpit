// 사용자 프로필 읽기/저장 — profiles 테이블 우선, user_metadata 폴백(가입 직후/콜백 타이밍 안전).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  birthYear: number | null;
  mbti: string | null;
  attachment: string | null;
  name: string | null;
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let row: { birth_year: number | null; mbti: string | null; attachment: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("birth_year, mbti, attachment")
      .eq("id", user.id)
      .maybeSingle();
    row = data ?? null;
  } catch {
    row = null; // 테이블 미생성 등 — 메타데이터로 폴백
  }
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v ? parseInt(v, 10) : null);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    birthYear: row?.birth_year ?? num(md.birth_year),
    mbti: row?.mbti ?? str(md.mbti),
    attachment: row?.attachment ?? str(md.attachment),
    name: str(md.name),
  };
}

export async function saveProfile(
  supabase: SupabaseClient,
  patch: { birthYear?: number | null; mbti?: string | null; attachment?: string | null },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");

  const meta: Record<string, unknown> = {};
  if (patch.birthYear !== undefined) meta.birth_year = patch.birthYear;
  if (patch.mbti !== undefined) meta.mbti = patch.mbti || null;
  if (patch.attachment !== undefined) meta.attachment = patch.attachment || null;

  // 1) 메타데이터 동기화 (즉시 가용·폴백) — profiles 테이블이 없어도 동작
  let metaOk = false;
  try {
    const { error } = await supabase.auth.updateUser({ data: meta });
    metaOk = !error;
  } catch {
    metaOk = false;
  }

  // 2) profiles 테이블 저장 (SoT) — 미생성/실패해도 메타데이터로 동작
  const row: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString(), ...meta };
  let tableOk = false;
  try {
    const { error } = await supabase.from("profiles").upsert(row);
    tableOk = !error;
  } catch {
    tableOk = false;
  }

  if (!metaOk && !tableOk) throw new Error("프로필 저장에 실패했어요.");
}
