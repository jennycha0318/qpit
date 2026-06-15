import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <div className="pt-6">
      <p className="mb-3.5 text-sm font-bold text-primaryDark">고백해도 될까? 지금 연락해도 될까?</p>
      <h1 className="mb-4 text-[28px] font-bold leading-[1.35] tracking-tight">
        연애의 결정적 순간,
        <br />
        <span className="text-primary">타이밍</span>을 분석해 드립니다
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        내 상황과 상대 성향 데이터를 분석해
        <br />
        <b className="text-ink">언제·어떻게</b> 행동해야 성공 확률이 높은지 알려주는 AI 컨설턴트
      </p>
      <Link href="/diagnose" className="btn btn-primary block text-center">무료로 진단 시작 (로그인 없이)</Link>
      <Link href="/login" className="btn btn-ghost mt-3 block text-center">로그인 · 회원가입</Link>
      <ul className="mt-8 flex flex-col gap-3 text-sm">
        <li className="card">일반론 아닌 <b>내 상황</b> 맞춤 분석</li>
        <li className="card">‘냉정한 거울’ — 듣기 좋은 말 대신 솔직한 진단</li>
        <li className="card">바로 쓸 수 있는 <b>연락 문구</b>까지</li>
      </ul>
    </div>
  );
}
