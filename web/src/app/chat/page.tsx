"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/profile";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "안녕하세요, 큐핏이에요. 방금 받은 진단이나 연애 고민에 대해 편하게 물어보세요. 무엇이 궁금하세요?",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [name, setName] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // 컨텍스트 로드: ① 결과 페이지에서 넘어온 handoff 우선(1회 소비) → ② 없으면 로그인 사용자의 최근 진단
  useEffect(() => {
    let handoff = "";
    try {
      handoff = sessionStorage.getItem("qpit:chatContext") || "";
      if (handoff) {
        setContext(handoff);
        sessionStorage.removeItem("qpit:chatContext");
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
        if (p?.name) setName(p.name);
        if (handoff) return; // 결과 핸드오프가 있으면 DB 최근 진단 조회 생략
        const { data: rows } = await supabase
          .from("diagnoses")
          .select("stage, score, result, created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        const r = rows?.[0] as { stage?: string; result?: Record<string, unknown> } | undefined;
        const d = r?.result as
          | { scoreTitle?: string; score?: number; reason?: string; plan?: { when?: string } }
          | undefined;
        if (d) {
          setContext(
            `상황:${r?.stage ?? ""} / 점수:${d.score ?? "-"}점(${d.scoreTitle ?? ""}) / 추천 타이밍:${d.plan?.when ?? ""} / 해석:${d.reason ?? ""}`,
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
        body: JSON.stringify({ messages: next, context, name: name || undefined }),
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
    <div className="flex h-[calc(100svh-12rem)] flex-col">
      <h2 className="text-[22px] font-bold tracking-tight">큐핏 상담</h2>
      <p className="mb-3 text-[12.5px] text-muted">진단 결과나 연애 고민을 편하게 물어보세요.</p>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
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

      <div className="flex items-end gap-2 border-t border-line pt-2.5">
        <textarea
          className="field-input max-h-28 min-h-[46px] flex-1 resize-none py-3"
          rows={1}
          placeholder="메시지를 입력하세요"
          aria-label="메시지 입력"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          className="btn btn-primary !w-auto shrink-0 px-5 py-3"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          전송
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">큐핏은 참고용 조언이에요. 위급한 상황은 112·1366으로 연락하세요.</p>
    </div>
  );
}
