// 규칙 기반 진단 엔진 (프로토타입 app.js 이식)
// 점수·플랜·근거는 결정적 규칙으로 계산 → 신뢰. (AI 개인화는 추후 결합)
import type { Stage } from "./survey";

export type Answers = Record<string, string>;
export interface Factor { label: string; delta: number; }
export interface Action { t: string; d: string; }
export interface PlanStep { time: string; action: string; }
export interface Plan { when: string; tone: "good" | "warn" | "bad"; channel: string; steps: PlanStep[]; }
export interface Diagnosis {
  scoreTitle: string;
  score: number;
  factors: Factor[];
  reason: string;
  actions: Action[];
  risks: string[];
  msgLabel: string;
  msg?: string;
  hold?: string;
  plan: Plan;
  needsSupport?: boolean; // 정서 위기 신호 → 상담 연결 노출
}

type Map = Record<string, [number, string]>;
function addMap(f: Factor[], map: Map, key: string) {
  const e = map[key];
  if (e && e[0] !== 0) f.push({ label: e[1], delta: e[0] });
}
const sum = (f: Factor[]) => f.reduce((t, x) => t + x.delta, 0);
const clamp = (n: number) => Math.max(3, Math.min(97, Math.round(n)));

export function diagnose(stage: Stage, a: Answers): Diagnosis {
  let res: Diagnosis;
  if (stage === "crush") res = diagnoseCrush(a);
  else if (stage === "dating") res = diagnoseDating(a);
  else res = diagnoseBreakup(a);
  res.plan = makePlan(stage, res.score, a);
  return res;
}

function diagnoseCrush(a: Answers): Diagnosis {
  const f: Factor[] = [];
  addMap(f, { increasing: [16, "연락이 점점 느는 중 (관심↑)"], stable: [3, "연락 빈도 안정적"], decreasing: [-16, "연락이 줄어드는 중 (관심↓ 신호)"] }, a.trend);
  addMap(f, { hot: [22, "상대 반응이 적극적"], warm: [11, "상대 반응이 호의적"], lukewarm: [-9, "반응이 미적지근"], cold: [-22, "반응이 모호·거리감"] }, a.warmth);
  addMap(f, { partner_more: [14, "상대가 더 자주 먼저 연락 (강한 호감)"], balanced: [6, "연락 주도권 균형"], me_more: [-12, "거의 나만 먼저 (일방적 위험)"] }, a.initiation);
  addMap(f, { strong: [14, "만남·플러팅 등 호감 신호 뚜렷"], some: [4, "호감 신호 약간 있음"], weak: [-12, "호감 신호가 거의 없음"] }, a.signals);
  addMap(f, { lt1m: [-9, "안 지 얼마 안 됨 (서로 정보 부족)"], "1to3m": [6, "서로 알아가기 좋은 시기"], "3to6m": [5, "충분히 알아가는 중"], gt6m: [-5, "장기 정체 (친구 프레임 위험)"] }, a.period);
  addMap(f, { expressive: [6, "상대가 안정형 (직진 OK)"], inconsistent: [0, ""], reserved: [-9, "상대가 회피형 (천천히)"] }, a.partner);
  addMap(f, { secure: [4, "나의 안정적 태도"], anxious: [-5, "나의 불안 성향"], avoidant: [-2, "나의 회피 성향"] }, a.selfAttach);
  addMap(f, { low: [4, "차분한 마음 상태"], mid: [0, ""], high: [-8, "조급함 (성급한 고백 위험)"] }, a.urgency);

  const clingy = a.initiation === "me_more" && (a.urgency === "high" || a.selfAttach === "anxious");
  if (clingy) f.push({ label: "나만 달려가는 패턴 감지", delta: -6 });

  const score = clamp(50 + sum(f));
  const res: Diagnosis = { scoreTitle: "고백 적정도", score, factors: f } as Diagnosis;

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
    res.msg = "지난번에 가보고 싶다던 그 카페 있잖아.\n이번 주말에 같이 갈래? 가서 더 얘기하자.";
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
  res.needsSupport = clingy && score < 45;
  return res;
}

