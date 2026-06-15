"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function send() {
    setErr(""); setOk("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("올바른 이메일을 입력해 주세요.");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/update-password`,
    });
    if (error) setErr(error.message);
    else setOk("재설정 링크를 이메일로 보냈어요. 메일을 확인해 주세요.");
  }

  return (
    <div className="pt-4">
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">비밀번호 찾기</h2>
      <p className="mb-6 text-sm text-muted">가입한 이메일로 재설정 링크를 보내드려요.</p>
      <label className="mb-1.5 block text-[13px] font-bold">이메일</label>
      <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>
      {ok && <p className="mb-2 text-[13px] text-good">{ok}</p>}
      <button className="btn btn-primary" onClick={send}>재설정 링크 보내기</button>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="font-bold text-primaryDark">로그인으로 돌아가기</Link>
      </div>
    </div>
  );
}
