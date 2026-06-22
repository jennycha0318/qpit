"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/GoogleButton";
import { BrandLockup } from "@/components/Logo";
import { PwToggle } from "@/components/PwToggle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const emailHint = email && !EMAIL_RE.test(email) ? "이메일 형식을 확인해 주세요. (예: you@example.com)" : "";

  // OAuth 콜백 실패 시 /login?error=auth 로 돌아옴 → 안내 표시
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "auth") {
      setErr("로그인에 실패했어요. 다시 시도해 주세요.");
    }
  }, []);

  async function login() {
    setErr("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setErr("이메일 또는 비밀번호가 올바르지 않아요.");
      else router.push("/diagnose");
    } catch {
      setErr("네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-4">
      <BrandLockup size={30} className="mb-6" />
      <h2 className="mb-1.5 text-[30px] font-bold tracking-tight">로그인</h2>
      <p className="mb-6 text-sm text-muted">Pacemaker에 오신 걸 환영해요.</p>

      <GoogleButton />
      <div className="my-[18px] flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>또는 이메일로</span>
      </div>

      <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-bold">이메일</label>
      <input id="login-email" autoComplete="email" className="field-input" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <p className="min-h-[18px] pt-1 text-[12.5px] text-warn">{emailHint}</p>
      <label htmlFor="login-pw" className="mb-1.5 mt-1.5 block text-[13px] font-bold">비밀번호</label>
      <div className="relative">
        <input id="login-pw" autoComplete="current-password" className="field-input pr-11" type={showPw ? "text" : "password"} value={pw}
          onChange={(e) => setPw(e.target.value)} placeholder="비밀번호"
          onKeyDown={(e) => e.key === "Enter" && login()} />
        <PwToggle shown={showPw} onClick={() => setShowPw((v) => !v)} />
      </div>
      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>

      <button className="btn btn-primary" onClick={login} disabled={loading}>
        {loading ? "로그인 중…" : "로그인"}
      </button>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/reset-password" className="font-bold text-primaryDark">비밀번호 찾기</Link>
        <Link href="/signup" className="font-bold text-primaryDark">회원가입</Link>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-2 text-center text-[12.5px] text-muted">로그인 없이 먼저 둘러볼 수도 있어요</p>
        <Link href="/diagnose" className="btn btn-ghost block text-center">비회원으로 진단하기</Link>
      </div>
    </div>
  );
}
