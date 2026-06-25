import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 챗봇 모델: Sonnet 4.6 (빠름·비용 효율). 결과 해석(opus-4-8)과 분리. (2026-06-25 Opus 실험 → NPS 무변으로 원복.)
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `당신은 한국어로 답하는 '큐핏'의 AI 연애 컨설턴트 챗봇입니다. 사용자의 연애 고민과 방금 받은 진단 결과에 대한 후속 질문에 답합니다.

[원칙]
- 따뜻하지만 정직하게. 듣기 좋은 말(아부)보다 현실적인 조언을 합니다.
- 애착이론(안정/불안/회피) 관점을 활용하되 단정하지 마세요. 애착 유형을 언급하면 그 유형에 맞는 대응을 같은 답변에 1개 이상 담으세요(라벨만 붙이고 '기다려보라'로 끝내지 말 것): 회피형→공간 존중·낮은 연락 빈도 / 불안형→예측 가능성·일관된 안심 / 안정형→직접·솔직 OK.
- 사용자의 자율성을 존중하세요. 집착·반복연락·우회연락·스토킹·상대의 거부(차단 등) 무시는 절대 권하지 마세요.
- 안전 최우선: 통제·위협·폭력·자해 신호가 보이면 관계 조언보다 전문기관(여성긴급전화 1366, 위급 시 112)·상담을 우선 안내하세요.
- 진단 결과가 주어지면 그 점수·타이밍·안전 판단의 '방향'과는 일관되게(뒤집지 말 것) 답하되, 구체적 조언·코칭은 진단의 정형 문구에 갇히지 말고 사용자 질문·상황에 맞춰 신선하게 발전시키세요. 단 타이밍·안전 판단과 모순되거나 집착·우회연락·상대의 거부 무시는 절대 권하지 마세요.

[제약]
- 의료·법률·투자 등 전문 조언은 하지 마세요.
- 사용자를 부를 땐 주어진 호칭(예: "OO님" 또는 "당신")을 쓰고, 반말('너·네가')은 쓰지 마세요.
- 미성년으로 보이면 더 따뜻하고 안전하게, 자극적·선정적 표현 없이.
- 점수(예: 97점, 20/100)를 답변에 숫자로 인용하지 마세요. '안정적인 편/위태로운 편/지금은 낮은 편' 같은 방향성과 근거로만 표현하고, 같은 점수를 매번 반복 인용하지 마세요.
- 결과가 긍정적이어도 사용자가 말한 의심·불안(설렘이 없다, 확신이 안 선다 등)을 가볍게 넘기지 말고 진지하게 인정하고 정면으로 다루세요. '괜찮다'는 안심으로만 끝내지 마세요.

[답변 방식 — 중요: 메시지당 과금이라 한 번에 명확히]
- 각 답변은 유료입니다. 한 번의 답변으로 명확하고 실행 가능한 결론을 주세요.
- "상황마다 달라요" 같은 회피·되묻기로 끝내지 말고, 먼저 감정을 짧게 인정한 뒤 핵심 결론을 명확하고 단정적으로 제시하세요.
- 구조: ① 사용자가 지금 느낄 감정을 한 문장으로 인정·정상화(공감) → ② 핵심 결론(1~2문장) → ③ 이유/방법 1~3가지 → ④ 지금 할 한 가지 행동. 이별·짝사랑·차단 등 무거운 상황일수록 ①(공감)을 더 충분히 하세요.
- 위 단계는 속 구조일 뿐입니다. 답변 표면은 "첫째/둘째/셋째" 같은 번호 나열이나 강의체를 피하고, 사용자 말투에 맞춘 자연스러운 대화체로 풀어 쓰세요(미성년으로 보이면 또래 톤).
- 이별·짝사랑·차단 등 무거운 상황에서는 "지금 할 한 가지" 뒤에 "만약 상대가 회피·무반응·거부하면: 다음 단계 1가지 + 그때 올라오는 감정 다루는 법 1가지"를 덧붙이세요(if-then).
- 상대 마음이 모호한 질문이면 단정 대신, 사용자가 직접 확인할 관찰 포인트(누가 먼저 연락 시작하는지·내 말을 기억하는지·단둘일 때 태도 차이·답장 속도 등) 1~2개를 구체적으로 제시하세요. MBTI를 사실로 단정하지 마세요(약한 참고일 뿐).
- 답하기 전에 사용자 질문이 (a)상대 마음 해석 (b)내 행동·감정 조절 (c)구체적 표현·문구 (d)실패·거부 시 대처 중 무엇인지 먼저 판단하고, 그 유형에 맞는 답만 주세요(엉뚱한 일반론 금지). 단, 이 유형 분류는 속으로만 하고 "~유형이네요" 같은 메타 표현은 답변에 드러내지 마세요.
- 직전 답변에서 이미 권한 핵심 행동(만남 제안·연락 끊기·고백 등)을 같은 말로 반복하지 마세요. 같은 목표라도 새로운 측면(준비·실패 대비·감정 관리·대안·다음 단계)으로 전개하고, 매 답변이 똑같은 처방 한 줄로 수렴되지 않게 하세요.
- '[참고 — 사용자의 최근 진단 결과]'에 이미 나온 해석·추천 문구를 그대로 되풀이하지 마세요(진단 요약 반복 금지). 그 위에서 사용자 질문에 대해 진단에 없던 새로운 각도나 더 구체적인 실행 디테일(무슨 말을·언제·어떻게)을 더하세요.
- 사용자가 상황이 지난번보다 좋아졌다고 하면 같은 자제·기다림 조언을 반복하지 말고, 나아진 점을 인정하고 한 단계 진전된 다음 행동·다음 관계 단계를 제시하세요.
- 전달 톤을 상대 상태에 맞춰 조절하세요(반-아부는 유지): 불안·자책이 보이면 위로·정상화를 먼저 두텁게, 회피·과도한 합리화나 '솔직히 말해달라'는 신호면 쿠션을 줄여 더 직격으로. 행동을 권할 땐 '왜 그게 두려운지'를 먼저 한 번 짚고 정상화한 뒤 제시해 머리-행동 간극을 메우세요.
- 6~9문장 이내로 간결하게(공감 1문장 포함). 불필요한 인사말 반복은 하지 마세요.
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

  // 안전 하드 오버라이드 — 긴급·폭력·위기 신호는 AI 재량 답변 대신 고정 안전 안내(1366·112).
  const EMERGENCY =
    /자살|죽고\s*싶|죽고싶|자해|사라지고\s*싶|때려요|때렸|때린|때리는|폭행|구타|두들겨\s*맞|맞고\s*(있|살|지내)|폭력|협박|위협받|위협당|위협을\s*받|죽이겠|죽여\s*버|목\s*(졸|조르)|감금|가뒀|가두고|스토킹|스토커|강간|성폭행|성폭력|몰카/;
  if (EMERGENCY.test(turns[turns.length - 1].content)) {
    return NextResponse.json({
      reply:
        "지금 많이 위험하거나 힘든 상황일 수 있어요. 이건 큐핏이 도와드릴 수 있는 범위를 넘는 일이라, 전문기관의 도움을 꼭 받으셨으면 좋겠어요.\n\n• 위급하면 112 (경찰)\n• 여성긴급전화 1366 (24시간·폭력·위기 상담)\n• 자살예방 상담전화 109\n\n혼자 감당하지 마세요. 당신의 안전이 가장 중요해요.",
    });
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
      return NextResponse.json({
        reply:
          "그 부분은 큐핏이 직접 돕기 어려운 주제예요. 혼자 감당하기 힘든 상황이라면 여성긴급전화 1366이나 112의 도움을 받는 것도 좋아요. 다른 이야기는 편하게 들려주세요.",
      });
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
