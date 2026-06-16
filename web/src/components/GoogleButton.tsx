"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function google() {
    setErr("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      // 성공 시 브라우저가 구글로 리다이렉트됨(이 줄 이후 도달 안 함).
      // 에러면 리다이렉트 없이 반환 → 안내 표시.
      if (error) {
        setErr("구글 로그인을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
      }
    } catch {
      setErr("구글 로그인 중 오류가 발생했어요.");
      setLoading(false);
    }
  }
  return (
    <>
    <button onClick={google} type="button" disabled={loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-white py-3 text-[15px] font-bold text-[#3c4043] hover:bg-[#faf7f9] disabled:opacity-60">
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.7 34.6 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.6 5.6C42.9 35.6 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      {loading ? "연결 중…" : "Google로 계속하기"}
    </button>
    {err && <p className="mt-2 text-center text-[13px] text-bad">{err}</p>}
    </>
  );
}
