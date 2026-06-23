import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 챗봇 모델: Sonnet 4.6 (빠름·비용 효율). 결과 해석(opus-4-8)과 분리.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `당신은 한국어로 답하는 '큐핏'의 AI 연애 컨설턴트 챗봇입니다. 사용자의 연애 고민과 방금 받은 진단 결과에 대한 후속 질문에 답합니다.

[원칙]
- 따뜻하지만 정직하게. 듣기 좋은 말(아부)보다 현실적인 조언을 합니다.
- 애착이론(안정/불안/회피) 관점을 활용하되 단정하지 마세요.
- 사용자의 자율성을 존중하세요. 집착·반복연락·우회연락·스토킹·상대의 거부(차단 등) 무시는 절대 권하지 마세요.
- 안전 최우선: 통제·위협·폭력·자해 신호가 보이면 관계 조언보다 전문기관(여성긴급전화 1366, 위급 시 112)·상담을 우선 안내하세요.
- 진단 결과가 주어지면 그 점수·타이밍·판단과 '일관되게' 답하고, 점수를 새로 매기거나 뒤집지 마세요.

[제약]
- 의료·법률·투자 등 전문 조언은 하지 마세요.
- 사용자를 부를 땐 주어진 호칭(예: "OO님" 또는 "당신")을 쓰고, 반말('너·네가')은 쓰지 마세요.
- 미성년으로 보이면 더 따뜻하고 안전하게, 자극적·선정적 표현 없이.

[답변 방식 — 중요: 메시지당 과금이라 한 번에 명확히]
- 각 답변은 유료입니다. 한 번의 답변으로 명확하고 실행 가능한 결론을 주세요.
- "상황마다 달라요" 같은 회피·되묻기로 끝내지 말고, 핵심 결론을 먼저 단정적으로 제시하세요.
- 구조: ① 핵심 결론(1~2문장) → ② 이유/방법 1~3가지 → ③ 지금 할 한 가지 행동.
- 5~8문장 이내로 간결하게. 불필요한 인사말 반복은 하지 마세요.
- 마크다운 서식을 쓰지 마세요. 특히 **굵게**(별표 \`**\`) 표기를 쓰지 말고 일반 평문으로만 답하세요.`;

export async function POST(req: Request) {
  let rawMessages: { role?: string; content?: string }[] = [];
  let context = "";
  let name = "";
  let diagnosisId = "";
  try {
    const body = await req.json();
    rawMessages = Array.isArray(body.messages) ? body.messages : [];
    context = typeof body.context === "string" ? body.context.slice(0, 2000) : "";
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    diagnosisId = typeof body.diagnosisId === "string" ? body.diagnosisId : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 사용자/어시스턴트 턴만, 최근 12개로 제한(비용·맥락 관리)
  const turns = rawMessages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 2000) }));

  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "no user message" }, { status: 400 });
  }

  // 키 미설정 → 챗봇 비활성 안내(앱은 동작)
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: "지금은 상담 챗봇을 이용할 수 없어요. 잠시 후 다시 시도해 주세요." });
  }

  const honorific = name ? `${name}님` : "당신";
  const system =
    SYSTEM_PROMPT +
    `\n\n[사용자 호칭] ${honorific}` +
    (context ? `\n\n[참고 — 사용자의 최근 진단 결과]\n${context}` : "");

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: turns,
    });
    const block = resp.content.find((b) => b.type === "text");
    const reply = (block && block.type === "text" ? block.text : "").replace(/\*\*/g, "").trim();
    if (resp.stop_reason === "refusal" || !reply) {
      return NextResponse.json({ reply: "그 부분은 도와드리기 어려워요. 다른 질문이 있으면 편하게 말씀해 주세요." });
    }

    // 진단별 상담 기록 저장(베스트에포트) — diagnosisId + 로그인 상태일 때만.
    // diagnosis_chats 테이블/권한이 아직 없으면 조용히 스킵(답변은 정상 반환).
    if (diagnosisId) {
      try {
        const supabase = await createClient();
        await supabase.from("diagnosis_chats").insert({
          diagnosis_id: diagnosisId,
          q: turns[turns.length - 1].content,
          a: reply,
        });
      } catch {
        // 무시
      }
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
}
