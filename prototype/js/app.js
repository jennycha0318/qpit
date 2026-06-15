/* ============================================================
   Pacemaker Prototype — 플로우 로직 + Mock 진단 엔진 (v2)
   ※ 실제 AI 호출 대신 연애·재회 상담 프레임워크를 흉내 낸
     "요인(factor) 기반 규칙 엔진"으로 진단을 생성한다.
     각 답변이 점수에 기여한 근거를 그대로 노출해 신뢰를 준다.
   ============================================================ */

// ── 상태 ──────────────────────────────────────
const state = { stage: null, qIndex: 0, answers: {} };
let lastDiag = null;          // 공유용 마지막 진단 결과
let msgImageData = null;      // 업로드된 카톡 캡처(dataURL)
const screenHistory = [];     // 뒤로가기용 화면 스택
const TRANSIENT = new Set(["screen-analyzing"]); // 히스토리에 안 남길 화면

// ── 공통 질문 (상대 성향 + 나의 성향/심리) ─────
const PARTNER_Q = {
  id: "partner",
  title: "상대는 평소 연락·감정 표현이 어떤 편인가요?",
  options: [
    { v: "expressive", label: "표현이 풍부하고 일관돼요", note: "안정형에 가까움" },
    { v: "inconsistent", label: "들쭉날쭉, 기복이 있어요", note: "불안형에 가까움" },
    { v: "reserved", label: "표현이 적고 거리를 둬요", note: "회피형에 가까움" },
  ],
};
const SELF_ATTACH_Q = {
  id: "selfAttach",
  title: "갈등이나 불안한 상황에서 당신은 보통?",
  options: [
    { v: "secure", label: "비교적 담담하게 받아들여요", note: "안정형" },
    { v: "anxious", label: "불안해서 계속 확인하고 싶어요", note: "불안형" },
    { v: "avoidant", label: "거리를 두고 마음을 닫아요", note: "회피형" },
  ],
};
const SELF_URGENCY_Q = {
  id: "urgency",
  title: "지금 당신의 마음 상태에 가장 가까운 건?",
  options: [
    { v: "low", label: "차분하게 판단하고 싶어요" },
    { v: "mid", label: "초조하지만 참을 수 있어요" },
    { v: "high", label: "조급하고 안절부절못해요", note: "주의" },
  ],
};
// 자유서술 — AI 개인화의 핵심 입력 (선택)
const FREE_TEXT_Q = {
  id: "freeText",
  type: "text",
  title: "상황을 자유롭게 적어주세요",
  desc: "무슨 일이 있었는지, 무엇이 가장 고민인지 적을수록 AI가 더 맞춤으로 분석해요. (선택)",
  placeholder: "예) 일이 바빠서 소홀했고, 마지막에 크게 싸우고 헤어졌어요. 아직 많이 보고 싶은데 먼저 연락해도 될지 모르겠어요…",
};
const COMMON = [PARTNER_Q, SELF_ATTACH_Q, SELF_URGENCY_Q, FREE_TEXT_Q];

