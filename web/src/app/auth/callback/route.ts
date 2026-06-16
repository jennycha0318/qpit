import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth(구글) 및 이메일 인증 콜백 — code를 세션으로 교환
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // open redirect 방지: 내부 절대경로만 허용 (`//`, `/\` 등 외부 리다이렉트 차단)
  const raw = searchParams.get("next") ?? "/diagnose";
  const next = /^\/[^/\\]/.test(raw) ? raw : "/diagnose";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Auth callback error:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
