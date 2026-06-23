// 큐핏(Qpit) 로고 — 금색 라인아트: 하트를 관통하는 큐피드의 화살.
export function Logo({ size = 40, className = "", decorative = false }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "큐핏 로고"}
      aria-hidden={decorative ? true : undefined}
      className={className}
    >
      <defs>
        <linearGradient id="qpGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a8fd8" />
          <stop offset="0.5" stopColor="#7c9ed4" />
          <stop offset="1" stopColor="#5cc1bf" />
        </linearGradient>
        <linearGradient id="qpFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfc7ef" />
          <stop offset="0.5" stopColor="#bcd0ee" />
          <stop offset="1" stopColor="#a9e6e2" />
        </linearGradient>
      </defs>
      {/* 하트 — 금색 외곽선 */}
      <path
        d="M256 205 C228 160 175 150 140 185 C108 217 112 268 150 305 L256 400 L362 305 C400 268 404 217 372 185 C337 150 284 160 256 205 Z"
        fill="url(#qpFill)"
        stroke="url(#qpGrad)"
        strokeWidth="16"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 큐피드 화살 — 자루 + 깃(왼쪽 아래) */}
      <g stroke="url(#qpGrad)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <line x1="95" y1="415" x2="420" y2="175" />
        <line x1="70" y1="388" x2="140" y2="448" />
        <line x1="98" y1="368" x2="168" y2="428" />
      </g>
      {/* 화살촉 (오른쪽 위) */}
      <path d="M455 150 L429 206 L394 158 Z" fill="url(#qpGrad)" />
    </svg>
  );
}

// 로고 + 워드마크
export function BrandLockup({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} decorative />
      <span className="font-display text-[22px] font-bold tracking-tight text-ink">큐핏</span>
    </div>
  );
}
