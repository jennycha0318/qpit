import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";

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
      {/* 히어로 — 로고 + 워드마크 + 태그 */}
      <div className="mb-5 flex flex-col items-center text-center">
        <Logo size={64} className="mb-2.5" />
        <span className="font-display text-[24px] font-bold tracking-tight text-ink">Pacemaker</span>
        <span className="mt-2 rounded-full bg-primarySoft px-3 py-1 text-[12px] font-bold text-primaryDark">AI 연애 타이밍 컨설팅</span>
      </div>

      {/* 헤드라인 — 위스테리아→아쿠아 그라데이션 테두리 글래스 프레임 */}
      <div className="rounded-[26px] bg-gradient-to-br from-primary to-accent p-[1.5px] shadow-[0_10px_30px_rgba(70,80,130,0.14)]">
        <div className="rounded-[24.5px] bg-white/75 px-6 py-7 text-center backdrop-blur-xl">
          <h1 className="text-[30px] font-bold leading-[1.4] tracking-tight">
            연애의 결정적 순간,
            <br />
            <span className="text-primary">타이밍</span>을 분석해 드립니다
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            내 상황과 상대 성향 데이터를 분석해
            <br />
            성공 확률이 높아지는 <b className="text-ink">타이밍과 행동</b>을 제안
          </p>
        </div>
      </div>

      {/* 특징 카드 */}
      <div className="card mt-4">
        <p className="mb-3.5 text-[12px] font-bold uppercase tracking-wide text-primaryDark">Pacemaker는 이렇게 도와요</p>
        <ul className="flex flex-col gap-3 text-[14px]">
          {[
            "실제 연애 의사결정 패턴을 데이터화",
            "개인별 성향과 상황에 맞춤화",
            "실행 타이밍·방법·문구까지 제안",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primarySoft text-accent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <Link href="/login" className="btn btn-primary mt-6 block text-center">시작하기</Link>
      <p className="mt-2.5 text-center text-[12px] text-muted">로그인 없이 비회원 진단도 가능해요</p>
    </div>
  );
}