// ── 설문 정의 (상황별 분기) ───────────────────
const SURVEYS = {
  crush: [
    { id: "period", title: "알게 된 지 얼마나 됐나요?", options: [
      { v: "lt1m", label: "1개월 미만" },
      { v: "1to3m", label: "1~3개월" },
      { v: "3to6m", label: "3~6개월" },
      { v: "gt6m", label: "6개월 이상" },
    ]},
    { id: "trend", title: "요즘 둘의 연락 빈도는?", options: [
      { v: "increasing", label: "점점 늘어나요", note: "좋은 신호" },
      { v: "stable", label: "비슷하게 유지돼요" },
      { v: "decreasing", label: "점점 줄어들어요", note: "주의" },
    ]},
    { id: "warmth", title: "상대의 반응 온도는 어떤가요?", options: [
      { v: "hot", label: "적극적이에요 (먼저 연락·관심)" },
      { v: "warm", label: "호의적이에요" },
      { v: "lukewarm", label: "미적지근해요" },
      { v: "cold", label: "잘 모르겠어요 / 거리감" },
    ]},
    { id: "initiation", title: "연락은 주로 누가 먼저 하나요?", options: [
      { v: "partner_more", label: "상대가 더 자주 먼저", note: "강한 호감 신호" },
      { v: "balanced", label: "비슷해요" },
      { v: "me_more", label: "거의 내가 먼저", note: "일방적 주의" },
    ]},
    { id: "signals", title: "둘 사이 호감 신호(따로 만남·플러팅·스킨십)는?", options: [
      { v: "strong", label: "자주 있고 분위기도 좋아요" },
      { v: "some", label: "가끔 있어요" },
      { v: "weak", label: "거의 없어요" },
    ]},
    ...COMMON,
  ],

  dating: [
    { id: "period", title: "사귄 지 얼마나 됐나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ]},
    { id: "mood", title: "최근 관계 분위기는?", options: [
      { v: "better", label: "점점 좋아지고 있어요" },
      { v: "same", label: "비슷해요" },
      { v: "cooling", label: "식어가는 것 같아요", note: "주의" },
    ]},
    { id: "conflict", title: "최근 갈등이 있었나요?", options: [
      { v: "none", label: "거의 없어요" },
      { v: "minor", label: "작은 다툼이 있었어요" },
      { v: "serious", label: "큰 갈등이 있었어요" },
    ]},
    { id: "resolve", title: "갈등이 생기면 두 사람은?", options: [
      { v: "talk", label: "대화로 풀어가요", note: "건강한 신호" },
      { v: "avoid", label: "회피하거나 침묵해요" },
      { v: "explode", label: "감정이 폭발하곤 해요", note: "주의" },
    ]},
    { id: "future", title: "미래(여행·계획 등) 얘기는 어떤가요?", options: [
      { v: "yes", label: "자연스럽게 나눠요", note: "안정 신호" },
      { v: "sometimes", label: "가끔 나와요" },
      { v: "no", label: "거의 없거나 피해요", note: "주의" },
    ]},
    ...COMMON,
  ],

  breakup: [
    { id: "period", title: "사귄 기간은 얼마였나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ]},
    { id: "since", title: "헤어진 지 얼마나 됐나요?", options: [
      { v: "lt1w", label: "1주일 미만" },
      { v: "1to2w", label: "1~2주" },
      { v: "2to4w", label: "2~4주" },
      { v: "1to3m", label: "1~3개월" },
      { v: "gt3m", label: "3개월 이상" },
    ]},
    { id: "who", title: "누가 이별을 제안했나요?", options: [
      { v: "me", label: "내가 먼저" },
      { v: "partner", label: "상대가 먼저", note: "설득 난도 ↑" },
      { v: "mutual", label: "서로 합의" },
    ]},
    { id: "reason", title: "이별의 핵심 이유는?", options: [
      { v: "conflict", label: "잦은 다툼" },
      { v: "drift", label: "권태 / 소원해짐" },
      { v: "personality", label: "성격 차이" },
      { v: "external", label: "환경 (거리·바쁨 등)", note: "회복 가능성 ↑" },
      { v: "other_person", label: "상대의 변심", note: "신중 필요" },
    ]},
    { id: "contact", title: "헤어진 후 지금 연락 상태는?", options: [
      { v: "none", label: "전혀 안 해요 (거리두기)" },
      { v: "occasional", label: "가끔 가벼운 연락" },
      { v: "frequent", label: "자주 연락해요" },
      { v: "fighting", label: "연락하다 또 다퉜어요", note: "주의" },
      { v: "blocked", label: "상대가 차단했어요", note: "거부 신호" },
    ]},
    { id: "newperson", title: "상대에게 새로운 사람이 있나요?", options: [
      { v: "none", label: "없는 것 같아요" },
      { v: "unknown", label: "잘 모르겠어요" },
      { v: "yes", label: "있는 것 같아요", note: "난도 ↑" },
    ]},
    ...COMMON,
  ],
};

// ── 요인(factor) 헬퍼 ─────────────────────────
// map: { key: [delta, "근거 라벨"] }
function addMap(factors, map, key) {
  const e = map[key];
  if (e && e[0] !== 0) factors.push({ label: e[1], delta: e[0] });
}
function sum(factors) { return factors.reduce((t, f) => t + f.delta, 0); }
const clamp = (n) => Math.max(3, Math.min(97, Math.round(n)));

// ── 진단 디스패치 ─────────────────────────────
function diagnose(stage, a) {
  let res;
  if (stage === "crush") res = diagnoseCrush(a);
  else if (stage === "dating") res = diagnoseDating(a);
  else res = diagnoseBreakup(a);
  res.plan = makePlan(stage, res.score, a); // 언제·어떻게 연락 플랜
  return res;
}

// ══════════════ 연락 플랜 — 언제·어떻게 ══════════════
// 점수 구간 + 핵심 상황 변수로 "추천 시점 + 수단 + 단계별 순서"를 생성
function makePlan(stage, score, a) {
  const tier = score >= 65 ? "high" : score >= 45 ? "mid" : "low";
  if (stage === "crush") return planCrush(tier);
  if (stage === "dating") return planDating(tier);
  return planBreakup(tier, a);
}

function planBreakup(tier, a) {
  if (a.contact === "blocked") {
    return {
      when: "지금은 연락하지 마세요", tone: "bad",
      channel: "모든 연락 중단",
      steps: [
        { time: "지금", action: "카톡·전화·SNS·지인 경유 등 모든 접근을 멈추세요." },
        { time: "충분한 시간 뒤 (차단 해제 시)", action: "아주 가벼운 안부부터 천천히 재고하세요." },
      ],
    };
  }
  const tooSoon = a.since === "lt1w" || a.since === "1to2w";
  if (tier === "high") return {
    when: "오늘~3일 내가 첫 연락 적기", tone: "good",
    channel: "카카오톡 — 가벼운 안부 한 통",
    steps: [
      { time: "오늘~3일 내", action: "재회 얘기는 빼고, 부담 없는 안부 한 통만 보내세요." },
      { time: "답이 따뜻하면 +2~3일", action: "낮 시간·짧은 만남을 가볍게 제안하세요." },
      { time: "만남 이후", action: "말보다 달라진 모습으로 신뢰를 회복하고, 속도는 천천히." },
      { time: "무응답·냉담할 때", action: "연달아 보내지 말고 최소 1~2주 기다린 뒤 재평가하세요." },
    ],
  };
  if (tier === "mid") return {
    when: tooSoon ? "지금은 일러요 — 2~3주 더 기다린 뒤" : "2~3주 더 거리를 둔 뒤", tone: "warn",
    channel: "지금은 보류 → 이후 카톡 안부",
    steps: [
      { time: "지금~2주", action: "연락을 멈추고 나를 회복하며 이별 원인을 복기하세요." },
      { time: "2~3주 후", action: "가벼운 안부 한 통으로 상대 반응을 테스트하세요." },
      { time: "반응이 좋으면", action: "대화를 조금씩 늘리며 자연스럽게 접점을 회복하세요." },
    ],
  };
  return {
    when: "지금은 연락하지 마세요", tone: "bad",
    channel: "무연락 유지",
    steps: [
      { time: "지금~최소 3~4주", action: "무연락을 유지하고 일상·멘탈 회복을 최우선으로." },
      { time: "한 달 뒤", action: "미련인지 사랑인지 점검한 후 다시 진단해 보세요." },
    ],
  };
}

function planCrush(tier) {
  if (tier === "high") return {
    when: "이번 주 안이 고백 적기", tone: "good",
    channel: "직접 만남 또는 통화",
    steps: [
      { time: "2~3일 내", action: "둘만의 편안한 자리를 만드세요." },
      { time: "그 자리에서", action: "부담 낮은 말로 솔직하게 마음을 전하세요." },
      { time: "고백 후", action: "답을 재촉하지 말고 상대의 시간을 존중하세요." },
    ],
  };
  if (tier === "mid") return {
    when: "1~2주 더 가까워진 뒤", tone: "warn",
    channel: "카카오톡 — 만남 제안 먼저",
    steps: [
      { time: "이번 주", action: "둘만의 만남을 자연스럽게 제안하세요." },
      { time: "만남에서", action: "가벼운 관심 표현으로 상대 반응을 확인하세요." },
      { time: "호감 신호가 늘면", action: "그때 고백 타이밍을 다시 진단하세요." },
    ],
  };
  return {
    when: "지금은 고백을 보류하세요", tone: "bad",
    channel: "가벼운 일상 공유 유지",
    steps: [
      { time: "당분간", action: "편한 접점은 유지하되 내 연락 비중을 줄이세요." },
      { time: "상대가 다가오면", action: "그때 관계 진전을 고려하세요." },
    ],
  };
}

function planDating(tier) {
  if (tier === "high") return {
    when: "가까운 데이트 때 가볍게", tone: "good",
    channel: "직접 — 얼굴 보고",
    steps: [
      { time: "다음 만남", action: "고마움·애정을 구체적으로 표현하세요." },
      { time: "평소", action: "둘만의 정기 루틴(데이트·대화)을 유지하세요." },
    ],
  };
  if (tier === "mid") return {
    when: "이번 주말 등 차분한 시점에", tone: "warn",
    channel: "직접 — 감정이 가라앉은 때",
    steps: [
      { time: "차분한 자리에서", action: "‘요즘 우리 어때?’ 열린 질문으로 대화를 시작하세요." },
      { time: "대화 중", action: "비난 없이 내 마음을 ‘나 전달법’으로 전하세요." },
      { time: "이후", action: "함께 웃는 작은 경험을 의도적으로 늘리세요." },
    ],
  };
  return {
    when: "빠른 시일 내 점검 대화", tone: "bad",
    channel: "직접 — 진솔한 자리",
    steps: [
      { time: "곧", action: "회피하지 말고 관계 상태를 솔직히 점검하세요." },
      { time: "대화에서", action: "상대의 의지를 확인하세요 (혼자 끌고 가지 않기)." },
      { time: "결과에 따라", action: "관계 유지가 나를 해친다면 거리도 선택지입니다." },
    ],
  };
}

// ══════════════ 썸 — 고백 적정도 ══════════════
function diagnoseCrush(a) {
  const f = [];
  addMap(f, { increasing: [16, "연락이 점점 느는 중 (관심↑)"], stable: [3, "연락 빈도 안정적"], decreasing: [-16, "연락이 줄어드는 중 (관심↓ 신호)"] }, a.trend);
  addMap(f, { hot: [22, "상대 반응이 적극적"], warm: [11, "상대 반응이 호의적"], lukewarm: [-9, "반응이 미적지근"], cold: [-22, "반응이 모호·거리감"] }, a.warmth);
  addMap(f, { partner_more: [14, "상대가 더 자주 먼저 연락 (강한 호감)"], balanced: [6, "연락 주도권 균형"], me_more: [-12, "거의 나만 먼저 (일방적 위험)"] }, a.initiation);
  addMap(f, { strong: [14, "만남·플러팅 등 호감 신호 뚜렷"], some: [4, "호감 신호 약간 있음"], weak: [-12, "호감 신호가 거의 없음"] }, a.signals);
  addMap(f, { lt1m: [-9, "안 지 얼마 안 됨 (서로 정보 부족)"], "1to3m": [6, "서로 알아가기 좋은 시기"], "3to6m": [5, "충분히 알아가는 중"], gt6m: [-5, "장기 정체 (친구 프레임 위험)"] }, a.period);
  addMap(f, { expressive: [6, "상대가 안정형 (직진 OK)"], inconsistent: [0, ""], reserved: [-9, "상대가 회피형 (천천히)"] }, a.partner);
  addMap(f, { secure: [4, "나의 안정적 태도"], anxious: [-5, "나의 불안 성향"], avoidant: [-2, "나의 회피 성향"] }, a.selfAttach);
  addMap(f, { low: [4, "차분한 마음 상태"], mid: [0, ""], high: [-8, "조급함 (성급한 고백 위험)"] }, a.urgency);

  // 일방향 + 조급 → 매달림 위험
  const clingy = a.initiation === "me_more" && (a.urgency === "high" || a.selfAttach === "anxious");
  if (clingy) f.push({ label: "나만 달려가는 패턴 감지", delta: -6 });

  const score = clamp(50 + sum(f));
  const res = { scoreTitle: "고백 적정도", score, factors: f };

  if (score >= 65) {
    res.reason = "상대의 호감 신호와 관계 흐름이 충분히 무르익었어요. 더 미루면 오히려 ‘편한 사람’ 프레임에 갇힐 수 있습니다.";
    res.actions = [
      { t: "가까운 시일 내 자연스러운 고백", d: "거창한 이벤트보다 둘만의 편안한 자리에서 진심을 전하세요." },
      { t: "직접 또는 통화로", d: "썸 단계 고백은 텍스트보다 표정·목소리가 전달되는 채널이 성공률이 높아요." },
      { t: "부담 낮은 프레이밍", d: "‘부담 주려는 건 아닌데’로 시작해 상대의 퇴로를 열어두세요." },
    ];
    res.risks = ["과한 이벤트·선물은 부담이 될 수 있어요.", "고백 후 답을 재촉하지 마세요."];
    res.msgLabel = "고백 운 떼기 예시";
    res.msg = "요즘 너랑 얘기하는 시간이 제일 편하고 좋더라.\n부담 주려는 건 아닌데, 나는 너를 좀 더 알아가고 싶어.\n이번 주에 둘이 따로 한번 볼래?";
  } else if (score >= 45) {
    res.reason = "호감의 씨앗은 있지만 확신을 주기엔 신호가 약해요. 지금 고백은 도박입니다. 1~2주 더 ‘함께한 경험’을 쌓으세요.";
    res.actions = [
      { t: "고백보다 ‘만남 제안’ 먼저", d: "둘만의 시간을 늘려 호감 온도를 끌어올리세요." },
      { t: "상대 반응 테스트", d: "가벼운 관심 표현에 어떻게 반응하는지 관찰하세요." },
      { t: "연락 리듬 맞추기", d: "내가 과하게 주도하기보다 상호 빈도를 맞추세요." },
    ];
    res.risks = ["조급한 고백은 관계를 어색하게 만들 수 있어요.", "혼자 확신을 키우는 ‘과대 해석’을 경계하세요."];
    res.msgLabel = "만남 제안 예시";
    res.msg = "지난번에 가보고 싶다던 그 카페 있잖아.\n이번 주말에 같이 갈래? 가서 더 얘기하자";
  } else {
    res.reason = "지금은 고백 타이밍이 아니에요. 상대 신호가 약하거나 정보가 부족합니다. 무리한 고백은 관계 자체를 잃게 할 수 있어요.";
    res.actions = [
      { t: "관계의 기반부터", d: "‘편한 사람’에서 ‘설레는 사람’으로 인식을 바꿀 경험이 먼저예요." },
      { t: "거리 두며 관찰", d: "내 연락 비중을 줄이고 상대가 다가오는지 확인하세요." },
      { t: "다른 가능성도 열기", d: "한 사람에게 모든 걸 걸지 않는 것이 건강합니다." },
    ];
    res.risks = ["답 없는 호감에 집착하면 본인이 가장 힘들어져요.", "상대가 거리를 두면 그 신호를 존중하세요."];
    res.msgLabel = "지금은 고백 메시지보다";
    res.hold = "지금은 고백 문구를 보내기보다, 가벼운 일상 공유로 ‘편안한 접점’을 유지하는 단계예요. 무리한 직진은 권하지 않습니다.";
  }
  if (clingy) res.risks.unshift("나만 주도하고 있어요. 연락 빈도를 의식적으로 줄여 상대의 자발성을 확인하세요.");
  return res;
}

// ══════════════ 연애 중 — 관계 안정도 ══════════════
function diagnoseDating(a) {
  const f = [];
  addMap(f, { better: [14, "관계 분위기 상승 중"], same: [0, ""], cooling: [-20, "관계가 식어가는 신호"] }, a.mood);
  addMap(f, { none: [6, "최근 갈등 거의 없음"], minor: [-4, "작은 다툼 있었음"], serious: [-16, "큰 갈등 있었음"] }, a.conflict);
  addMap(f, { talk: [10, "대화로 갈등 해결 (건강)"], avoid: [-8, "갈등 회피·침묵 (누적 위험)"], explode: [-12, "감정 폭발형 갈등 (상처 누적)"] }, a.resolve);
  addMap(f, { yes: [10, "미래를 함께 그림 (안정)"], sometimes: [2, "미래 얘기 가끔"], no: [-10, "미래 얘기 회피 (거리감)"] }, a.future);
  addMap(f, { lt3m: [-2, "아직 초기 (조율 중)"], "3to12m": [4, "안정기 진입"], "1to3y": [3, "관계의 깊이 있음"], gt3y: [0, ""] }, a.period);
  addMap(f, { expressive: [5, "상대가 안정형"], inconsistent: [-2, "상대 표현 기복"], reserved: [-6, "상대가 회피형"] }, a.partner);
  addMap(f, { secure: [5, "나의 안정적 태도"], anxious: [-5, "나의 불안 성향 (과한 확인 위험)"], avoidant: [-2, "나의 회피 성향"] }, a.selfAttach);
  addMap(f, { low: [4, "차분한 마음 상태"], mid: [0, ""], high: [-6, "조급·불안한 마음 상태"] }, a.urgency);

  const anxiousClingy = a.selfAttach === "anxious" || a.urgency === "high";
  const score = clamp(58 + sum(f));
  const res = { scoreTitle: "관계 안정도", score, factors: f };

  if (score >= 65) {
    res.reason = "관계는 비교적 안정적이에요. 불안의 상당 부분은 실제 위기보다 해석에서 옵니다. 큰 변화보다 ‘유지’에 집중하세요.";
    res.actions = [
      { t: "감사·인정 표현 늘리기", d: "좋을 때의 작은 표현이 안정성을 더 키웁니다." },
      { t: "불안은 솔직하게, 추궁은 금지", d: "신경 쓰이는 점은 비난 없이 ‘나 전달법’으로 말하세요." },
      { t: "둘만의 루틴 만들기", d: "정기적인 데이트·대화 시간이 관계를 단단하게 합니다." },
    ];
    res.risks = ["불안을 자주 ‘확인 질문’으로 풀면 상대가 지칠 수 있어요."];
    res.msgLabel = "마음 표현 예시";
    res.msg = "요즘 바빠서 자주 못 봤는데 그래도 네 생각 많이 했어.\n이번 주에 짧게라도 얼굴 보자. 보고 싶어서";
  } else if (score >= 45) {
    res.reason = "약한 경고 신호가 있어요. 방치하면 거리감이 굳어집니다. 지금이 대화로 풀 적기예요.";
    res.actions = [
      { t: "비난 없는 솔직한 대화", d: "‘요즘 우리 어때?’ 같은 열린 질문으로 상대 입장을 먼저 들으세요." },
      { t: "원인 분리", d: "상대 문제인지, 내 불안인지 구분해야 올바른 해법이 나와요." },
      { t: "작은 긍정 경험 쌓기", d: "큰 담판보다 함께 웃는 시간을 의도적으로 늘리세요." },
    ];
    res.risks = ["감정이 격할 때의 대화는 갈등을 키워요. 차분할 때 시도하세요.", "‘식었어?’ 같은 단정형 질문은 피하세요."];
    res.msgLabel = "대화 열기 예시";
    res.msg = "요즘 우리 둘 다 정신없었던 것 같아.\n나는 너랑 더 가까이 지내고 싶어서, 주말에 천천히 얘기하면서 시간 보내고 싶어.";
  } else {
    res.reason = "관계에 분명한 위기 신호가 있어요. 지금 필요한 건 ‘더 잘하기’가 아니라 솔직한 점검 대화입니다.";
    res.actions = [
      { t: "회피 말고 직면", d: "불편해도 관계 상태에 대해 진솔하게 이야기할 자리를 만드세요." },
      { t: "상대 마음 확인", d: "내 노력만으로 끌고 가려 말고 상대의 의지를 확인하세요." },
      { t: "나를 지키는 선도 준비", d: "관계 유지가 나를 갉아먹는다면 그것도 신호입니다." },
    ];
    res.risks = ["불안에서 나오는 과한 집착·확인은 상황을 악화시켜요.", "혼자 매달리는 관계는 건강하지 않습니다."];
    res.msgLabel = "점검 대화 제안 예시";
    res.msg = "요즘 너와 나 사이가 예전 같지 않게 느껴져.\n탓하려는 게 아니라, 우리가 어떤 상태인지 솔직하게 한번 얘기하고 싶어.";
  }
  if (anxiousClingy) res.risks.unshift("불안이 큰 상태예요. 확인·추궁은 줄이고, 내 감정을 ‘나 전달법’으로 차분히 표현하는 데 집중하세요.");
  return res;
}

// ══════════════ 이별 후 — 재회 시도 적정도 ══════════════
function diagnoseBreakup(a) {
  const f = [];
  addMap(f, { lt1w: [-24, "이별 직후 — 감정이 안 식음"], "1to2w": [-10, "아직 감정 정리 전"], "2to4w": [10, "감정이 가라앉는 시기"], "1to3m": [17, "감정 정리에 적절한 시간 경과"], gt3m: [3, "시간이 꽤 지남"] }, a.since);
  addMap(f, { me: [8, "내가 이별을 주도 (주도권 있음)"], partner: [-12, "상대가 떠남 (설득 난도↑)"], mutual: [1, "서로 합의 이별"] }, a.who);
  addMap(f, { conflict: [-4, "잦은 다툼이 원인"], drift: [-8, "권태·소원함이 원인 (회복 난도↑)"], personality: [-10, "성격 차이가 원인 (구조적)"], external: [13, "환경적 이유 (회복 가능성↑)"], other_person: [-16, "상대 변심 (난도 매우 높음)"] }, a.reason);
  addMap(f, { none: [6, "깔끔한 거리두기 중"], occasional: [3, "가벼운 연락 유지"], frequent: [-8, "과한 연락 (여유 없어 보임)"], fighting: [-20, "재연락이 다툼으로 (악순환)"], blocked: [-35, "상대가 차단함 (명확한 거부)"] }, a.contact);
  addMap(f, { none: [4, "새로운 사람 없는 듯"], unknown: [0, ""], yes: [-18, "상대에게 새로운 사람 (현실적 난도↑)"] }, a.newperson);
  addMap(f, { lt3m: [-4, "짧았던 관계"], "3to12m": [2, "어느 정도 쌓인 관계"], "1to3y": [5, "깊이 있는 관계"], gt3y: [4, "오래된 관계"] }, a.period);
  addMap(f, { expressive: [5, "상대가 안정형"], inconsistent: [-2, "상대 표현 기복"], reserved: [-10, "상대가 회피형 (공간 더 필요)"] }, a.partner);
  addMap(f, { secure: [5, "나의 안정적 태도 (건강한 재접촉 가능)"], anxious: [-6, "나의 불안 성향 (매달릴 위험)"], avoidant: [-2, "나의 회피 성향"] }, a.selfAttach);
  addMap(f, { low: [6, "차분한 마음 상태 (좋은 신호)"], mid: [0, ""], high: [-10, "조급함 (역효과 위험)"] }, a.urgency);

  const tooSoon = a.since === "lt1w" || a.since === "1to2w";
  const clingy = (a.urgency === "high" || a.selfAttach === "anxious") && (a.contact === "frequent" || a.contact === "fighting");
  if (clingy) f.push({ label: "불안 + 과한 연락 패턴 (매달림 위험)", delta: -8 });

  let score = clamp(50 + sum(f));
  // 강한 거부 신호는 점수 상한 적용
  if (a.contact === "blocked") score = Math.min(score, 20);

  const res = { scoreTitle: "재회 시도 적정도", score, factors: f };

  if (a.contact === "blocked") {
    // 차단 = 특수 처리 (점수 무관하게 멈춤 가이드)
    res.reason = "상대가 차단했다는 건 ‘지금은 연락받고 싶지 않다’는 명확한 의사 표시예요. 우회 연락이나 반복 시도는 재회 확률을 높이지 못하고, 관계를 더 닫고 당신에게 부정적 인상만 남깁니다.";
    res.actions = [
      { t: "지금은 멈추고 거리 두기", d: "차단 상태에서의 모든 접근은 역효과예요. 시간을 두고 나를 회복하는 데 집중하세요." },
      { t: "우회 연락 절대 금지", d: "다른 계정·지인·SNS를 통한 접근은 스토킹으로 비칠 수 있어요." },
      { t: "충분한 시간 뒤 재평가", d: "한참 후 차단이 풀린다면, 그때 가벼운 안부부터 아주 천천히 고려하세요." },
    ];
    res.risks = ["반복·우회 연락은 스토킹으로 비칠 수 있어요. 절대 금물.", "상대의 명확한 거부 의사를 존중하는 것이 가장 품위 있는 선택입니다.", "당신의 회복과 일상이 지금 가장 중요합니다."];
    res.msgLabel = "지금은 메시지를 보내지 마세요";
    res.hold = "지금 어떤 메시지도, 어떤 경로로도 보내지 마세요. 차단은 분명한 신호예요. 연락하고 싶은 충동이 들면 보내는 대신 그 마음을 메모로만 남겨두세요.";
    return res;
  }

  const otherPerson = a.newperson === "yes";
  if (score >= 65) {
    res.reason = "재회를 시도하기 좋은 흐름이에요. 충분한 시간이 흘렀고 회복 가능한 상황입니다. 단, 매달림이 아닌 ‘가벼운 재접촉’으로 시작하세요.";
    res.actions = [
      { t: "부담 없는 안부로 재접촉", d: "재회 얘기를 꺼내지 말고 가벼운 일상 안부 한 통으로 문을 여세요." },
      { t: "달라진 모습 보여주기", d: "이별 사유였던 부분의 변화를 ‘말’이 아닌 ‘모습’으로 보여주세요." },
      { t: "상대 반응에 맞춰 속도 조절", d: "답이 따뜻하면 한 걸음, 미지근하면 다시 기다리세요." },
    ];
    res.risks = ["첫 연락에 ‘다시 만나자’는 금물 — 부담으로 닫혀요.", "답이 늦거나 차가워도 연달아 보내지 마세요."];
    res.msgLabel = "가벼운 재접촉 예시";
    res.msg = "잘 지내지? 지나가다 우리 자주 가던 곳 보고 문득 생각나서.\n별 일 아니고, 그냥 잘 지내나 궁금했어.";
  } else if (score >= 45) {
    res.reason = "가능성은 있지만 지금 바로는 일러요. 감정이 정리될 시간과, 관계를 바꿀 변화가 더 필요합니다.";
    res.actions = [
      { t: "최소 연락 기간 더 유지", d: tooSoon ? "지금은 연락을 멈추고 서로 감정을 식히는 시간이 먼저예요." : "조급한 재접촉보다 2~3주 더 거리를 두세요." },
      { t: "이별 원인 복기", d: "무엇을 바꿀지 구체적으로 정리해야 재회가 의미 있어요." },
      { t: "나부터 회복", d: "내 일상과 멘탈이 안정돼야 매달리지 않는 연락이 가능해요." },
    ];
    res.risks = ["불안에 못 이긴 연락은 ‘아직 못 놓았구나’ 인상만 줘요.", "상대의 SNS 반복 확인·추궁은 금물입니다."];
    res.msgLabel = "지금 보낼 메시지보다";
    res.hold = "지금은 연락 문구를 다듬을 때가 아니라, 거리를 두고 나를 회복하며 ‘무엇을 바꿀지’ 정리할 시기예요. 2~3주 뒤 다시 진단해 보세요.";
  } else {
    res.reason = "지금 재회 시도는 권하지 않아요. 시간이 너무 이르거나 회복이 어려운 신호가 보입니다. 무리한 연락은 가능성을 더 닫습니다.";
    res.actions = [
      { t: "연락을 멈추고 거리 두기", d: "지금의 연락은 대부분 역효과예요. 나를 추스르는 데 집중하세요." },
      { t: "감정과 사실 분리", d: "‘다시 만나고 싶다’는 마음이 미련인지 사랑인지 시간을 두고 확인하세요." },
      { t: "상대의 의사 존중", d: "상대가 거리를 원하면 그 결정을 존중하는 것이 가장 품위 있는 선택이에요." },
    ];
    res.risks = ["반복 연락·집착은 스토킹으로 비칠 수 있어요. 절대 금물.", "상대가 명확히 거부하면 더는 시도하지 마세요. 당신의 회복이 우선입니다."];
    res.msgLabel = "지금은 메시지를 보내지 마세요";
    res.hold = "지금 어떤 메시지도 재회 확률을 높이지 못해요. 오히려 닫힌 문을 더 잠급니다. 연락 충동이 들면 보내는 대신 그 마음을 기록만 해두세요.";
  }
  if (otherPerson) res.risks.unshift("상대에게 새로운 사람이 있다면, 끼어드는 연락은 역효과예요. 거리를 두고 상황을 지켜보세요.");
  if (clingy) res.risks.unshift("불안에 떠밀린 잦은 연락이 감지돼요. 지금은 연락을 멈추고 나를 회복하는 것이 최우선입니다.");
  return res;
}

// ══════════════ Mock AI 개인화 레이어 ══════════════
// ※ 실제 제품에서는 이 자리에 Claude API 호출이 들어간다.
//   (docs/product/ai-personalization.md §10) 점수·요인은 규칙 엔진이
//   그대로 결정하고, AI는 자유서술을 반영해 '문장'만 개인화한다.
const THEMES = [
  { keys: ["싸웠", "다퉜", "싸움", "말다툼", "화났", "화내", "다툼"], label: "다툼으로 끝난 마지막", tip: "재접촉 땐 변명보다, 그때 상대가 느꼈을 감정을 짧게 인정하는 한마디가 더 효과적이에요." },
  { keys: ["바빠", "바빴", "바쁨", "일이", "직장", "회사", "시험", "취업", "야근"], label: "바빠서 소홀했던 상황", tip: "‘환경 때문이었다’는 점을 강조하기보다, 달라진 모습을 행동으로 보여주는 편이 설득력 있어요." },
  { keys: ["보고싶", "보고 싶", "그리워", "그립", "생각나", "생각이"], label: "여전히 큰 그리움", tip: "그리움이 클수록 연락이 급해지기 쉬워요. 보내기 전 한 번 더, ‘지금이 적기인지’ 점수를 신뢰하세요." },
  { keys: ["미안", "잘못", "후회", "내 탓"], label: "미안함·후회", tip: "사과는 짧고 구체적으로. 길고 반복되는 사과는 오히려 부담이 돼요." },
  { keys: ["새로운", "다른 사람", "새 사람", "썸", "환승"], label: "상대의 새로운 인연 가능성", tip: "끼어드는 연락은 역효과예요. 거리를 두고 내 일상을 회복하는 데 집중하세요." },
  { keys: ["멀리", "장거리", "이사", "유학", "지방", "해외"], label: "물리적 거리 문제", tip: "거리는 환경적 요인이라 회복 여지가 있어요. 다만 만남 빈도에 대한 현실적 합의가 필요해요." },
  { keys: ["읽씹", "답장", "안 읽", "씹", "연락이 없", "답이 없"], label: "연락 단절·읽씹", tip: "답이 없을 땐 연달아 보내지 마세요. 한 번의 가벼운 안부 후 충분히 기다리는 것이 원칙이에요." },
  { keys: ["불안", "초조", "집착", "확인", "매달"], label: "커진 불안감", tip: "불안에서 나온 행동은 대부분 역효과예요. 보내고 싶은 충동은 메모로 옮겨두고 하루 묵혀보세요." },
];

function personalize(d, rawText) {
  const text = (rawText || "").trim();
  d.aiApplied = false;
  if (text.length < 4) return d;

  const found = [];
  for (const t of THEMES) {
    if (t.keys.some((k) => text.includes(k))) found.push(t);
    if (found.length >= 3) break;
  }
  if (!found.length) {
    // 키워드 미감지 — 그래도 개인화 시도했음을 표시
    d.aiApplied = true;
    d.aiConsiderations = [{ label: "직접 적어주신 맥락", tip: "적어주신 상황을 진단 해석에 반영했어요. 더 구체적으로 적을수록 맞춤도가 높아져요." }];
    return d;
  }

  d.aiApplied = true;
  d.aiConsiderations = found.map((t) => ({ label: t.label, tip: t.tip }));
  // 개인화된 근거 한 줄 덧붙이기 (점수는 그대로)
  d.reason = `적어주신 내용에서 ‘${found[0].label}’이 핵심 변수로 보여요. ` + d.reason;
  return d;
}

// ══════════════ 상대 메시지 해석 (Mock) ══════════════
// ※ 실제 제품에서는 Claude가 문맥까지 읽어 분석한다.
//   여기서는 키워드·문체 신호로 온도/속마음을 추정하는 데모.
function analyzeMessage(raw) {
  const t = (raw || "").trim();
  let temp = 50;
  const pos = [], neg = [];

  if (t.length >= 40) { temp += 8; pos.push("답장이 길어요 — 신경 써서 쓴 흔적"); }
  else if (t.length <= 6) { temp -= 12; neg.push("답장이 매우 짧아요 — 대화에 소극적"); }

  if (/[ㅎ]{2,}|[ㅋ]{2,}|😊|🥰|❤|♥|💕|😆|ㅠ|ㅜ/.test(t)) { temp += 12; pos.push("웃음·이모티콘 — 긴장이 풀린 편안한 톤"); }
  if (/!/.test(t)) { temp += 5; pos.push("느낌표 — 감정이 살아 있는 표현"); }
  if (/\?/.test(t)) { temp += 10; pos.push("되물음(질문) — 대화를 이어가려는 신호"); }
  if (/(만나|볼래|보자|언제|시간\s?돼|약속|놀자|밥|커피|영화|보고싶|보고\s?싶)/.test(t)) { temp += 14; pos.push("만남·시간 언급 — 관계 진전에 열려 있음"); }
  if (/(그리워|좋아|고마워|미안|사랑|잘 ?지내)/.test(t)) { temp += 10; pos.push("감정·안부 표현 — 마음이 남아 있을 가능성"); }

  if (/(바빠|바쁨|바빠서|나중에|다음에|글쎄|모르겠|생각\s?좀|생각해|힘들|미안한데|어렵|곤란)/.test(t)) { temp -= 16; neg.push("보류·거리두기 표현 — 지금은 신중한 태도"); }
  if (/^(ㅇㅇ|ㅇㅋ|응|그래|어|ok|넵|네|ㅇ)\.?$/i.test(t)) { temp -= 20; neg.push("단답 — 적극적이지 않거나 감정을 아끼는 중"); }
  if (t.length < 16 && /\.$/.test(t) && !/[?!ㅎㅋ~]/.test(t)) { temp -= 6; neg.push("마침표로 끝나는 짧은 답 — 다소 사무적인 톤"); }

  temp = Math.max(6, Math.min(94, Math.round(temp)));
  const tone = temp >= 62 ? "good" : temp >= 42 ? "warn" : "bad";
  const label = temp >= 62 ? "따뜻한 편이에요" : temp >= 42 ? "미지근해요" : "차가운 편이에요";

  // 속마음 해석
  const reads = [];
  if (pos.length) reads.push(...pos.map((p) => ({ kind: "pos", text: p })));
  if (neg.length) reads.push(...neg.map((n) => ({ kind: "neg", text: n })));
  if (!reads.length) reads.push({ kind: "neutral", text: "특별한 신호가 약해요. 톤만으로는 단정하기 어려운 중립적 메시지예요." });

  // 한 줄 요약
  let summary;
  if (tone === "good") summary = "관심과 호의가 느껴져요. 자연스럽게 한 걸음 더 다가가도 좋아요.";
  else if (tone === "warn") summary = "나쁘진 않지만 확신을 주는 단계는 아니에요. 부담 주지 말고 가볍게 이어가세요.";
  else summary = "지금은 거리를 두고 싶어하는 신호가 보여요. 밀어붙이기보다 여유를 두세요.";

  // 추천 답장
  let replies;
  if (tone === "good") replies = ["오 좋아. 그럼 이번 주 중에 시간 맞춰서 보자. 언제가 편해?"];
  else if (tone === "warn") replies = ["그래, 바쁜 거 알지. 여유 생기면 가볍게 보자. 무리하지 말고."];
  else replies = ["응 알겠어, 편할 때 연락 줘", "(지금은 답장을 서두르기보다 충분히 기다리는 편이 좋아요.)"];

  return { temp, tone, label, summary, reads, replies };
}

// 캡처만 올린 경우의 데모용 결과 (실제 제품은 Claude Vision이 읽음)
function demoImageResult() {
  return {
    temp: 55, tone: "warn", label: "데모",
    summary: "캡처를 첨부해 주셨어요. 데모 버전에서는 이미지 속 대화를 직접 읽지 못해 예시 결과만 보여드립니다.",
    reads: [{ kind: "neutral", text: "실제 서비스에서는 Claude가 캡처 속 대화 내용·말투·답장 간격까지 읽어 온도와 속마음을 분석합니다." }],
    replies: ["(캡처 자동 분석은 실제 서비스에서 제공됩니다.)"],
    demo: true,
  };
}

function renderMsgReport(r, imageData) {
  const color = r.tone === "good" ? "var(--good)" : r.tone === "warn" ? "var(--warn)" : "var(--bad)";
  const readsHtml = r.reads.map((x) => {
    const sign = x.kind === "pos" ? "▲" : x.kind === "neg" ? "▼" : "·";
    return `<li class="factor-item ${x.kind === "pos" ? "pos" : x.kind === "neg" ? "neg" : ""}">
      <span class="factor-sign">${sign}</span><span class="factor-label">${x.text}</span></li>`;
  }).join("");
  const repliesHtml = r.replies.map((m) => `<div class="msg-bubble">${m}</div>`).join("");

  const imageHtml = imageData
    ? `<div class="report-card">
        <p class="card-label">첨부한 캡처</p>
        <img class="msg-shot" src="${imageData}" alt="첨부한 카톡 캡처" />
        <p class="ai-foot">실제 서비스에서는 Claude가 이 캡처를 직접 읽고 분석합니다.</p>
      </div>`
    : "";

  document.getElementById("msgReport").innerHTML = `
    ${imageHtml}
    <div class="report-card score-card">
      <p class="score-title">상대 메시지 온도</p>
      <div class="temp-gauge"><div class="temp-marker" id="tempMarker" style="left:0%"></div></div>
      <div class="temp-scale"><span>차가움</span><span>미지근</span><span>따뜻함</span></div>
      <span class="score-badge" style="color:${color};background:${color}1a; margin-top:14px">${r.temp}°  ·  ${r.label}</span>
      <p class="score-reason">${r.summary}</p>
    </div>
    <div class="report-card">
      <p class="card-label">속마음 신호</p>
      <ul class="factor-list">${readsHtml}</ul>
    </div>
    <div class="report-card msg-card">
      <p class="card-label">추천 답장</p>
      ${repliesHtml}
    </div>`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const m = document.getElementById("tempMarker");
    if (m) m.style.left = `calc(${r.temp}% - 9px)`;
  }));
}

