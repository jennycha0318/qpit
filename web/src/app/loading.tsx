import { Logo } from "@/components/Logo";

// 첫 진입·라우트 로딩 중 스플래시 — 파스텔 배경(body::before) 위에 통통 튀는 로고 + 서비스명
export default function Loading() {
  return (
    <div className="pm-fade-up fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6">
      <div className="pm-bounce">
        <Logo size={92} decorative />
      </div>
      <span className="font-display text-[28px] font-bold tracking-tight text-ink">큐핏</span>
      <span className="text-[13px] font-bold text-primaryDark">AI 연애 타이밍 컨설팅</span>
    </div>
  );
}
