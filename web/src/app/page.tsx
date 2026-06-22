import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandLockup } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // auth 서비스 장애 시에도 랜딩은 정상 노출 (비로그인 취급)
  }
  if (user) redirect("/diagnose"); // redirect는 try 밖 (내부적으로 throw 사용)

  return (
    <div>
      <BrandLockup className="mb-7" />
      <p className="mb-3.5 text-sm font-bold text-primaryDark">고백해도 될까? 지금 연락해도 될까?</p>
      <h1 className="mb-4 text-[34px] font-bold leading-[1.45] tracking-tight">
        연애의 결정적 순간,
        <br />
        <span className="text-primary">타이밍</span>을 분석해 드립니다
      </h1>
      <p className="mb-7 text-base text-muted">
        내 상황과 상대 성향 데이터를 분석해
        <br />
        성공 확률이 높아지는 <b className="text-ink">타이밍과 행동</b>을 제안
      </p>
      <Link href="/diagnose" className="btn btn-primary block text-center">무료로 진단 시작 (로그인 없이)</Link>
      <Link href="/login" className="btn btn-ghost mt-3 block text-center">로그인 · 회원가입</Link>
      <ul className="mt-8 flex flex-col gap-3 text-sm">
        <li className="card border-2 border-primary/40">실제 연애 의사결정·성공/실패 패턴을 데이터화한 분석</li>
        <li className="card">개인별 성향과 상황에 맞춤화</li>
        <li className="card">실행 타이밍·방법·문구까지 제안하여 성공 확률 향상</li>
      </ul>
    </div>
  );
}