function runMessageAnalysis() {
  const input = document.getElementById("msgInput");
  const hint = document.getElementById("msgHint");
  const text = (input.value || "").trim();
  if (text.length < 4 && !msgImageData) {
    hint.textContent = "메시지를 입력하거나 카톡 캡처를 올려주세요.";
    return;
  }
  hint.textContent = "";
  const r = text.length >= 4 ? analyzeMessage(text) : demoImageResult();
  renderMsgReport(r, msgImageData);
  showScreen("screen-msgresult");
}

// ── 캡처 이미지 업로드 ────────────────────────
function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => { msgImageData = e.target.result; renderImagePreview(); };
  reader.readAsDataURL(file);
}
function renderImagePreview() {
  const prompt = document.getElementById("uploadPrompt");
  const preview = document.getElementById("uploadPreview");
  const img = document.getElementById("msgImagePreview");
  if (!prompt || !preview) return;
  if (msgImageData) {
    img.src = msgImageData;
    prompt.hidden = true; preview.hidden = false;
  } else {
    prompt.hidden = false; preview.hidden = true; img.removeAttribute("src");
  }
}
function resetMessageInput() {
  msgImageData = null;
  const ta = document.getElementById("msgInput"); if (ta) ta.value = "";
  const hint = document.getElementById("msgHint"); if (hint) hint.textContent = "";
  const fi = document.getElementById("msgImageInput"); if (fi) fi.value = "";
  renderImagePreview();
}

