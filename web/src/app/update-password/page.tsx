"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null); // 복구 세션 유효 여부
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 비밀번호 재설정 링크를 통해 들어온 경우에만 세션이 있음
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setReady(!!user))
      .catch(() => setReady(false));
  }, []);

  async function update() {
    setErr(""); setOk("");
    if (!ready) return setErr("세션이 유효하지 않아요. 재설정 링크로 다시 들어와 주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    if (pw !== pw2) return setErr("두 비밀번호가 일치하지 않아요.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setErr(error.message);
    setOk("비밀번호가 변경됐어요. 잠시 후 이동합니다.");
    setTimeout(() => router.push("/diagnose"), 1200);
  }

  if (ready === false) {
    return (
      <div className="pt-4">
        <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">링크가 만료됐어요</h2>
        <p className="mb-6 text-sm text-muted">비밀번호 재설정 링크가 유효하지 않거나 만료됐습니다. 다시 시도해 주세요.</p>
        <Link href="/reset-password" className="btn btn-primary block text-center">재설정 링크 다시 받기</Link>
        <Link href="/login" className="btn btn-ghost mt-3 block text-center">로그인으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">새 비밀번호 설정</h2>
      <p className="mb-6 text-sm text-muted">사용할 새 비밀번호를 입력해 주세요.</p>
      <label className="mb-1.5 block text-[13px] font-bold">새 비밀번호</label>
      <input className="field-input mb-3.5" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" />
      <label className="mb-1.5 block text-[13px] font-bold">새 비밀번호 확인</label>
      <input className="field-input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="다시 입력"
        onKeyDown={(e) => e.key === "Enter" && update()} />
      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>
      {ok && <p className="mb-2 text-[13px] text-good">{ok}</p>}
      <button className="btn btn-primary" onClick={update} disabled={loading || ready === null}>
        {loading ? "변경 중…" : "비밀번호 변경"}
      </button>
    </div>
  );
}
