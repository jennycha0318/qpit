// Pacemaker 로고 — 하트 + X/체크 말풍선(연애 의사결정). 파스텔 글래스 팔레트로 재제작.
export function Logo({ size = 40, className = "", decorative = false }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Pacemaker 로고"}
      aria-hidden={decorative ? true : undefined}
      className={className}
    >
      <defs>
        <linearGradient id="pmHeart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c0b9dd" />
          <stop offset="0.55" stopColor="#80a1d4" />
          <stop offset="1" stopColor="#75c9c8" />
        </linearGradient>
        <linearGradient id="pmX" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c0b9dd" />
          <stop offset="1" stopColor="#7e9fd2" />
        </linearGradient>
        <linearGradient id="pmCheck" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#80a1d4" />
          <stop offset="1" stopColor="#6cc0bf" />
        </linearGradient>
      </defs>
      {/* 왼쪽 말풍선 (O) */}
      <path d="M150 168 L190 200 L168 140 Z" fill="url(#pmX)" />
      <circle cx="128" cy="116" r="84" fill="url(#pmX)" />
      <circle cx="128" cy="116" r="32" fill="none" stroke="#ffffff" strokeWidth="20" />
      {/* 오른쪽 말풍선 (X) */}
      <path d="M362 168 L322 200 L344 140 Z" fill="url(#pmCheck)" />
      <circle cx="384" cy="116" r="84" fill="url(#pmCheck)" />
      <g stroke="#ffffff" strokeWidth="22" strokeLinecap="round">
        <line x1="356" y1="90" x2="412" y2="142" />
        <line x1="412" y1="90" x2="356" y2="142" />
      </g>
      {/* 하트 */}
      <path d="M256 460 C150 384 96 322 96 268 C96 230 126 206 162 206 C198 206 226 230 256 272 C286 230 314 206 350 206 C386 206 416 230 416 268 C416 322 362 384 256 460 Z" fill="url(#pmHeart)" />
    </svg>
  );
}

// 로고 + 워드마크
export function BrandLockup({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} decorative />
      <span className="font-display text-[22px] font-bold tracking-tight text-ink">Pacemaker</span>
    </div>
  );
}