// ══════════════ 결과 이미지 공유 ══════════════
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; }
    else line = test;
  }
  ctx.fillText(line, x, y);
  return y;
}

async function shareResult() {
  if (!lastDiag) return;
  const d = lastDiag;
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 배경
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fdeef1"); bg.addColorStop(1, "#f1edfc");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 카드
  ctx.fillStyle = "#ffffff"; roundRect(ctx, 80, 130, 920, 1090, 48); ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#2a2438"; ctx.font = '700 52px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText("Pacemaker", W / 2, 280);
  ctx.fillStyle = "#8a8398"; ctx.font = '500 30px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText("AI 연애 컨설팅", W / 2, 330);

  ctx.fillStyle = "#8a8398"; ctx.font = '700 36px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText(d.scoreTitle, W / 2, 470);

  // 점수 링
  const color = d.score >= 65 ? "#2fa66b" : d.score >= 45 ? "#e0902f" : "#d65b58";
  const cx = W / 2, cy = 660, rad = 140;
  ctx.lineWidth = 36; ctx.lineCap = "round";
  ctx.strokeStyle = "#efe6e0";
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (d.score / 100)); ctx.stroke();
  ctx.fillStyle = color; ctx.font = '700 130px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText(d.score, cx, cy + 30);
  ctx.fillStyle = "#8a8398"; ctx.font = '500 34px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText("/ 100", cx, cy + 90);

  // 언제·어떻게 헤드라인
  ctx.fillStyle = "#c2455f"; ctx.font = '700 30px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText("언제·어떻게", cx, 930);
  ctx.fillStyle = color; ctx.font = '700 44px Pretendard, "Noto Sans KR", sans-serif';
  wrapText(ctx, d.plan.when, cx, 1000, 800, 56);

  // 푸터
  ctx.fillStyle = "#b8b0c2"; ctx.font = '500 28px Pretendard, "Noto Sans KR", sans-serif';
  ctx.fillText("내 연애 타이밍, 지금 진단받기", cx, 1160);

  const finish = (blob) => {
    const file = new File([blob], "pacemaker-result.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Pacemaker 진단 결과", text: "내 연애 타이밍 진단 결과" }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "pacemaker-result.png"; a.click();
      URL.revokeObjectURL(url);
    }
  };
  canvas.toBlob(finish, "image/png");
}

