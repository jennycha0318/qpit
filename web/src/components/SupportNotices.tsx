// 위기 심리상담 + 법적·윤리 고지 공용 컴포넌트

// 정서적 위기 신호가 감지될 때 노출하는 상담 연결 카드
export function CrisisResources() {
  return (
    <div className="rounded-2xl border border-primary/40 bg-primarySoft p-4">
      <p className="mb-1 text-sm font-bold text-ink">혼자 견디기 힘들다면</p>
      <p className="mb-3 text-[13px] text-muted">
        지금 많이 힘들다면 전문가의 도움을 받는 것도 좋은 선택이에요. 모두 무료·24시간 상담이에요.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-start gap-2">
          <span className="font-bold text-primaryDark">자살예방 상담</span>
          <a href="tel:109" className="font-bold underline">전화 109</a>
          <span className="text-muted">· 24시간</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-bold text-primaryDark">청소년 상담 (9~24세)</span>
          <span>전화 <b>지역번호+1388</b> · 문자 <a href="sms:%231388" className="font-bold underline">#1388</a></span>
        </li>
      </ul>
      <p className="mt-2 text-[11px] text-muted">청소년 상담은 24시간 365일 운영돼요.</p>
    </div>
  );
}

// 외도·학대 등 법적·윤리 사전 고지 (대한법률구조공단 무료 상담 링크)
export function LegalEthicsNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? "text-[11.5px] leading-relaxed text-muted" : "text-xs leading-relaxed text-muted"}>
      배우자·연인이 있는 상태에서의 외도, 정신적·육체적 학대 등은 <b>법적·윤리적 문제</b>가 될 수 있어요.
      도움이 필요하면{" "}
      <a
        href="https://www.klac.or.kr/legalstruct/consultationGuidance.do"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-primaryDark underline"
      >
        대한법률구조공단 무료 법률상담
      </a>
      을 이용하세요.
    </p>
  );
}
