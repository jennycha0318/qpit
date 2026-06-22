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
      <h1 className="mb-4 text-[34px] font-bold leading-[1.45] tracking-tight">
        연애의 결정적 순간,
        <br />
        <span className="text-primary">타이밍</span>을 분석해 드립니다
      </h1>
      <p className="mb-7 text-[16px] text-muted">
        내 상황과 상대 성향 데이터를 분석해
        <br />
        성공 확률이 높아지는 <b className="text-ink">타이밍과 행동</b>을 제안
      </p>
      <Link href="/login" className="btn btn-primary block text-center">시작하기</Link>
      <ul className="mt-8 flex flex-col gap-3.5 text-[14px]">
        {[
          "실제 연애 의사결정 패턴을 데이터화",
          "개인별 성향과 상황에 맞춤화",
          "실행 타이밍·방법·문구까지 제안하여 성공 확률 향상",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2.5">
            <svg className="mt-0.5 shrink-0 text-accent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
