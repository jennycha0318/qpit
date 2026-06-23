"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, saveProfile } from "@/lib/profile";
import { YearSelect, MbtiSelect } from "@/components/InfoFields";

const ATTACH = [
  { v: "", label: "모름 / 비공개" },
  { v: "secure", label: "안정형 — 담담하게 받아들여요" },
  { v: "anxious", label: "불안형 — 계속 확인하고 싶어요" },
  { v: "avoidant", label: "회피형 — 거리를 두고 닫아요" },
];

type Status = "loading" | "idle" | "saving" | "saved" | "error";

export function ProfileEditor() {
  const [nickname, setNickname] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [mbti, setMbti] = useState("");
  const [attachment, setAttachment] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [showSavedBanner, setShowSavedBanner] = useState(false);

  // 로드된 초기값(저장된 상태)을 보관해 dirty 계산에 사용
  const initialRef = useRef({ nickname: "", birthYear: "", mbti: "", attachment: "" });
  const dirty =
    nickname !== initialRef.current.nickname ||
    birthYear !== initialRef.current.birthYear ||
    mbti !== initialRef.current.mbti ||
    attachment !== initialRef.current.attachment;

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const p = await getProfile(supabase);
        if (p) {
          const nm = p.nickname ?? "";
          const by = p.birthYear ? String(p.birthYear) : "";
          const mb = p.mbti ?? "";
          const at = p.attachment ?? "";
          setNickname(nm);
          setBirthYear(by);
          setMbti(mb);
          setAttachment(at);
          initialRef.current = { nickname: nm, birthYear: by, mbti: mb, attachment: at };
        }
      } catch {
        // 무시 — 빈 폼으로 시작
      }
      setStatus("idle");
    })();
  }, []);

  // 미저장 이탈 경고: dirty일 때만 beforeunload 핸들러 등록
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // 저장 성공 배너: 약 2.5초 후 사라짐
  useEffect(() => {
    if (!showSavedBanner) return;
    const t = setTimeout(() => setShowSavedBanner(false), 2500);
    return () => clearTimeout(t);
  }, [showSavedBanner]);

  const touch = () => setStatus((s) => (s === "saved" ? "idle" : s));

  async function save() {
    setStatus("saving");
    try {
      const supabase = createClient();
      await saveProfile(supabase, {
        nickname: nickname.trim() || null,
        birthYear: birthYear ? Number(birthYear) : null,
        mbti: mbti || null,
        attachment: attachment || null,
      });
      // 저장 성공 — 현재값을 초기값으로 갱신해 dirty 해제
      initialRef.current = { nickname, birthYear, mbti, attachment };
      setStatus("saved");
      setShowSavedBanner(true);
    } catch {
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <div className="card text-center text-sm text-muted">불러오는 중…</div>;
  }

  return (
    <div className="card">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-primaryDark">추가 정보</p>

      {showSavedBanner && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded bg-primarySoft px-3 py-2 text-center text-[13px] font-bold text-primaryDark"
        >
          저장됐어요 ✓
        </div>
      )}

      <label className="mb-1.5 block text-[13px] font-bold">닉네임</label>
      <input
        className="field-input mb-3.5"
        value={nickname}
        maxLength={20}
        placeholder="여기서 활동할 때 쓸 이름 (로그인 이름과 별개)"
        aria-label="닉네임"
        onChange={(e) => { setNickname(e.target.value); touch(); }}
      />

      <label className="mb-1.5 block text-[13px] font-bold">출생연도</label>
      <div className="mb-3.5"><YearSelect value={birthYear} onChange={(v) => { setBirthYear(v); touch(); }} /></div>

      <label className="mb-1.5 block text-[13px] font-bold">MBTI</label>
      <div className="mb-3.5"><MbtiSelect value={mbti} onChange={(v) => { setMbti(v); touch(); }} /></div>

      <label className="mb-1.5 block text-[13px] font-bold">애착 성향</label>
      <select
        className="field-input"
        value={attachment}
        aria-label="애착 성향"
        onChange={(e) => { setAttachment(e.target.value); touch(); }}
      >
        {ATTACH.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
      </select>

      <button className="btn btn-primary mt-4" onClick={save} disabled={status === "saving"}>
        {status === "saving" ? "저장 중…" : status === "saved" ? "저장됨 ✓" : "저장"}
      </button>
      {status === "error" && <p className="mt-2 text-center text-[13px] text-bad">저장에 실패했어요. 다시 시도해 주세요.</p>}
    </div>
  );
}
