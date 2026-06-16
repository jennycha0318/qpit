"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/GoogleButton";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  async function signup() {
    setErr(""); setOk("");
    if (!name.trim()) return setErr("이름(닉네임)을 입력해 주세요.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("올바른 이메일을 입력해 주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    if (!agree) return setErr("개인정보 수집·이용에 동의해 주세요.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) return setErr(error.message);
      // 이메일 인증이 꺼져 있으면 즉시 세션 생성됨
      if (data.session) router.push("/diagnose");
      else setOk("가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 완료해 주세요.");
    } catch {
      setErr("네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-4">
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">회원가입</h2>
      <p className="mb-6 text-sm text-muted">이메일로 가입하거나 Google을 사용하세요.</p>

      <GoogleButton />
      <p className="mt-1.5 text-center text-[11.5px] text-muted">Google로 가입 시 계정 이름이 닉네임으로 저장돼요.</p>
      <div className="my-[18px] flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>또는 이메일로</span>
      </div>

      <label className="mb-1.5 block text-[13px] font-bold">이름(닉네임)</label>
      <input className="field-input mb-3.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 지은" />
      <label className="mb-1.5 block text-[13px] font-bold">이메일</label>
      <input className="field-input mb-3.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <label className="mb-1.5 block text-[13px] font-bold">비밀번호</label>
      <input className="field-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" />
      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>
      {ok && <p className="mb-2 text-[13px] text-good">{ok}</p>}

      <label className="mb-3 flex items-start gap-2 text-[13px] text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>
          <Link href="/privacy" target="_blank" className="font-bold text-primaryDark underline">개인정보 수집·이용</Link>에 동의합니다.
          이메일·닉네임과 진단 입력(상황·자유서술)이 저장되며, 자유서술은 추후 AI 분석에 활용될 수 있어요.
        </span>
      </label>

      <button className="btn btn-primary" onClick={signup} disabled={loading}>
        {loading ? "가입 중…" : "가입하기"}
      </button>

      <div className="mt-4 flex justify-center gap-2 text-sm">
        <span className="text-muted">이미 계정이 있나요?</span>
        <Link href="/login" className="font-bold text-primaryDark">로그인</Link>
      </div>
    </div>
  );
}
