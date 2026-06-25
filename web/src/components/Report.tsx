import type { Diagnosis } from "@/lib/diagnose/engine";
import { CrisisResources, LegalEthicsNotice } from "@/components/SupportNotices";
import { ShareButton } from "@/components/ShareButton";
import { AskCupidButton } from "@/components/AskCupidButton";
import { scoreColor, scoreBadge, toneColor } from "@/lib/diagnose/colors";

export function Report({ d, diagnosisId }: { d: Diagnosis; diagnosisId?: string }) {
  const color = scoreColor(d.score);
  const badge = scoreBadge(d.score);
  const C = 2 * Math.PI * 52;
  const offset = C * (1 - d.score / 100);
  const planColor = toneColor(d.plan.tone);
  const factors = [...d.factors]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* 큐핏이 발견한 것 — 비자명한 통찰(있을 때만, 위기 케이스 제외) 최상단 강조 */}
      {d.keyInsight && !d.needsSupport && (
        <div className="mb-6 rounded-[18px] border border-primary/40 bg-gradient-to-br from-[#efeafc] to-[#e7f4f3] p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-primaryDark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
            </svg>
            큐핏이 발견한 것
          </p>
          <p className="text-[15px] font-medium leading-relaxed text-ink">{d.keyInsight}</p>
        </div>
      )}

      {/* ── 그룹 1: 결과 (위기 → 점수) ── */}
      <section className="flex flex-col gap-3.5">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">결과</p>

        {/* 점수 */}
        <div className="card text-center">
          <p className="mb-1 text-sm font-bold text-muted">{d.scoreTitle}</p>
          <div className="relative mx-auto my-1.5 h-40 w-40">
            <svg width="160" height="160" viewBox="0 0 130 130" className="-rotate-90">
              <circle cx="65" cy="65" r="52" fill="none" stroke="#e6e3f2" strokeWidth="13" />
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
      </section>

      {/* ── 그룹 2: 다음 행동 (언제·어떻게 → 추천 액션 → 주의) ── */}
      <section className="mt-7 flex flex-col gap-3.5">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">다음 행동</p>

        {/* 언제·어떻게 */}
        <div className="card">
          <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">언제·어떻게 연락할까</p>
          <div className="mb-3.5 rounded-xl p-3 text-center text-lg font-bold"
            style={{ color: planColor, background: `${planColor}14` }}>{d.plan.when}</div>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="rounded-full bg-primarySoft px-2.5 py-0.5 text-[12.5px] font-bold text-primaryDark">추천 수단</span>
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

        {/* 주의 — 3개 초과 시 나머지는 <details>로 접기 (서버 컴포넌트 유지) */}
        <div className="card">
          <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-primaryDark">이것만은 주의하세요</p>
          <ul className="flex flex-col gap-2.5">
            {d.risks.slice(0, 3).map((r, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl border border-[#f0dbe6] bg-[#faf1f6] px-3.5 py-3 text-sm">
                <span className="font-bold text-bad">•</span>{r}
              </li>
            ))}
          </ul>
          {d.risks.length > 3 && (
            <details className="group mt-2.5">
              <summary className="cursor-pointer list-none text-[13px] font-bold text-primaryDark">
                <span className="group-open:hidden">주의사항 {d.risks.length - 3}개 더 보기</span>
                <span className="hidden group-open:inline">접기</span>
              </summary>
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {d.risks.slice(3).map((r, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl border border-[#f0dbe6] bg-[#faf1f6] px-3.5 py-3 text-sm">
                    <span className="font-bold text-bad">•</span>{r}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      {/* ── 그룹 3: 근거·참고 (판단 근거 → 메시지 → 성향·궁합) ── */}
      <section className="mt-7 flex flex-col gap-3.5">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">근거·참고</p>

        {/* 판단 근거 — 요인이 있을 때만(안전 우회 등 factors 빈 경우 숨김) */}
        {factors.length > 0 && (
        <div className="card">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primaryDark">이렇게 판단했어요</p>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted">점수 계산에 반영된 요인이에요. 당신이 부족하다는 뜻이 아니에요.</p>
          <ul className="flex flex-col gap-2">
            {factors.map((f, i) => {
              const pos = f.delta > 0;
              return (
                <li key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: pos ? "#e4f3f2" : "#f6e6ee" }}>
                  <span className="text-[12.5px]" style={{ color: pos ? "#4fa3a2" : "#b96b8f" }}>{pos ? "▲" : "▼"}</span>
                  <span className="flex-1">{f.label}</span>
                  <span className="text-[13px] font-bold" style={{ color: pos ? "#4fa3a2" : "#b96b8f" }}>
                    {pos ? "+" : ""}{f.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        )}

        {/* 메시지 — hold(보류·주의)와 msg(예시)를 아이콘·톤으로 시각 구분 */}
        <div className={`card ${d.hold ? "bg-gradient-to-br from-[#faf1f6] to-[#f3e9f0]" : "bg-gradient-to-br from-[#eaeef8] to-[#e7f4f3]"}`}>
          <p className="mb-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primaryDark">
            {d.hold ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-bad">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-primary">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7z" />
              </svg>
            )}
            {d.msgLabel}
          </p>
          {d.hold ? (
            <div className="rounded-xl border border-dashed border-bad bg-[#faf1f6] p-4 text-sm">{d.hold}</div>
          ) : (
            <div className="whitespace-pre-wrap rounded-[14px_14px_14px_4px] border border-line bg-surface p-4 text-[15px] leading-relaxed">{d.msg}</div>
          )}
        </div>

        {/* 나에게 건네는 한마디 — 연락을 권하지 않는(보류·차단·안전) 상황의 정서적 동반 */}
        {d.hold && d.selfMessage && (
          <div className="card bg-gradient-to-br from-[#f3effb] to-[#eef5f4]">
            <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primaryDark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-primary">
                <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 5 5.3 5c2 0 3.3 1.2 4.2 2.5l.5.8.5-.8C11.4 6.2 12.7 5 14.7 5 18 5 19.6 8.4 22 11.8 19.5 16.4 12 21 12 21z" />
              </svg>
              나에게 건네는 한마디
            </p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{d.selfMessage}</p>
          </div>
        )}

      </section>

      {/* 카톡 대화 분석 결과(선택 옵션) */}
      {d.kakaoAnalysis && (
        <section className="mt-7">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">카톡 대화 분석</p>
          <div className="card mt-3.5 whitespace-pre-wrap text-[14px] leading-relaxed">{d.kakaoAnalysis}</div>
        </section>
      )}

      {/* 이 결과로 큐핏 챗봇 상담 연결 (위기·안전 케이스는 상담 연결을 우선하므로 제외) */}
      {!d.needsSupport && (
        <div className="mt-7">
          <AskCupidButton d={d} diagnosisId={diagnosisId} />
        </div>
      )}

      {/* 결과 공유 — 진단 결과·히스토리 상세 양쪽에서 사용 */}
      <div className="mt-3">
        <ShareButton d={d} />
      </div>

      {/* 법적·윤리 고지 (외도·학대) — 청소년에겐 비노출(지지 중심) */}
      {!d.minor && <div className="mt-7"><LegalEthicsNotice compact /></div>}

      {/* 위기 신호 시 상담 연결 — 가장 마지막으로 */}
      {d.needsSupport && <div className="mt-7"><CrisisResources minor={d.minor} /></div>}
    </div>
  );
}
