import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 카톡 대화 캡처 분석(추가 옵션) — 비전. Sonnet 4.6. (2026-06-25 Opus 실험 → NPS 무변으로 원복.)
const MODEL = "claude-sonnet-4-6";
const MEDIA = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
// 캡처 분석 결과에 명백한 위협·폭력 신호가 보이면 안전 안내를 덧붙인다(관계 분석으로 희석 방지).
const EMERGENCY = /자살|죽고\s*싶|자해|때리|때렸|폭행|구타|폭력|협박|감금|스토킹|강간|성폭행|죽이겠|죽여\s*버|찾아가겠|찾아간다|가만\s*안\s*둬/;

const SYSTEM = `당신은 한국어 'AI 연애 컨설턴트'입니다. 사용자와 상대의 카카오톡 대화 캡처를 보고 상대의 관심도·감정 온도·애착 성향(안정/불안/회피)·연락 패턴 단서를 분석합니다.

[원칙]
- 정직·근거 기반(아부 금지). 캡처에 실제로 보이는 근거(답장 속도·길이·이모티콘·먼저 연락·질문 여부 등)를 구체적으로 인용하세요.
- 캡처에 실제로 보이지 않는 대화·메시지를 추측해 인용하거나 지어내지 마세요. 잘 안 보이면 "캡처에서는 ~까지만 보여요"라고 한계를 솔직히 밝히세요.
- 단정하지 말고 경향성으로(예: "~한 편으로 보여요"). 캡처만으로 단정 금지.
- 집착·반복연락·우회연락·스토킹·사생활 침해 조언은 절대 하지 마세요.
- 통제·위협·폭력 등 위험 신호가 보이면 관계 분석보다 안전(1366·112)을 먼저 안내.
- 진단 결과가 주어지면 그와 일관되게 분석하세요.

[출력]
- 구조: ① 한 줄 총평 → ② 근거 2~3가지 → ③ 지금 할 한 가지.
- 6~9문장, 평문(마크다운·별표 금지).`;

export async function POST(req: Request) {
  let images: { media_type?: string; data?: string }[] = [];
  let context = "";
  try {
    const body = await req.json();
    images = Array.isArray(body.images) ? body.images.slice(0, 3) : [];
    context = typeof body.context === "string" ? body.context.slice(0, 1500) : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const valid = images.filter(
    (im) => im && typeof im.data === "string" && im.data.length > 0 && typeof im.media_type === "string" && MEDIA.has(im.media_type),
  );
  if (valid.length === 0) {
    return NextResponse.json({ error: "분석할 이미지를 찾지 못했어요." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "지금은 이미지 분석을 이용할 수 없어요. 잠시 후 다시 시도해 주세요." });
  }

  const content: Anthropic.MessageParam["content"] = [
    ...valid.map((im) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: im.media_type as "image/jpeg", data: im.data as string },
    })),
    {
      type: "text" as const,
      text:
        `위는 사용자와 상대의 카카오톡 대화 캡처예요(최대 3장).\n` +
        (context ? `[참고 — 진단 결과]\n${context}\n\n` : "") +
        `이 대화에서 상대의 관심도·온도·애착 성향·연락 패턴 단서를 읽어 분석해 주세요.`,
    },
  ];

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const block = resp.content.find((b) => b.type === "text");
    const analysis = (block && block.type === "text" ? block.text : "").replace(/\*\*/g, "").trim();
    if (resp.stop_reason === "refusal" || !analysis) {
      return NextResponse.json({ error: "이 이미지는 분석하기 어려워요. 대화가 잘 보이는 캡처로 다시 시도해 주세요." });
    }
    if (EMERGENCY.test(analysis)) {
      return NextResponse.json({
        analysis:
          analysis +
          "\n\n⚠️ 대화에서 위협·폭력으로 읽힐 수 있는 신호가 보여요. 안전이 가장 중요해요 — 위급하면 112, 여성긴급전화 1366(24시간·폭력/위기 상담)의 도움을 받으세요.",
      });
    }
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ error: "분석을 가져오지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
}
