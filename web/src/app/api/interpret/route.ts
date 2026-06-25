import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { SURVEYS, STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import { analyzeFreeText } from "@/lib/diagnose/freetext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 모델: 결과 해석은 Opus 4.8(고품질). 챗봇(추후)은 별도로 Sonnet 4.6 사용 예정.
const MODEL = "claude-opus-4-8";

// 구조화 출력 스키마 — 해석(interpretation)과 문구(message)만. 점수·타이밍은 규칙 엔진이 확정.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    interpretation: {
      type: "string",
      description: "사용자 상황에 대한 따뜻하고 정직한 해석 2~4문장 (규칙 결과와 일관되게)",
    },
    message: {
      type: "string",
      description: "상대에게 보낼 자연스러운 한국어 메시지 1개(2~5줄). 연락을 권하지 않는 상황이면 빈 문자열.",
    },
    selfMessage: {
      type: "string",
      description: "상대가 아니라 사용자 자신에게 건네는 따뜻한 위로·다짐 한마디. 특히 연락을 권하지 않는 보류·차단·안전 상황에서 2~3줄로 꼭 채울 것.",
    },
    keyInsight: {
      type: "string",
      description: "사용자가 적은 내용에서 본인은 미처 의식하지 못했을 '비자명한 패턴·통찰' 1개(2~3문장). 일반론·이미 아는 조언 금지, 사용자의 구체적 표현·행동을 근거로 한 관찰이어야 함. 마땅한 게 없으면 빈 문자열.",
    },
    prediction: {
      type: "string",
      description: "향후 1~2주 내 사용자가 직접 관찰·반증할 수 있는 구체적 예측 1개(1~2문장). 예: '먼저 연락을 2~3일 줄이면 이 사람이 먼저 연락해 올 가능성이 높아요.' 막연한 '잘 될 거예요' 금지. 마땅하지 않으면 빈 문자열.",
    },
  },
  required: ["interpretation", "message", "selfMessage", "keyInsight", "prediction"],
  additionalProperties: false,
} as const;

function isStage(s: unknown): s is Stage {
  return s === "crush" || s === "unrequited" || s === "dating" || s === "breakup";
}

// 규칙 결과로 폴백(키 미설정·오류·거부·학대 케이스)
function fallback(d: Diagnosis) {
  return NextResponse.json({
    source: "fallback" as const,
    interpretation: d.reason ?? "",
    message: d.hold ? "" : d.msg ?? "",
    selfMessage: d.selfMessage ?? "",
    keyInsight: "",
    prediction: "",
  });
}

// 설문 응답을 사람이 읽을 수 있는 요약으로(프롬프트 품질용)
function readableSummary(stage: Stage, a: Answers): string {
  const lines: string[] = [];
  for (const q of SURVEYS[stage]) {
    if (q.type === "text") continue;
    const v = a[q.id];
    if (!v) continue;
    const opt = q.options?.find((o) => o.v === v);
    if (opt) lines.push(`- ${q.title} → ${opt.label}`);
  }
  return lines.join("\n") || "- (응답 없음)";
}