// ── 화면 전환 + 뒤로가기 ──────────────────────
function showScreen(id, isBack) {
  const cur = document.querySelector(".screen.is-active")?.id;
  if (!isBack && cur && cur !== id && !TRANSIENT.has(cur)) screenHistory.push(cur);
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
  document.getElementById(id).classList.add("is-active");
  const back = document.getElementById("backBtn");
  if (back) back.style.visibility =
    (id === "screen-landing" || id === "screen-analyzing") ? "hidden" : "visible";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  const cur = document.querySelector(".screen.is-active")?.id;
  // 설문 진행 중이면 이전 질문으로
  if (cur === "screen-survey" && state.qIndex > 0) {
    state.qIndex--;
    renderQuestion();
    return;
  }
  const prev = screenHistory.pop();
  showScreen(prev || "screen-landing", true);
}

// ── 설문 렌더링 ───────────────────────────────
function renderQuestion() {
  const survey = SURVEYS[state.stage];
  const q = survey[state.qIndex];
  const total = survey.length;

  document.getElementById("progressBar").style.width = `${(state.qIndex / total) * 100}%`;
  document.getElementById("qCount").textContent = `질문 ${state.qIndex + 1} / ${total}`;
  document.getElementById("qTitle").textContent = q.title;

  const box = document.getElementById("qOptions");
  box.innerHTML = "";

  // 자유서술(텍스트) 질문
  if (q.type === "text") {
    box.innerHTML = `
      <p class="q-desc">${q.desc || ""}</p>
      <textarea id="freeText" class="q-textarea" placeholder="${q.placeholder || ""}">${state.answers.freeText || ""}</textarea>
      <button class="btn btn-primary" id="btnFinish">AI 진단 받기</button>
      <button class="btn btn-ghost" id="btnSkip">건너뛰고 진단하기</button>`;
    box.querySelector("#btnFinish").onclick = () => {
      state.answers.freeText = box.querySelector("#freeText").value;
      runAnalysis();
    };
    box.querySelector("#btnSkip").onclick = () => {
      state.answers.freeText = "";
      runAnalysis();
    };
    return;
  }

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "q-option" + (state.answers[q.id] === opt.v ? " selected" : "");
    btn.innerHTML = opt.note
      ? `${opt.label}<span class="opt-note">${opt.note}</span>`
      : opt.label;
    btn.onclick = () => selectOption(q.id, opt.v);
    box.appendChild(btn);
  });
}

