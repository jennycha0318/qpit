export type Stage = "crush" | "dating" | "breakup";

export interface Option {
  v: string;
  label: string;
  note?: string;
}
export interface Question {
  id: string;
  title: string;
  type?: "text";
  desc?: string;
  placeholder?: string;
  options?: Option[];
}

const PARTNER_Q: Question = {
  id: "partner",
  title: "상대는 평소 연락·감정 표현이 어떤 편인가요?",
  options: [
    { v: "expressive", label: "표현이 풍부하고 일관돼요", note: "안정형에 가까움" },
    { v: "inconsistent", label: "들쭉날쭉, 기복이 있어요", note: "불안형에 가까움" },
    { v: "reserved", label: "표현이 적고 거리를 둬요", note: "회피형에 가까움" },
  ],
};
const SELF_ATTACH_Q: Question = {
  id: "selfAttach",
  title: "갈등이나 불안한 상황에서 당신은 보통?",
  options: [
    { v: "secure", label: "비교적 담담하게 받아들여요", note: "안정형" },
    { v: "anxious", label: "불안해서 계속 확인하고 싶어요", note: "불안형" },
    { v: "avoidant", label: "거리를 두고 마음을 닫아요", note: "회피형" },
  ],
};
const SELF_URGENCY_Q: Question = {
  id: "urgency",
  title: "지금 당신의 마음 상태에 가장 가까운 건?",
  options: [
    { v: "low", label: "차분하게 판단하고 싶어요" },
    { v: "mid", label: "초조하지만 참을 수 있어요" },
    { v: "high", label: "조급하고 안절부절못해요", note: "주의" },
  ],
};
const FREE_TEXT_Q: Question = {
  id: "freeText",
  type: "text",
  title: "상황을 자유롭게 적어주세요",
  desc: "무슨 일이 있었는지 적어두면 기록으로 저장돼요. (지금은 진단 점수에 반영되지 않고, 추후 AI 개인화에 활용될 예정이에요 · 선택)",
  placeholder: "예) 일이 바빠서 소홀했고, 마지막에 크게 싸우고 헤어졌어요…",
};
const COMMON = [PARTNER_Q, SELF_ATTACH_Q, SELF_URGENCY_Q, FREE_TEXT_Q];

export const STAGE_LABEL: Record<Stage, string> = {
  crush: "썸",
  dating: "연애 중",
  breakup: "이별 후",
};

export const SURVEYS: Record<Stage, Question[]> = {
  crush: [
    { id: "period", title: "알게 된 지 얼마나 됐나요?", options: [
      { v: "lt1m", label: "1개월 미만" },
      { v: "1to3m", label: "1~3개월" },
      { v: "3to6m", label: "3~6개월" },
      { v: "gt6m", label: "6개월 이상" },
    ] },
    { id: "trend", title: "요즘 둘의 연락 빈도는?", options: [
      { v: "increasing", label: "점점 늘어나요", note: "좋은 신호" },
      { v: "stable", label: "비슷하게 유지돼요" },
      { v: "decreasing", label: "점점 줄어들어요", note: "주의" },
    ] },
    { id: "warmth", title: "상대의 반응 온도는 어떤가요?", options: [
      { v: "hot", label: "적극적이에요 (먼저 연락·관심)" },
      { v: "warm", label: "호의적이에요" },
      { v: "lukewarm", label: "미적지근해요" },
      { v: "cold", label: "잘 모르겠어요 / 거리감" },
    ] },
    { id: "initiation", title: "연락은 주로 누가 먼저 하나요?", options: [
      { v: "partner_more", label: "상대가 더 자주 먼저", note: "강한 호감 신호" },
      { v: "balanced", label: "비슷해요" },
      { v: "me_more", label: "거의 내가 먼저", note: "일방적 주의" },
    ] },
    { id: "signals", title: "둘 사이 호감 신호(따로 만남·플러팅·스킨십)는?", options: [
      { v: "strong", label: "자주 있고 분위기도 좋아요" },
      { v: "some", label: "가끔 있어요" },
      { v: "weak", label: "거의 없어요" },
    ] },
    ...COMMON,
  ],
  dating: [
    { id: "period", title: "사귄 지 얼마나 됐나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ] },
    { id: "mood", title: "최근 관계 분위기는?", options: [
      { v: "better", label: "점점 좋아지고 있어요" },
      { v: "same", label: "비슷해요" },
      { v: "cooling", label: "식어가는 것 같아요", note: "주의" },
    ] },
    { id: "conflict", title: "최근 갈등이 있었나요?", options: [
      { v: "none", label: "거의 없어요" },
      { v: "minor", label: "작은 다툼이 있었어요" },
      { v: "serious", label: "큰 갈등이 있었어요" },
    ] },
    { id: "resolve", title: "갈등이 생기면 두 사람은?", options: [
      { v: "talk", label: "대화로 풀어가요", note: "건강한 신호" },
      { v: "avoid", label: "회피하거나 침묵해요" },
      { v: "explode", label: "감정이 폭발하곤 해요", note: "주의" },
    ] },
    { id: "future", title: "미래(여행·계획 등) 얘기는 어떤가요?", options: [
      { v: "yes", label: "자연스럽게 나눠요", note: "안정 신호" },
      { v: "sometimes", label: "가끔 나와요" },
      { v: "no", label: "거의 없거나 피해요", note: "주의" },
    ] },
    ...COMMON,
  ],
  breakup: [
    { id: "period", title: "사귄 기간은 얼마였나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ] },
    { id: "since", title: "헤어진 지 얼마나 됐나요?", options: [
      { v: "lt1w", label: "1주일 미만" },
      { v: "1to2w", label: "1~2주" },
      { v: "2to4w", label: "2~4주" },
      { v: "1to3m", label: "1~3개월" },
      { v: "gt3m", label: "3개월 이상" },
    ] },
    { id: "who", title: "누가 이별을 제안했나요?", options: [
      { v: "me", label: "내가 먼저" },
      { v: "partner", label: "상대가 먼저", note: "설득 난도 ↑" },
      { v: "mutual", label: "서로 합의" },
    ] },
    { id: "reason", title: "이별의 핵심 이유는?", options: [
      { v: "conflict", label: "잦은 다툼" },
      { v: "drift", label: "권태 / 소원해짐" },
      { v: "personality", label: "성격 차이" },
      { v: "external", label: "환경 (거리·바쁨 등)", note: "회복 가능성 ↑" },
      { v: "other_person", label: "상대의 변심", note: "신중 필요" },
    ] },
    { id: "contact", title: "헤어진 후 지금 연락 상태는?", options: [
      { v: "none", label: "전혀 안 해요 (거리두기)" },
      { v: "occasional", label: "가끔 가벼운 연락" },
      { v: "frequent", label: "자주 연락해요" },
      { v: "fighting", label: "연락하다 또 다퉜어요", note: "주의" },
      { v: "blocked", label: "상대가 차단했어요", note: "거부 신호" },
    ] },
    { id: "newperson", title: "상대에게 새로운 사람이 있나요?", options: [
      { v: "none", label: "없는 것 같아요" },
      { v: "unknown", label: "잘 모르겠어요" },
      { v: "yes", label: "있는 것 같아요", note: "난도 ↑" },
    ] },
    ...COMMON,
  ],
};