function diagnoseDating(a: Answers): Diagnosis {
  const f: Factor[] = [];
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
  const res: Diagnosis = { scoreTitle: "관계 안정도", score, factors: f } as Diagnosis;

  if (score >= 65) {
    res.reason = "관계는 비교적 안정적이에요. 불안의 상당 부분은 실제 위기보다 해석에서 옵니다. 큰 변화보다 ‘유지’에 집중하세요.";
    res.actions = [
      { t: "감사·인정 표현 늘리기", d: "좋을 때의 작은 표현이 안정성을 더 키웁니다." },
      { t: "불안은 솔직하게, 추궁은 금지", d: "신경 쓰이는 점은 비난 없이 ‘나 전달법’으로 말하세요." },
      { t: "둘만의 루틴 만들기", d: "정기적인 데이트·대화 시간이 관계를 단단하게 합니다." },
    ];
    res.risks = ["불안을 자주 ‘확인 질문’으로 풀면 상대가 지칠 수 있어요."];
    res.msgLabel = "마음 표현 예시";
    res.msg = "요즘 바빠서 자주 못 봤는데 그래도 네 생각 많이 했어.\n이번 주에 짧게라도 얼굴 보자. 보고 싶어서.";
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
  res.needsSupport = anxiousClingy && score < 45;
  return res;
}

function diagnoseBreakup(a: Answers): Diagnosis {
  const f: Factor[] = [];
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
  if (a.contact === "blocked") score = Math.min(score, 20);

  const res: Diagnosis = { scoreTitle: "재회 시도 적정도", score, factors: f } as Diagnosis;

  if (a.contact === "blocked") {
    res.reason = "상대가 차단했다는 건 ‘지금은 연락받고 싶지 않다’는 명확한 의사 표시예요. 우회 연락이나 반복 시도는 재회 확률을 높이지 못하고, 관계를 더 닫고 당신에게 부정적 인상만 남깁니다.";
    res.actions = [
      { t: "지금은 멈추고 거리 두기", d: "차단 상태에서의 모든 접근은 역효과예요. 시간을 두고 나를 회복하는 데 집중하세요." },
      { t: "우회 연락 절대 금지", d: "다른 계정·지인·SNS를 통한 접근은 스토킹으로 비칠 수 있어요." },
      { t: "충분한 시간 뒤 재평가", d: "한참 후 차단이 풀린다면, 그때 가벼운 안부부터 아주 천천히 고려하세요." },
    ];
    res.risks = ["반복·우회 연락은 스토킹으로 비칠 수 있어요. 절대 금물.", "상대의 명확한 거부 의사를 존중하는 것이 가장 품위 있는 선택입니다.", "당신의 회복과 일상이 지금 가장 중요합니다."];
    res.msgLabel = "지금은 메시지를 보내지 마세요";
    res.hold = "지금 어떤 메시지도, 어떤 경로로도 보내지 마세요. 차단은 분명한 신호예요. 연락하고 싶은 충동이 들면 보내는 대신 그 마음을 메모로만 남겨두세요.";
    res.needsSupport = true;
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
  res.needsSupport = score < 45 || clingy;
  return res;
}

function makePlan(stage: Stage, score: number, a: Answers): Plan {
  const tier = score >= 65 ? "high" : score >= 45 ? "mid" : "low";
  if (stage === "crush") return planCrush(tier);
  if (stage === "dating") return planDating(tier);
  return planBreakup(tier, a);
}

function planBreakup(tier: string, a: Answers): Plan {
  if (a.contact === "blocked") {
    return {
      when: "지금은 연락하지 마세요", tone: "bad", channel: "모든 연락 중단",
      steps: [
        { time: "지금", action: "카톡·전화·SNS·지인 경유 등 모든 접근을 멈추세요." },
        { time: "충분한 시간 뒤 (차단 해제 시)", action: "아주 가벼운 안부부터 천천히 재고하세요." },
      ],
    };
  }
  const tooSoon = a.since === "lt1w" || a.since === "1to2w";
  if (tier === "high") return {
    when: "오늘~3일 내가 첫 연락 적기", tone: "good", channel: "카카오톡 — 가벼운 안부 한 통",
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
    when: "지금은 연락하지 마세요", tone: "bad", channel: "무연락 유지",
    steps: [
      { time: "지금~최소 3~4주", action: "무연락을 유지하고 일상·멘탈 회복을 최우선으로." },
      { time: "한 달 뒤", action: "미련인지 사랑인지 점검한 후 다시 진단해 보세요." },
    ],
  };
}

function planCrush(tier: string): Plan {
  if (tier === "high") return {
    when: "이번 주 안이 고백 적기", tone: "good", channel: "직접 만남 또는 통화",
    steps: [
      { time: "2~3일 내", action: "둘만의 편안한 자리를 만드세요." },
      { time: "그 자리에서", action: "부담 낮은 말로 솔직하게 마음을 전하세요." },
      { time: "고백 후", action: "답을 재촉하지 말고 상대의 시간을 존중하세요." },
    ],
  };
  if (tier === "mid") return {
    when: "1~2주 더 가까워진 뒤", tone: "warn", channel: "카카오톡 — 만남 제안 먼저",
    steps: [
      { time: "이번 주", action: "둘만의 만남을 자연스럽게 제안하세요." },
      { time: "만남에서", action: "가벼운 관심 표현으로 상대 반응을 확인하세요." },
      { time: "호감 신호가 늘면", action: "그때 고백 타이밍을 다시 진단하세요." },
    ],
  };
  return {
    when: "지금은 고백을 보류하세요", tone: "bad", channel: "가벼운 일상 공유 유지",
    steps: [
      { time: "당분간", action: "편한 접점은 유지하되 내 연락 비중을 줄이세요." },
      { time: "상대가 다가오면", action: "그때 관계 진전을 고려하세요." },
    ],
  };
}

function planDating(tier: string): Plan {
  if (tier === "high") return {
    when: "가까운 데이트 때 가볍게", tone: "good", channel: "직접 — 얼굴 보고",
    steps: [
      { time: "다음 만남", action: "고마움·애정을 구체적으로 표현하세요." },
      { time: "평소", action: "둘만의 정기 루틴(데이트·대화)을 유지하세요." },
    ],
  };
  if (tier === "mid") return {
    when: "이번 주말 등 차분한 시점에", tone: "warn", channel: "직접 — 감정이 가라앉은 때",
    steps: [
      { time: "차분한 자리에서", action: "‘요즘 우리 어때?’ 열린 질문으로 대화를 시작하세요." },
      { time: "대화 중", action: "비난 없이 내 마음을 ‘나 전달법’으로 전하세요." },
      { time: "이후", action: "함께 웃는 작은 경험을 의도적으로 늘리세요." },
    ],
  };
  return {
    when: "빠른 시일 내 점검 대화", tone: "bad", channel: "직접 — 진솔한 자리",
    steps: [
      { time: "곧", action: "회피하지 말고 관계 상태를 솔직히 점검하세요." },
      { time: "대화에서", action: "상대의 의지를 확인하세요 (혼자 끌고 가지 않기)." },
      { time: "결과에 따라", action: "관계 유지가 나를 해친다면 거리도 선택지입니다." },
    ],
  };
}