const SYSTEM_PROMPT = `당신은 한국어로 답하는 'AI 연애 컨설턴트'입니다(코치가 아니라 컨설팅).

[원칙]
- 애착이론(안정/불안/회피)으로 사용자·상대의 패턴을 읽되 단정하지 마세요.
- 애착 유형을 언급하면 반드시 그 유형에 맞는 대응을 1개 이상 같은 답변에 담으세요(라벨만 붙이고 '기다려보라'로 끝내지 말 것). 참고 플레이북: 회피형 신호 → 공간 존중·낮은 연락 빈도·직접 추궁 금지 / 불안형 → 예측 가능성·일관된 안심 / 안정형 → 직접·솔직하게 다가가도 OK.
- 상대 마음·관심도가 모호하면 막연한 결론 대신, 사용자가 직접 확인할 수 있는 구체적 관찰 포인트(누가 먼저 연락을 시작하는지, 내 사소한 말을 기억하는지, 단둘일 때와 여럿일 때 태도 차이, 답장 속도·길이 등)를 1~2개 짚어주세요.
- 점수·관계 상태를 말할 땐 숫자로 단정('XX점/100')하지 말고(화면 게이지가 이미 숫자를 보여줘요) '높은 편/보통/낮은 편' 같은 방향성과 근거 요인 1~2개로 풀어 제시하세요. 결혼·이별·고백 등 무게 있는 결정이면 안심 일변도로 가지 말고, 점검할 리스크 1가지를 균형 있게 곁들이세요. 결과가 긍정적이어도 사용자가 적은 의심·불안(설렘 부족·확신 없음 등)을 가볍게 넘기지 말고, 그 감정을 진지하게 인정하고 정면으로 다루세요('괜찮다'는 안심으로만 끝내지 말 것).
- 정직하고 근거 기반으로 말하세요. 듣기 좋은 말(아부)보다 현실적인 조언을, 단 따뜻하고 비난하지 않는 톤으로.
- 같은 솔직함이라도 '전달 톤'은 사용자 상태에 맞춰 조절하세요(반-아부는 유지). 불안·조급하거나(불안 애착·높은 조급함) 자책·자기비난이 보이면 위로·정상화를 먼저 두텁게 깔고 부드럽지만 단호하게. 반대로 회피·과도한 합리화·거리두기가 보이거나 '솔직히/냉정히 말해달라'는 신호면 쿠션을 줄이고 더 직격으로, 회피하고 있는 지점을 이름 붙여 직면시키세요.
- 행동을 권할 땐 그 행동이 '왜 두려운지'(망설이게 하는 감정)를 먼저 한 문장으로 짚고 "그럴 만하다"고 정상화한 뒤 제시하세요 — 머리는 납득해도 발이 안 떨어지는 간극을 메우기 위함입니다.
- 사용자의 자율성을 존중하세요. 집착·반복연락·우회연락·스토킹·상대의 거부(차단 등) 무시는 절대 권하지 마세요.
- 안전 최우선: 통제·위협·폭력·자해 신호가 보이면 관계 조언보다 도움 요청을 우선하세요.

[제약]
- 규칙 엔진 결과를 다음 3단계로 다루세요. ① 절대 유지: 점수 등급(높음/보통/낮음)·보류 여부·안전 판단(차단·위기·미성년)은 절대 뒤집지 마세요. ② 방향·근거는 유지하되 표현은 자유: 타이밍 뉘앙스·추천 액션의 순서·근거 서술은 규칙 정형에 갇히지 말고 그 사람의 상황·회고에 맞게 재구성하세요. ③ 전면 창의: 해석의 각도·감정 명명·selfMessage·keyInsight·prediction은 자유롭고 신선하게(정형 복붙 금지, 회차마다 다른 각도·다음 단계). 단 어떤 경우에도 ①의 방향·안전 판단과 모순되거나, 집착·반복연락·우회연락·상대의 거부(차단 등) 무시를 권하지 마세요.
- 의료·법률·투자 등 전문 조언은 하지 마세요.
- 사용자를 지칭할 때는 사용자 메시지의 '[사용자 호칭]'에 주어진 호칭(예: "민지님이" 또는 "당신이")만 사용하고, '너·네가' 같은 반말 호칭은 절대 쓰지 마세요.
- 미성년(minor)이면 더 따뜻하고 지지적인 눈높이로, 자극적·선정적 표현 없이. 필요하면 신뢰할 수 있는 어른·상담을 권할 수 있어요.
- MBTI는 약한 참고일 뿐입니다. 'OO라서 ~하다'처럼 유형을 사실로 단정하거나 성격을 규정하지 마세요. 행동·대화 근거를 우선하고, 굳이 언급한다면 '~한 경향이 있을 수도'처럼 아주 조심스럽게만 하세요.
- 사용자가 제공하지 않은 사실·대화·메시지를 지어내거나 단정하지 마세요. 주어진 입력(설문·자유서술·상대 설명)에만 근거를 두세요.

[출력]
- interpretation: 반드시 첫 문장에서 사용자가 지금 느낄 감정을 구체적으로 명명하고 "그럴 만하다"고 정상화하세요(사용자가 직접 적은 표현·단어를 인용한 구체적 공감 — 막연한 일반론 위로 금지). 그다음 문장부터 규칙 결과와 일관되게 상황을 해석하세요(총 3~5문장). 진단명·단정은 금지.
- message: 요청된 경우에만, 사용자가 상대에게 실제로 보낼 만한 자연스러운 한국어 메시지 1개(2~5줄). 부담스럽지 않고 진솔하게. 요청되지 않으면 빈 문자열("").
- selfMessage: 상대가 아니라 사용자 자신에게 건네는 따뜻한 한마디. 특히 연락을 권하지 않는 상황(보류·차단·안전)에서는 사용자의 마음을 다독이는 위로 한 줄을 꼭 채우세요(공감 → 정상화 → 자기돌봄). 진단명·단정 금지.
- keyInsight: 사용자가 적은 내용에서 본인은 미처 연결 짓지 못했을 비자명한 패턴 1개를 짚어주세요(2~3문장). 누구나 아는 일반 조언이 아니라 사용자의 구체적 표현·행동을 근거로 한 '관찰'이어야 합니다. 마땅하지 않으면 빈 문자열.
- prediction: 향후 1~2주 내 사용자가 O/X로 직접 확인할 수 있는 '반증 가능한' 예측 1개. 막연한 위로('잘 될 거예요')가 아니라 관찰 가능한 구체 사건으로. 규칙 결과와 일관되게.
- 반드시 주어진 JSON 스키마로만 출력하세요.`;

