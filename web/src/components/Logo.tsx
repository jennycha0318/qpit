// 큐핏(Qpit) 로고 — 파스텔 하트(심플).
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
      {/* 파스텔 하트 */}
      <path
        d="M256 448 C120 360 48 280 48 192 C48 130 96 86 156 86 C200 86 234 112 256 150 C278 112 312 86 356 86 C416 86 464 130 464 192 C464 280 392 360 256 448 Z"
        fill="url(#qpFill)"
        stroke="url(#qpGrad)"
        strokeWidth="16"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 대각선 화살 (하트 관통) */}
      <g stroke="url(#qpGrad)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <line x1="95" y1="385" x2="405" y2="130" />
        <line x1="76" y1="365" x2="124" y2="413" />
        <line x1="90" y1="351" x2="138" y2="399" />
      </g>
      <path d="M442 100 L423 152 L387 108 Z" fill="url(#qpGrad)" />
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
