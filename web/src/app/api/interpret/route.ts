import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { SURVEYS, STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";

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
  },
  required: ["interpretation", "message"],
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
- 정직하고 근거 기반으로 말하세요. 듣기 좋은 말(아부)보다 현실적인 조언을, 단 따뜻하고 비난하지 않는 톤으로.
- 사용자의 자율성을 존중하세요. 집착·반복연락·우회연락·스토킹·상대의 거부(차단 등) 무시는 절대 권하지 마세요.
- 안전 최우선: 통제·위협·폭력·자해 신호가 보이면 관계 조언보다 도움 요청을 우선하세요.

[제약]
- 점수·타이밍·추천행동·주의사항은 이미 '규칙 엔진'이 확정했습니다. 당신은 그 결과와 '일관된' 해석·문구만 만드세요. 점수나 타이밍을 새로 판단하거나 뒤집지 마세요.
- 의료·법률·투자 등 전문 조언은 하지 마세요.
- 사용자를 지칭할 때는 사용자 메시지의 '[사용자 호칭]'에 주어진 호칭(예: "민지님이" 또는 "당신이")만 사용하고, '너·네가' 같은 반말 호칭은 절대 쓰지 마세요.
- 미성년(minor)이면 더 따뜻하고 지지적인 눈높이로, 자극적·선정적 표현 없이. 필요하면 신뢰할 수 있는 어른·상담을 권할 수 있어요.

[출력]
- interpretation: 사용자가 직접 적은 내용을 반영해, 규칙 결과와 일관되게 상황을 2~4문장으로 해석·공감하세요. 진단명·단정은 금지.
- message: 요청된 경우에만, 사용자가 상대에게 실제로 보낼 만한 자연스러운 한국어 메시지 1개(2~5줄). 부담스럽지 않고 진솔하게. 요청되지 않으면 빈 문자열("").
- 반드시 주어진 JSON 스키마로만 출력하세요.`;

export async function POST(req: Request) {
  let stage: Stage;
  let answers: Answers;
  let minor = false;
  let name = "";
  try {
    const body = await req.json();
    if (!isStage(body?.stage)) {
      return NextResponse.json({ error: "invalid stage" }, { status: 400 });
    }
    stage = body.stage;
    answers = (body.answers ?? {}) as Answers;
    minor = !!body.minor;
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 점수·타이밍은 규칙 엔진이 정답 — 서버에서 재계산해 신뢰(클라이언트 결과를 그대로 믿지 않음)
  const d = diagnose(stage, answers);
  d.minor = minor;

  // 안전 우선: 학대 신고 케이스는 AI 우회, 규칙의 안전 메시지를 그대로 사용
  const isAbuse = (stage === "dating" || stage === "breakup") && answers.abuse === "yes";
  if (isAbuse) return fallback(d);

  // 키 미설정(로컬/배포 env) → 규칙 결과로 폴백 (앱은 키 없이도 정상 동작)
  if (!process.env.ANTHROPIC_API_KEY) return fallback(d);

  const wantMessage = !d.hold; // 보류(지금 연락 권장 안 함) 케이스는 문구 생성 안 함
  const honorific = name ? `${name}님` : "당신"; // 결과에서 사용자를 부를 호칭

  const userText = [
    `[상황] ${STAGE_LABEL[stage]}`,
    `[사용자 호칭] ${honorific} — 사용자를 부를 땐 "${honorific}"을 쓰되 한국어 조사를 올바르게 붙이세요(예: "${honorific}이", "${honorific}은", "${honorific}께서"). "${honorific}이가"처럼 조사를 겹쳐 쓰지 말고, '너·네가' 같은 반말도 쓰지 마세요.`,
    `[설문 응답]\n${readableSummary(stage, answers)}`,
    `[사용자가 직접 적은 상황]\n${(answers.freeText || "").trim() || "(없음)"}`,
    `[참고(점수 미반영)] 내 MBTI: ${answers.myMbti || "미입력"}, 상대 MBTI: ${answers.partnerMbti || "미입력"}`,
    minor ? `[중요] 사용자는 미성년입니다. 청소년 눈높이로 더 따뜻하고 안전하게.` : "",
    `[규칙 엔진 결과 — 이 결과를 신뢰하고 일관되게 작성]`,
    `- 점수: ${d.score}/100 (${d.scoreTitle})`,
    `- 추천 타이밍: ${d.plan.when} / 추천 수단: ${d.plan.channel}`,
    `- 추천 액션: ${d.actions.map((a) => a.t).join(", ")}`,
    `- 주의: ${d.risks.join(" / ")}`,
    `- 상태: ${d.hold ? "보류 — 지금은 연락을 권하지 않음" : "연락 가능"}`,
    `- (참고) 규칙 기본 해석: ${d.reason ?? ""}`,
    d.msg ? `- (참고) 규칙 기본 예시 문구: ${d.msg}` : "",
    ``,
    `[작업]`,
    `1) interpretation: 위 결과와 일관되게, 사용자가 적은 내용을 반영해 2~4문장으로 따뜻하고 정직하게 해석하세요.`,
    `2) message: ${
      wantMessage
        ? "지금 상대에게 보낼 만한 자연스러운 메시지 1개(2~5줄)를 작성하세요."
        : '빈 문자열("")로 두세요. 지금은 연락을 권하지 않는 상황입니다.'
    }`,
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

    let parsed: { interpretation?: string; message?: string };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return fallback(d);
    }

    const interpretation = (parsed.interpretation || "").trim() || d.reason || "";
    const message = wantMessage ? (parsed.message || "").trim() || d.msg || "" : "";
    return NextResponse.json({ source: "ai" as const, interpretation, message });
  } catch {
    // 호출 실패(네트워크·인증·과금 등) → 규칙 결과로 폴백
    return fallback(d);
  }
}
