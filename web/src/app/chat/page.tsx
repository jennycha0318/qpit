"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/profile";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "안녕하세요, 큐핏이에요. 방금 받은 진단이나 연애 고민에 대해 편하게 물어보세요. 무엇이 궁금하세요?",
};

// 질문 유형 칩 — 클릭 시 입력창에 시작 문장을 채워 답변을 해당 유형으로 라우팅(앵무새 처방 방지)
const CHIPS: { label: string; q: string }[] = [
  { label: "상대 마음", q: "상대가 지금 무슨 마음일지 더 자세히 해석해 주세요." },
  { label: "내 감정 다스리기", q: "지금 제 마음이 너무 복잡한데, 어떻게 다스리면 좋을까요?" },
  { label: "문구 다듬기", q: "상대에게 보낼 메시지를 자연스럽게 다듬어 주세요." },
  { label: "그 다음엔?", q: "이렇게 했는데도 상대가 반응이 없으면 그다음엔 어떻게 해야 할까요?" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [name, setName] = useState("");
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 컨텍스트 로드: ① 결과 페이지에서 넘어온 handoff 우선(1회 소비) → ② 없으면 로그인 사용자의 최근 진단
  useEffect(() => {
    let hasHandoff = false;
    try {
      const raw = sessionStorage.getItem("qpit:chatHandoff");
      if (raw) {
        const h = JSON.parse(raw) as { context?: string; diagnosisId?: string | null };
        if (h.context) setContext(h.context);
        if (h.diagnosisId) setDiagnosisId(h.diagnosisId);
        hasHandoff = !!h.context;
        sessionStorage.removeItem("qpit:chatHandoff");
      }
    } catch {
      // 무시
    }
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const p = await getProfile(supabase);
        if (p) setName(p.nickname || p.name || "");
        if (hasHandoff) return; // 결과 핸드오프가 있으면 DB 최근 진단 조회 생략
        const { data: rows } = await supabase
          .from("diagnoses")
          .select("id, stage, score, result, created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        const r = rows?.[0] as { id?: string; stage?: string; result?: Record<string, unknown> } | undefined;
        if (r?.id) setDiagnosisId(r.id);
        const d = r?.result as
          | { scoreTitle?: string; score?: number; reason?: string; plan?: { when?: string }; kakaoAnalysis?: string }
          | undefined;
        if (d) {
          setContext(
            `상황:${r?.stage ?? ""} / 점수:${d.score ?? "-"}점(${d.scoreTitle ?? ""}) / 추천 타이밍:${d.plan?.when ?? ""} / 해석:${d.reason ?? ""}${d.kakaoAnalysis ? ` / 카톡 대화 분석(상대 말투·온도 참고):${d.kakaoAnalysis.slice(0, 400)}` : ""}`,
          );
        }
      } catch {
        // 무시 — 컨텍스트 없이도 일반 상담 가능
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context, name: name || undefined, diagnosisId: diagnosisId || undefined }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "답변을 가져오지 못했어요." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "네트워크 오류로 답변을 못 가져왔어요. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-10 mx-auto flex max-w-app flex-col px-5 pt-6"
      style={{ bottom: "max(6rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
    >
      <h2 className="mb-1.5 shrink-0 text-[26px] font-bold tracking-tight">큐핏 상담</h2>
      <p className="mb-4 shrink-0 text-sm text-muted">진단 결과나 연애 고민을 편하게 물어보세요.</p>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-primary text-white"
                  : "rounded-bl-md border border-line bg-white/70 text-ink backdrop-blur"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-white/70 px-3.5 py-2.5 text-[14px] text-muted backdrop-blur">
              답변 작성 중…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 pb-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => { setInput(c.q); taRef.current?.focus(); }}
            className="rounded-full border border-primary/30 bg-white/60 px-3 py-1 text-[12.5px] font-bold text-primaryDark backdrop-blur transition active:scale-95 hover:bg-primarySoft"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-line pt-2.5">
        <textarea
          ref={taRef}
          className="field-input max-h-32 min-h-[46px] flex-1 resize-none py-3"
          rows={2}
          placeholder="메시지를 입력하세요 (Enter는 줄바꿈, 전송은 버튼으로)"
          aria-label="메시지 입력"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="btn btn-primary !w-auto shrink-0 px-5 py-3"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          전송
        </button>
      </div>
      <p className="mt-2 shrink-0 text-center text-[11px] text-muted">큐핏은 참고용 조언이에요. 위급한 상황은 112·1366으로 연락하세요.</p>
    </div>
  );
}