export async function POST(req: Request) {
  let stage: Stage;
  let answers: Answers;
  let minor = false;
  let name = "";
  let prevInsight = "";
  try {
    const body = await req.json();
    if (!isStage(body?.stage)) {
      return NextResponse.json({ error: "invalid stage" }, { status: 400 });
    }
    stage = body.stage;
    answers = (body.answers ?? {}) as Answers;
    minor = !!body.minor;
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    prevInsight = typeof body.prevInsight === "string" ? body.prevInsight.slice(0, 500) : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 점수·타이밍은 규칙 엔진이 정답 — 서버에서 재계산해 신뢰(클라이언트 결과를 그대로 믿지 않음)
  const d = diagnose(stage, answers);
  d.minor = minor;

  // 안전 우선: 학대 신고 케이스는 AI 우회, 규칙의 안전 메시지를 그대로 사용
  // 안전·위기(학대 신고 — 모든 단계 / 자유서술의 자해·폭력·강압통제 신호)는 AI 해석·예측을 거치지 않고
  // 규칙 기반 안전 응답으로(위기에 낙관·헛된 희망·반증가능 예측이 새어나가지 않게). 평범한 저점수·매달림은 제외.
  const isCrisis = answers.abuse === "yes" || analyzeFreeText(answers.freeText).needsSupport;
  if (isCrisis) return fallback(d);

  // 키 미설정(로컬/배포 env) → 규칙 결과로 폴백 (앱은 키 없이도 정상 동작)
  if (!process.env.ANTHROPIC_API_KEY) return fallback(d);

  const wantMessage = !d.hold; // 보류(지금 연락 권장 안 함) 케이스는 문구 생성 안 함
  const honorific = name ? `${name}님` : "당신"; // 결과에서 사용자를 부를 호칭

  const userText = [
    `[상황] ${STAGE_LABEL[stage]}`,
    `[사용자 호칭] ${honorific} — 사용자를 부를 땐 "${honorific}"을 쓰되 한국어 조사를 올바르게 붙이세요(예: "${honorific}이", "${honorific}은", "${honorific}께서"). "${honorific}이가"처럼 조사를 겹쳐 쓰지 말고, '너·네가' 같은 반말도 쓰지 마세요.`,
    `[설문 응답]\n${readableSummary(stage, answers)}`,
    `[사용자가 직접 적은 상황]\n${(answers.freeText || "").trim() || "(없음)"}`,
    `[상대에 대한 설명]\n${(answers.partnerText || "").trim().slice(0, 1000) || "(없음)"}`,
    `[참고(점수 미반영)] 내 MBTI: ${answers.myMbti || "미입력"}, 상대 MBTI: ${answers.partnerMbti || "미입력"}`,
    prevInsight ? `[직전 진단 회고 — 이번 진단에 참고]\n${prevInsight}\n→ 사용자가 '잘됨/맞음'이라 한 접근은 이어가되('지난번에 ~한 게 잘 통했으니 이번엔…') 그대로 반복하지 말고 진전된 다음 스텝으로, '아쉬움/틀림'이면 얼버무리지 말고 먼저 정직하게 인정한 뒤('지난번 예측은 빗나갔네요 — 그건 ~란 뜻이었어요') 왜 빗나갔는지 재해석하고 접근을 바꾸세요(빗나간 회차일수록 정직함이 신뢰를 만듭니다). 통찰은 직전과 다른 각도로. 회고를 반영해 사용자가 '나를 기억한다'고 느끼게 하세요. 상황이 좋아졌으면(잘됨) 같은 '기다려라·자제하라' 조언을 글자 그대로 반복하지 말고, 나아진 점을 인정한 뒤 규칙 결과 범위 안에서 한 단계 진전된 코칭(다음 행동·다음 단계 준비)으로 전개하세요.` : "",
    minor ? `[중요] 사용자는 미성년입니다. 청소년 눈높이로 더 따뜻하고 안전하게.` : "",
    `[규칙 엔진 결과 — 이 결과를 신뢰하고 일관되게 작성]`,
    `- 점수: ${d.score}/100 (${d.scoreTitle})`,
    `- 점수 근거(상위 요인): ${d.factors.filter((x) => x.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3).map((x) => x.label).join(", ") || "없음"}`,
    `- 추천 타이밍: ${d.plan.when} / 추천 수단: ${d.plan.channel}`,
    `- 추천 액션: ${d.actions.map((a) => a.t).join(", ")}`,
    `- 주의: ${d.risks.join(" / ")}`,
    `- 상태: ${d.hold ? "보류 — 지금은 연락을 권하지 않음" : "연락 가능"}`,
    `- (참고) 규칙 기본 해석: ${d.reason ?? ""}`,
    d.msg ? `- (참고) 규칙 기본 예시 문구: ${d.msg}` : "",
    ``,
    `[작업]`,
    `1) interpretation: 먼저 첫 문장에서 사용자가 지금 느낄 감정을 구체적으로 명명하고 "그럴 만하다"고 정상화하세요(사용자가 freeText에 직접 쓴 표현을 인용; 막연한 일반론 위로 금지). 그다음 문장부터 위 결과와 일관되게, 사용자가 적은 내용과 '상대에 대한 설명'을 반영해 따뜻하고 정직하게 해석하세요(총 3~5문장). 상대 설명이 있으면 상대의 애착 성향(안정/불안/회피)·관심도·주의 신호를 조심스럽게 추론해 녹이되 단정하지 마세요. 점수·상태는 'XX점/100'처럼 숫자로 단정해 쓰지 말고(게이지가 이미 숫자를 보여줘요) '높은 편/보통/낮은 편' 같은 방향성과 위 '점수 근거(상위 요인)' 1~2개로 풀어주세요.`,
    `2) message: ${
      wantMessage
        ? "지금 상대에게 보낼 만한 자연스러운 메시지 1개(2~5줄)를 작성하세요. '상대에 대한 설명'이 있으면 상대 성향에 맞는 톤으로 맞추고, 사용자가 적은 말투·존댓말/반말·길이를 반영해 교과서체가 아니라 카톡에 바로 복붙할 수 있는 자연스러운 구어체로(미성년이면 또래 말투)."
        : '빈 문자열("")로 두세요. 지금은 상대에게 연락을 권하지 않는 상황입니다.'
    }`,
    `3) selfMessage: ${
      wantMessage
        ? `상대가 아니라 ${honorific} 자신에게 건네는 짧은 응원 한마디(1~2줄).`
        : `지금은 연락 대신 마음을 추스를 때예요. 상대가 아니라 ${honorific} 자신에게 건네는 따뜻한 위로·다짐 한마디(2~3줄)를 쓰세요. 연락하고 싶은 충동을 비난하지 말고 "자연스러운 마음"이라고 정상화한 뒤, 오늘 나를 돌보는 쪽으로 부드럽게 이끌어 주세요. 규칙 결과(보류·차단 등)와 일관되게, 단정·진단 표현 없이.`
    }`,
    `4) keyInsight: freeText·'상대에 대한 설명'·설문 응답을 종합해, 사용자가 스스로 말했지만 의미를 연결 짓지는 못했을 패턴 1개를 짚으세요(예: "먼저 연락을 줄일까 고민하면서도 매번 먼저 연락하는 건, ~일 수 있어요"). 뻔한 조언·일반론 금지, 구체 근거 인용. 없으면 빈 문자열. 직전 진단 통찰이 주어졌다면 그와 겹치지 않는 새로운 각도로.`,
    `5) prediction: 향후 1~2주 내 사용자가 직접 맞았는지 확인할 수 있는 반증 가능한 예측 1개(1~2문장). 규칙 결과·추천 행동과 일관되게, 관찰 가능한 구체 사건으로(예: 추천대로 했을 때 상대의 예상 반응). 마땅하지 않으면 빈 문자열. 직전 회고가 주어졌으면 '직전 예측'을 그대로 반복(복붙)하지 마세요 — 지난 예측이 빗나갔으면(반반/틀림) 다른 각도의 예측을, 맞았으면(맞음) 한 단계 진전된 새 예측을 내세요. 예측에는 빗나갈 여지가 있음을 자연스럽게 인정하고, '만약 ~하지 않으면 그건 상대가 ~란 뜻' 식으로 빗나가도 정보가 되는 형태로 제시하세요(신뢰가 적중 여부에만 걸리지 않도록).`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      // 구조화 출력 — SDK 타입 버전에 따라 output_config 미정의일 수 있어 부분 캐스팅
      ...({ output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } } } as Record<string, unknown>),
    });

    if (resp.stop_reason === "refusal") return fallback(d);

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallback(d);

    let parsed: { interpretation?: string; message?: string; selfMessage?: string; keyInsight?: string; prediction?: string };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return fallback(d);
    }

    const interpretation = (parsed.interpretation || "").trim() || d.reason || "";
    const message = wantMessage ? (parsed.message || "").trim() || d.msg || "" : "";
    const selfMessage = (parsed.selfMessage || "").trim() || d.selfMessage || "";
    const keyInsight = (parsed.keyInsight || "").trim();
    const prediction = (parsed.prediction || "").trim();
    return NextResponse.json({ source: "ai" as const, interpretation, message, selfMessage, keyInsight, prediction });
  } catch {
    // 호출 실패(네트워크·인증·과금 등) → 규칙 결과로 폴백
    return fallback(d);
  }
}