function selectOption(qid, value) {
  state.answers[qid] = value;
  renderQuestion();
  const survey = SURVEYS[state.stage];
  setTimeout(() => {
    if (state.qIndex < survey.length - 1) {
      state.qIndex++;
      renderQuestion();
    } else {
      runAnalysis();
    }
  }, 240);
}

// ── 분석 연출 → 리포트 ────────────────────────
function runAnalysis() {
  showScreen("screen-analyzing");
  document.getElementById("progressBar").style.width = "100%";
  const steps = [
    "데이터 정규화 중…",
    "애착 유형·관계 단계 매칭 중…",
    "타이밍 프레임워크 적용 중…",
    "추천 액션·메시지 생성 중…",
  ];
  let i = 0;
  const el = document.getElementById("analyzingStep");
  el.textContent = steps[0];
  const timer = setInterval(() => {
    i++;
    if (i < steps.length) el.textContent = steps[i];
    else {
      clearInterval(timer);
      const d = personalize(diagnose(state.stage, state.answers), state.answers.freeText);
      renderReport(d);
      showScreen("screen-report");
    }
  }, 620);
}

// ── 리포트 렌더링 ─────────────────────────────
function renderReport(d) {
  lastDiag = d;
  const color = d.score >= 65 ? "var(--good)" : d.score >= 45 ? "var(--warn)" : "var(--bad)";
  const badge = d.score >= 65 ? "지금이 좋은 타이밍" : d.score >= 45 ? "조금 더 준비가 필요" : "지금은 기다릴 때";
  const C = 2 * Math.PI * 52;
  const offset = C * (1 - d.score / 100);

  // 판단 근거: 영향 큰 순으로 상위 6개
  const topFactors = [...d.factors]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);
  const factorsHtml = topFactors.map((f) => {
    const pos = f.delta > 0;
    return `<li class="factor-item ${pos ? "pos" : "neg"}">
      <span class="factor-sign">${pos ? "▲" : "▼"}</span>
      <span class="factor-label">${f.label}</span>
      <span class="factor-delta">${pos ? "+" : ""}${f.delta}</span>
    </li>`;
  }).join("");

  const actionsHtml = d.actions.map((a, i) => `
    <li class="action-item">
      <span class="action-num">${i + 1}</span>
      <span class="action-body"><b>${a.t}</b><span>${a.d}</span></span>
    </li>`).join("");

  const risksHtml = d.risks.map((r) => `<li class="risk-item">${r}</li>`).join("");
  const msgHtml = d.hold
    ? `<div class="msg-hold">${d.hold}</div>`
    : `<div class="msg-bubble">${d.msg}</div>`;

  // 언제·어떻게 연락 플랜
  const p = d.plan;
  const planColor = p.tone === "good" ? "var(--good)" : p.tone === "warn" ? "var(--warn)" : "var(--bad)";
  const planHtml = `
    <div class="report-card plan-card">
      <p class="card-label">언제·어떻게 연락할까</p>
      <div class="plan-when" style="color:${planColor};background:${planColor}14">${p.when}</div>
      <div class="plan-channel"><span>추천 수단</span>${p.channel}</div>
      <ul class="plan-steps">
        ${p.steps.map((s) => `
          <li class="plan-step">
            <span class="plan-time">${s.time}</span>
            <span class="plan-action">${s.action}</span>
          </li>`).join("")}
      </ul>
    </div>`;

  // AI 개인화 카드 (자유서술 반영)
  const aiHtml = d.aiApplied
    ? `<div class="report-card ai-card">
        <p class="card-label ai-label">AI가 당신의 상황을 추가로 반영했어요</p>
        <ul class="ai-list">
          ${d.aiConsiderations.map((c) => `
            <li class="ai-item">
              <b>${c.label}</b>
              <span>${c.tip}</span>
            </li>`).join("")}
        </ul>
        <p class="ai-foot">실제 서비스에서는 이 부분을 Claude가 당신의 글을 읽고 실시간으로 작성합니다.</p>
      </div>`
    : "";

  document.getElementById("report").innerHTML = `
    <div class="report-card score-card">
      <p class="score-title">${d.scoreTitle}</p>
      <div class="ring-wrap">
        <svg width="160" height="160" viewBox="0 0 130 130">
          <circle class="ring-bg" cx="65" cy="65" r="52"></circle>
          <circle class="ring-fg" cx="65" cy="65" r="52"
            stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ringFg"></circle>
        </svg>
        <div class="ring-center">
          <span class="ring-score" style="color:${color}">${d.score}</span>
          <span class="ring-unit">/ 100</span>
        </div>
      </div>
      <span class="score-badge" style="color:${color};background:${color}1a">${badge}</span>
      <p class="score-reason">${d.reason}</p>
    </div>

    ${planHtml}

    ${aiHtml}

    <div class="report-card">
      <p class="card-label">이렇게 판단했어요</p>
      <ul class="factor-list">${factorsHtml}</ul>
    </div>

    <div class="report-card">
      <p class="card-label">추천 액션</p>
      <ul class="action-list">${actionsHtml}</ul>
    </div>

    <div class="report-card">
      <p class="card-label">이것만은 주의하세요</p>
      <ul class="risk-list">${risksHtml}</ul>
    </div>

    <div class="report-card msg-card">
      <p class="card-label">${d.msgLabel}</p>
      ${msgHtml}
    </div>
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById("ringFg").style.strokeDashoffset = offset;
    });
  });
}

// ── 리셋 ──────────────────────────────────────
function reset() { state.stage = null; state.qIndex = 0; state.answers = {}; }

// ── 이벤트 바인딩 ─────────────────────────────
document.addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  const stageBtn = e.target.closest("[data-stage]");

  if (action === "start") showScreen("screen-stage");
  else if (action === "back") goBack();
  else if (action === "home") { reset(); screenHistory.length = 0; showScreen("screen-landing", true); }
  else if (action === "restart") { reset(); screenHistory.length = 0; showScreen("screen-stage", true); }
  else if (action === "message") { resetMessageInput(); showScreen("screen-message"); }
  else if (action === "analyzeMsg") runMessageAnalysis();
  else if (action === "pickImage") document.getElementById("msgImageInput")?.click();
  else if (action === "removeImage") {
    msgImageData = null;
    const fi = document.getElementById("msgImageInput"); if (fi) fi.value = "";
    renderImagePreview();
  }
  else if (action === "share") shareResult();
  else if (stageBtn) {
    state.stage = stageBtn.dataset.stage;
    state.qIndex = 0;
    state.answers = {};
    renderQuestion();
    showScreen("screen-survey");
  }
});

// 캡처 파일 선택 시 미리보기
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "msgImageInput") handleImageFile(e.target.files[0]);
});
