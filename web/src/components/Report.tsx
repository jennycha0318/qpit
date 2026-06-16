import type { Diagnosis } from "@/lib/diagnose/engine";
import { CrisisResources, LegalEthicsNotice } from "@/components/SupportNotices";

export function Report({ d }: { d: Diagnosis }) {
  const color = d.score >= 65 ? "#2fa66b" : d.score >= 45 ? "#e0902f" : "#d65b58";
  const badge = d.score >= 65 ? "지금이 좋은 타이밍" : d.score >= 45 ? "조금 더 준비가 필요" : "지금은 기다릴 때";
  const C = 2 * Math.PI * 52;
  const offset = C * (1 - d.score / 100);
  const planColor = d.plan.tone === "good" ? "#2fa66b" : d.plan.tone === "warn" ? "#e0902f" : "#d65b58";
  const factors = [...d.factors]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* 점수 */}
      <div className="card text-center">
        <p className="mb-1 text-sm font-bold text-muted">{d.scoreTitle}</p>
        <div className="relative mx-auto my-1.5 h-40 w-40">
          <svg width="160" height="160" viewBox="0 0 130 130" className="-rotate-90">
            <circle cx="65" cy="65" r="52" fill="none" stroke="#efe6e0" strokeWidth="13" />
            <circle cx="65" cy="65" r="52" fill="none" stroke={color} strokeWidth="13"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[42px] font-bold leading-none" style={{ color }}>{d.score}</span>
            <span className="text-sm text-muted">/ 100</span>
          </div>
        </div>
        <span className="inline-block rounded-full px-4 py-1.5 text-sm font-bold"
          style={{ color, background: `${color}1a` }}>{badge}</span>
        <p className="mt-3 text-sm text-muted">{d.reason}</p>
      </div>

      {/* 위기 신호 시 상담 연결 */}
      {d.needsSupport && <CrisisResources />}

      {/* 언제·어떻게 */}
      <div className="card">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">언제·어떻게 연락할까</p>
        <div className="mb-3.5 rounded-xl p-3 text-center text-lg font-bold"
          style={{ color: planColor, background: `${planColor}14` }}>{d.plan.when}</div>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-[#f0ecfb] px-2.5 py-0.5 text-[11px] font-bold text-[#7d6fd6]">추천 수단</span>
          {d.plan.channel}
        </div>
        <ul className="relative ml-2 border-l-2 border-line pl-6">
          {d.plan.steps.map((s, i) => (
            <li key={i} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-primary ring-2 ring-primary" />
              <span className="block text-xs font-bold text-primaryDark">{s.time}</span>
              <span className="text-sm">{s.action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 판단 근거 */}
      <div className="card">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">이렇게 판단했어요</p>
        <ul className="flex flex-col gap-2">
          {factors.map((f, i) => {
            const pos = f.delta > 0;
            return (
              <li key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm"
                style={{ background: pos ? "#eef8f1" : "#fdf2f0" }}>
                <span className="text-[11px]" style={{ color: pos ? "#2fa66b" : "#d65b58" }}>{pos ? "▲" : "▼"}</span>
                <span className="flex-1">{f.label}</span>
                <span className="text-[13px] font-bold" style={{ color: pos ? "#2fa66b" : "#d65b58" }}>
                  {pos ? "+" : ""}{f.delta}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 추천 액션 */}
      <div className="card">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">추천 액션</p>
        <ul className="flex flex-col gap-3.5">
          {d.actions.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-white">{i + 1}</span>
              <span><b className="block text-[15px]">{a.t}</b><span className="text-[13px] text-muted">{a.d}</span></span>
            </li>
          ))}
        </ul>
      </div>

      {/* 주의 */}
      <div className="card">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">이것만은 주의하세요</p>
        <ul className="flex flex-col gap-2.5">
          {d.risks.map((r, i) => (
            <li key={i} className="flex gap-2.5 rounded-xl border border-[#f6d9d2] bg-[#fdf3f0] px-3.5 py-3 text-sm">
              <span className="font-bold text-bad">•</span>{r}
            </li>
          ))}
        </ul>
      </div>

      {/* 메시지 */}
      <div className="card bg-gradient-to-br from-[#fef7f8] to-[#f6f2fd]">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">{d.msgLabel}</p>
        {d.hold ? (
          <div className="rounded-xl border border-dashed border-primary bg-surface p-4 text-sm">{d.hold}</div>
        ) : (
          <div className="whitespace-pre-wrap rounded-[14px_14px_14px_4px] border border-line bg-surface p-4 text-[15px] leading-relaxed">{d.msg}</div>
        )}
      </div>

      {/* 법적·윤리 고지 (외도·학대) */}
      <LegalEthicsNotice compact />
    </div>
  );
}
