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
      {/* 히어로 — 로고(글로우+플로팅) + 워드마크 + 태그 */}
      <div className="pm-fade-up mb-6 flex flex-col items-center text-center">
        <div className="pm-float relative">
          <div className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-periwinkle/60 to-aqua/50 blur-2xl" />
          <Logo size={66} />
        </div>
        <span className="mt-3 font-display text-[24px] font-bold tracking-tight text-ink">큐핏</span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primarySoft px-3 py-1 text-[12px] font-bold text-primaryDark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 6.6L20 10l-6.1 1.4L12 18l-1.9-6.6L4 10l6.1-1.4z" />
          </svg>
          AI 연애 타이밍 컨설팅
        </span>
      </div>

      {/* 헤드라인 (상자 없이) */}
      <div className="pm-fade-up text-center">
        <h1 className="text-[30px] font-bold leading-[1.4] tracking-tight">
          연애의 결정적 순간,
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">타이밍</span>을 분석해 드립니다
        </h1>
      </div>

      {/* 특징 — 흰 카드(금색 테두리), 제목 가운데 · 체크는 일렬 정렬 */}
      <div className="card pm-fade-up mt-6" style={{ borderColor: "#cba84f" }}>
        <p className="mb-3.5 text-center text-[12px] font-bold uppercase tracking-wide text-primaryDark">큐핏은 이렇게 도와요</p>
        <ul className="mx-auto flex w-fit flex-col gap-3 text-[14px]">
          {[
            "실제 연애 의사결정 패턴을 데이터화",
            "개인별 성향과 상황에 맞춤화",
            "실행 타이밍·방법·문구까지 제안",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-[0_2px_6px_rgba(96,130,188,0.35)]">
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
      <Link href="/login" className="btn btn-primary pm-fade-up mt-6 block text-center">시작하기</Link>
      <p className="mt-2.5 text-center text-[12px] text-muted">로그인 없이 비회원 진단도 가능해요</p>
    </div>
  );
}
