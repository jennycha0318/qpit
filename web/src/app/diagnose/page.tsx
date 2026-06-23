"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SURVEYS, type Stage } from "@/lib/diagnose/survey";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { Report } from "@/components/Report";
import { fileToResized } from "@/lib/image";
import { YearSelect, MbtiSelect } from "@/components/InfoFields";
import { getProfile, saveProfile } from "@/lib/profile";
import { Logo } from "@/components/Logo";

const STAGES: { v: Stage; name: string; note: string }[] = [
  { v: "crush", name: "썸 타는 중", note: "고백 타이밍이 고민돼요" },
  { v: "unrequited", name: "짝사랑 중", note: "다가가도 될지 고민돼요" },
  { v: "dating", name: "연애 중", note: "관계가 불안해요" },
  { v: "breakup", name: "이별 후", note: "재회하고 싶어요" },
];

type Phase = "me" | "stage" | "partner" | "survey" | "analyzing" | "result";
type SaveStatus = "idle" | "saving" | "saved" | "error" | "guest";

// 뒤로가기 버튼 공통 스타일 — 설문 '이전' 버튼과 위치·모양 통일(스텝 표시 아래, 글래스 알약)
const BACK_BTN =
  "inline-block rounded-full bg-white/55 px-3 py-1.5 text-sm font-bold text-primaryDark backdrop-blur transition active:scale-95 hover:bg-white/75";

// 게스트 진단 결과 임시 보존 키(가입/로그인 직후 /diagnose 재진입 시 복원·저장)
const PENDING_KEY = "pacemaker:pendingDiagnosis";
// S2 강박 재진단 쿨다운: 진단 시각 기록(부드러운 안내, 비차단)
const DIAG_HISTORY_KEY = "pacemaker:diagHistory";
// S3 차단 후 재진단 우회 경고: 마지막 '차단' 응답 시각
const BLOCKED_AT_KEY = "pacemaker:blockedAt";

// ── 통합 진행 스텝(대단계) ──
// me/stage/partner/survey 4단계의 위치를 글래스 톤 세그먼트로 표시.
// 로그인으로 '내 정보'를 건너뛴 경우(meDone) 1번 단계는 done 처리.
const STEP_LABELS = ["내 정보", "상황", "상대", "설문"] as const;
const STEP_PHASES: Phase[] = ["me", "stage", "partner", "survey"];

function StepIndicator({ phase, meDone }: { phase: Phase; meDone: boolean }) {
  const current = STEP_PHASES.indexOf(phase);
  return (
    <div className="mb-5 flex items-center gap-2" aria-label="진행 단계" role="list">
      {STEP_LABELS.map((label, i) => {
        const isCurrent = i === current;
        const isDone = i < current || (i === 0 && meDone && current >= 0);
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5" role="listitem"
            aria-current={isCurrent ? "step" : undefined}>
            <span className={`h-1.5 w-full rounded-full transition-colors ${
              isCurrent ? "bg-primary" : isDone ? "bg-primary/55" : "bg-line"
            }`} />
            <span className={`text-[10.5px] font-bold tracking-tight ${
              isCurrent ? "text-primaryDark" : isDone ? "text-primary/80" : "text-muted/60"
            }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// 선택됨 표시용 인라인 체크 아이콘
function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-primaryDark" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

const CUR_YEAR = new Date().getFullYear();
// 청소년(청소년 모드) 판정: 연 나이 19세 이하 (안전상 넉넉히 포함)
function isMinorYear(year: number | null): boolean {
  return year != null && CUR_YEAR - year <= 19;
}

export default function DiagnosePage() {
  const [phase, setPhase] = useState<Phase>("me");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hasProfileBirth, setHasProfileBirth] = useState(false); // 로그인+생년 있으면 '내 정보' 단계 생략
  const [myBirthYear, setMyBirthYear] = useState("");
  const [myMbti, setMyMbti] = useState("");
  const [myName, setMyName] = useState(""); // 로그인 사용자 닉네임(결과 호칭용)
  const [stage, setStage] = useState<Stage>("crush");
  const [partnerBirthYear, setPartnerBirthYear] = useState("");
  const [partnerMbti, setPartnerMbti] = useState("");
  const [partnerNote, setPartnerNote] = useState(""); // 상대 자유서술(AI가 성향 추출)
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [free, setFree] = useState("");
  const [kakaoFiles, setKakaoFiles] = useState<{ url: string; file: File }[]>([]); // 카톡 캡처(최대 3)
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [overDiagnose, setOverDiagnose] = useState(false); // S2 같은 stage 24h 내 3회 이상
  const [showOverDiagnose, setShowOverDiagnose] = useState(true); // 안내 닫기
  const [blockedBypass, setBlockedBypass] = useState(false); // S3 차단 우회 경고
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedId, setSavedId] = useState<string | null>(null); // 저장된 진단 row id(채팅 연결용)
  const savingRef = useRef(false);    // 중복 저장(insert) 방지
  const advancingRef = useRef(false); // 설문 빠른 연타 방지
  const kakaoInputRef = useRef<HTMLInputElement>(null);

  // 로그인 유저면 프로필 로드 → 생년 알면 '내 정보' 단계 생략
  // 로그인 + localStorage에 게스트 진단 결과가 있으면: 저장 후 결과 화면으로 복원(우선)
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        // ── 게스트 결과 복원(로그인 상태에서만) ──
        if (user) {
          let pending: { stage: Stage; result: Diagnosis } | null = null;
          try {
            const raw = localStorage.getItem(PENDING_KEY);
            if (raw) pending = JSON.parse(raw);
          } catch {
            pending = null; // 파싱 실패 — 무시
          }
          if (pending && pending.result && pending.stage) {
            try {
              const d = pending.result;
              const { data: ins } = await supabase
                .from("diagnoses")
                .insert({ user_id: user.id, stage: pending.stage, score: d.score, result: d })
                .select("id")
                .single();
              if (ins?.id) setSavedId(ins.id as string);
            } catch {
              // insert 실패해도 결과는 보여줌(아래에서 복원)
            }
            try { localStorage.removeItem(PENDING_KEY); } catch {}
            setStage(pending.stage);
            setResult(pending.result);
            setSaveStatus("saved");
            setPhase("result");
            setLoadingProfile(false);
            return; // pending 복원이 프로필 기반 phase 결정보다 우선
          }
        }

        const p = await getProfile(supabase);
        if (p) {
          if (p.birthYear) { setMyBirthYear(String(p.birthYear)); setHasProfileBirth(true); }
          if (p.mbti) setMyMbti(p.mbti);
          if (p.name) setMyName(p.name);
          if (p.birthYear) setPhase("stage");
        }
      } catch {
        // 비로그인/오류 — 기본 'me' 단계 유지
      }
      setLoadingProfile(false);
    })();
  }, []);

  const minor = isMinorYear(myBirthYear ? Number(myBirthYear) : null);

  // stage 를 인자로 받아 in-flight 중 stage 변경에도 안전하게 저장
  async function saveDiagnosis(d: Diagnosis, s: Stage) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (!user) {
        // 게스트: 결과를 localStorage에 보존(가입/로그인 후 /diagnose 재진입 시 복원)
        try {
          localStorage.setItem(PENDING_KEY, JSON.stringify({ stage: s, result: d }));
        } catch {
          // 저장 실패는 무시(시크릿 모드 등)
        }
        setSaveStatus("guest");
        return;
      }
      const { data: ins, error } = await supabase
        .from("diagnoses")
        .insert({ user_id: user.id, stage: s, score: d.score, result: d })
        .select("id")
        .single();
      if (!error && ins?.id) setSavedId(ins.id as string);
      setSaveStatus(error ? "error" : "saved");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }

  function finish(ans: Answers) {
    const s = stage;
    const merged: Answers = { ...ans, myMbti, partnerMbti, myBirthYear, partnerBirthYear, partnerText: partnerNote };
    const d = diagnose(s, merged);
    d.minor = minor; // 생년 기반 청소년 모드

    // ── S2 강박 재진단 쿨다운: 진단 시각 기록 + 같은 stage 24h 내 3회 이상 감지 ──
    let overDiag = false;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(DIAG_HISTORY_KEY);
        const hist: { stage: Stage; ts: number }[] = raw ? JSON.parse(raw) : [];
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        // 같은 stage 24h 내 기존 기록 수 (이번 진단 포함 시 3회 이상)
        const recentSame = hist.filter((h) => h.stage === s && h.ts >= dayAgo).length;
        overDiag = recentSame + 1 >= 3;
        const next = [...hist, { stage: s, ts: now }].slice(-50); // 무한 증가 방지
        window.localStorage.setItem(DIAG_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // 무시
      }
    }
    setOverDiagnose(overDiag);
    setShowOverDiagnose(true);

    // ── S3 차단 후 재진단 우회 경고(breakup 전용, 비차단) ──
    let bypass = false;
    if (s === "breakup" && typeof window !== "undefined") {
      try {
        if (merged.contact === "blocked") {
          // 차단 응답 → 시각 저장
          window.localStorage.setItem(BLOCKED_AT_KEY, String(Date.now()));
        } else {
          // 차단 아님인데 최근 48h 내 차단 기록 있으면 우회로 간주
          const raw = window.localStorage.getItem(BLOCKED_AT_KEY);
          const blockedAt = raw ? Number(raw) : 0;
          if (blockedAt && Date.now() - blockedAt <= 48 * 60 * 60 * 1000) bypass = true;
        }
      } catch {
        // 무시
      }
    }
    setBlockedBypass(bypass);

    setPhase("analyzing"); // '분석 중' 화면 표시 → AI 보강 완료 후 결과 전환
    enrich(d, s, merged);
  }

  // AI 해석·문구 보강 — 점수·타이밍은 규칙 결과 유지. 완료(성공/폴백) 후에만 결과 페이지로 전환.
  async function enrich(d: Diagnosis, s: Stage, merged: Answers) {
    const next: Diagnosis = { ...d };
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 35000); // 이미지 분석 포함 시 더 길게(무한 대기 방지)
    try {
      // 카톡 캡처 분석(선택) — 위기 케이스 제외. 리사이즈 후 함께 분석.
      const wantImages = !d.needsSupport && kakaoFiles.length > 0;
      const imagesPayload = wantImages
        ? await Promise.all(kakaoFiles.map((p) => fileToResized(p.file))).catch(() => null)
        : null;
      const ctx = `점수:${d.score}점(${d.scoreTitle}) / 추천 타이밍:${d.plan?.when ?? ""} / 해석:${(d.reason ?? "").slice(0, 400)}`;

      const [interpretRes, imgRes] = await Promise.all([
        fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: s, answers: merged, minor, name: myName || undefined }),
          signal: ctrl.signal,
        }).catch(() => null),
        imagesPayload && imagesPayload.length
          ? fetch("/api/analyze-images", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: imagesPayload, context: ctx }),
              signal: ctrl.signal,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (interpretRes && interpretRes.ok) {
        const data = (await interpretRes.json()) as { interpretation?: string; message?: string };
        if (data.interpretation) next.reason = data.interpretation;
        if (!d.hold && data.message) next.msg = data.message;
      }
      if (imgRes && imgRes.ok) {
        const data = (await imgRes.json()) as { analysis?: string };
        if (data.analysis) next.kakaoAnalysis = data.analysis;
      }
    } catch {
      // 폴백: 규칙 결과 그대로
    } finally {
      clearTimeout(to);
      setResult(next);
      setPhase("result");
      saveDiagnosis(next, s);
    }
  }

  function selectOption(qid: string, v: string) {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    const survey = SURVEYS[stage];
    const isLast = qIndex >= survey.length - 1;
    setTimeout(() => {
      advancingRef.current = false;
      if (isLast) finish(next);
      else setQIndex((i) => i + 1);
    }, 320);
  }

  async function submitMe() {
    if (!myBirthYear) return;
    // 로그인 상태면 프로필에 저장(베스트에포트 — 구글 가입 등 생년 미수집 사용자 백필)
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) await saveProfile(supabase, { birthYear: Number(myBirthYear), mbti: myMbti || null });
    } catch {
      // 무시
    }
    setPhase("stage");
  }

  function pickStage(s: Stage) {
    setStage(s); setAnswers({}); setQIndex(0); setFree(""); setKakaoFiles([]);
    setPartnerBirthYear(""); setPartnerMbti(""); setPartnerNote("");
    setPhase("partner");
  }

  function reset() {
    setPhase("stage"); setAnswers({}); setQIndex(0); setResult(null);
    setFree(""); setKakaoFiles([]); setSaveStatus("idle"); setPartnerBirthYear(""); setPartnerMbti(""); setPartnerNote(""); setSavedId(null);
  }

  // ── 프로필 로딩 중 ──
  if (loadingProfile) {
    return <div className="card text-center text-sm text-muted">불러오는 중…</div>;
  }

  // ── 내 정보 (생년 + 내 MBTI) ──
  if (phase === "me") {
    return (
      <div className="min-h-[calc(100svh-9rem)]">
        <StepIndicator phase="me" meDone={hasProfileBirth} />
        {!hasProfileBirth && <Link href="/" className={BACK_BTN}>← 처음으로</Link>}
        <h2 className="mb-6 mt-3 text-[26px] font-bold tracking-tight">먼저, 당신에 대해 알려주세요</h2>

        <label className="mb-1.5 block text-[13px] font-bold">출생연도</label>
        <div className="mb-4"><YearSelect value={myBirthYear} onChange={setMyBirthYear} ariaLabel="내 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">내 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-1.5"><MbtiSelect value={myMbti} onChange={setMyMbti} ariaLabel="내 MBTI" /></div>
        <p className="mb-5 text-[12.5px] text-muted">MBTI는 참고 요소예요. 몰라도 진단에는 문제없어요.</p>

        <button className="btn btn-primary" onClick={submitMe} disabled={!myBirthYear}>다음</button>
      </div>
    );
  }

  // ── 상황 선택 ──
  if (phase === "stage") {
    return (
      <div className="min-h-[calc(100svh-9rem)]">
        <StepIndicator phase="stage" meDone={hasProfileBirth} />
        <button onClick={() => setPhase("me")} className={BACK_BTN}>← 내 정보</button>
        <h2 className="mb-6 mt-3 text-[26px] font-bold tracking-tight">지금 어떤 상황인가요?</h2>
        <div className="flex flex-col gap-3.5">
          {STAGES.map((s) => (
            <button key={s.v} onClick={() => pickStage(s.v)}
              className="flex items-center justify-between rounded-[18px] border border-white/60 bg-white/60 p-5 text-left backdrop-blur transition active:scale-[0.98] hover:border-primary">
              <span>
                <span className="block text-lg font-bold">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.note}</span>
              </span>
              <span className="text-xl text-muted" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 상대 정보 (선택) ──
  if (phase === "partner") {
    return (
      <div className="min-h-[calc(100svh-9rem)]">
        <StepIndicator phase="partner" meDone={hasProfileBirth} />
        <button onClick={() => setPhase("stage")} className={BACK_BTN}>← 상황</button>
        <h2 className="mb-6 mt-3 text-[26px] font-bold tracking-tight">상대에 대해 아는 게 있나요?</h2>

        <label className="mb-1.5 block text-[13px] font-bold">상대 출생연도 <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-4"><YearSelect value={partnerBirthYear} onChange={setPartnerBirthYear} ariaLabel="상대 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">상대 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-4"><MbtiSelect value={partnerMbti} onChange={setPartnerMbti} ariaLabel="상대 MBTI" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">상대는 어떤 사람인가요? <span className="font-normal text-muted">(선택)</span></label>
        <textarea
          className="field-input min-h-[100px] resize-y leading-relaxed"
          placeholder="예) 평소 표현이 적은 편이고, 바쁘면 연락이 뜸해져요. 최근 제 연락에 답이 느려졌어요…"
          aria-label="상대에 대한 설명"
          value={partnerNote}
          onChange={(e) => setPartnerNote(e.target.value)}
        />
        <p className="mb-5 mt-1.5 text-[12.5px] text-muted">적어주시면 상대 성향까지 함께 분석해 더 맞춤 조언을 드려요.</p>

        <button className="btn btn-primary" onClick={() => setPhase("survey")}>다음</button>
        <button className="btn btn-ghost mt-2.5" onClick={() => { setPartnerBirthYear(""); setPartnerMbti(""); setPartnerNote(""); setPhase("survey"); }}>모르겠어요 · 건너뛰기</button>
      </div>
    );
  }

  // ── 분석 중 (AI 해석·문구 완료까지) ──
  if (phase === "analyzing") {
    return (
      <div className="flex min-h-[calc(100svh-9rem)] flex-col items-center justify-center gap-4 text-center">
        <div className="pm-bounce"><Logo size={72} decorative /></div>
        <p className="text-lg font-bold text-ink">결과를 분석하고 있어요</p>
        <p className="text-sm leading-relaxed text-muted">상황에 맞는 해석과 제안을 준비하는 중이에요.<br />잠시만 기다려 주세요…</p>
      </div>
    );
  }

  // ── 결과 ──
  if (phase === "result" && result) {
    return (
      <div>
        {saveStatus === "saving" && <p className="mb-3 text-center text-xs text-muted">결과 저장 중…</p>}
        {saveStatus === "saved" && <p className="mb-3 text-center text-xs text-good">히스토리에 저장됨</p>}
        {saveStatus === "error" && (
          <div className="mb-3 text-center">
            <p className="text-xs text-bad">저장에 실패했어요. 네트워크·로그인 상태를 확인해 주세요.</p>
            <button className="mt-1.5 text-xs font-bold text-primaryDark underline"
              onClick={() => result && saveDiagnosis(result, stage)}>다시 저장</button>
          </div>
        )}

        {saveStatus === "guest" && (
          <div className="mb-4 rounded-2xl border border-primary bg-primarySoft p-4 text-center">
            <p className="text-sm font-bold text-ink">이 결과를 저장할까요?</p>
            <p className="mb-3 mt-1 text-[13px] text-muted">로그인하면 진단 결과가 히스토리에 저장돼 언제든 다시 볼 수 있어요.</p>
            <div className="flex gap-2">
              <Link href="/signup" className="btn btn-primary flex-1 text-center">회원가입</Link>
              <Link href="/login" className="btn btn-ghost flex-1 text-center">로그인</Link>
            </div>
          </div>
        )}

        {/* S3 차단 후 재진단 우회 경고(비차단) */}
        {blockedBypass && (
          <div className="mb-4 rounded-2xl border border-warn/40 bg-warn/10 p-4">
            <p className="text-sm font-bold text-ink">얼마 전 ‘상대가 차단했다’고 하셨어요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              답을 바꿔도 상대의 차단 상태는 달라지지 않아요. 지금은 거리를 두는 게 안전해요.
            </p>
          </div>
        )}

        {/* S2 강박 재진단 쿨다운 안내(글래스, 비차단, 닫기 가능) */}
        {overDiagnose && showOverDiagnose && (
          <div className="mb-4 rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">하루에 여러 번 진단하고 있어요</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  마음이 많이 불안하다는 신호일 수 있어요. 잠시 쉬어가도 괜찮아요. 결과는 크게 달라지지 않아요.
                </p>
              </div>
              <button onClick={() => setShowOverDiagnose(false)}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-muted transition hover:bg-white/70"
                aria-label="안내 닫기">닫기</button>
            </div>
          </div>
        )}

        <Report d={result} diagnosisId={savedId ?? undefined} />
        <button className="btn btn-ghost mt-5" onClick={reset}>다시 진단하기</button>
        {saveStatus === "guest" && (
          <Link href="/" className="btn btn-ghost mt-3 block text-center">처음으로</Link>
        )}
      </div>
    );
  }

  // ── 설문 (마지막 단계는 카톡 캡처 분석(선택) = N/N) ──
  const survey = SURVEYS[stage];
  const total = survey.length + 1;
  const isImageStep = qIndex >= survey.length;
  const q = survey[qIndex];

  return (
    <div className="min-h-[calc(100svh-9rem)]">
      <StepIndicator phase="survey" meDone={hasProfileBirth} />
      <button onClick={() => (qIndex > 0 ? setQIndex(qIndex - 1) : setPhase("partner"))} className={BACK_BTN}>← 이전</button>
      <div className="my-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar" aria-label="설문 진행률" aria-valuemin={0} aria-valuemax={total} aria-valuenow={qIndex + 1}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${((qIndex + 1) / total) * 100}%` }} />
      </div>
      <p className="mb-2.5 text-[13px] font-bold text-primaryDark">질문 {qIndex + 1} / {total}</p>

      {isImageStep ? (
        <div>
          <h2 className="mb-2 text-[25px] font-bold leading-snug tracking-tight">카톡 대화도 분석해볼까요?</h2>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            상대와의 카톡 캡처(최대 3장)를 올리면 상대의 관심도·온도·연락 패턴을 함께 분석해 드려요.{" "}
            <b className="text-primaryDark">추가 분석(유료 예정)</b> · 캡처 없이 진단해도 돼요.
          </p>
          <input
            ref={kakaoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-label="카톡 캡처 선택"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 3);
              setKakaoFiles(files.map((file) => ({ url: URL.createObjectURL(file), file })));
            }}
          />
          <button
            type="button"
            onClick={() => kakaoInputRef.current?.click()}
            className="w-full rounded-2xl border border-dashed border-accent/50 bg-white/50 py-4 text-sm font-bold text-primaryDark transition active:scale-[0.98] hover:bg-white/70"
          >
            캡처 선택 (최대 3장)
          </button>
          {kakaoFiles.length > 0 && (
            <div className="mt-3 flex gap-2">
              {kakaoFiles.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt={`캡처 ${i + 1}`} className="h-16 w-16 rounded-lg border border-line object-cover" />
              ))}
            </div>
          )}
          <button className="btn btn-primary mt-4" onClick={() => finish({ ...answers, freeText: free })}>
            {kakaoFiles.length > 0 ? `진단하기 (캡처 ${kakaoFiles.length}장 포함)` : "진단하기"}
          </button>
        </div>
      ) : q.type === "text" ? (
        <div>
          <h2 className="mb-6 text-[25px] font-bold leading-snug tracking-tight">{q.title}</h2>
          {q.desc && <p className="-mt-4 mb-3.5 text-sm text-muted">{q.desc}</p>}
          <textarea className="field-input min-h-[140px] resize-y leading-relaxed" placeholder={q.placeholder}
            aria-label={q.title} value={free} onChange={(e) => setFree(e.target.value)} />
          <button className="btn btn-primary mt-3.5" onClick={() => setQIndex(qIndex + 1)}>다음</button>
        </div>
      ) : (
        <div>
          <h2 className="mb-6 text-[25px] font-bold leading-snug tracking-tight">{q.title}</h2>
          <div className="flex flex-col gap-2.5">
            {q.options!.map((opt) => {
              const selected = answers[q.id] === opt.v;
              return (
                <button key={opt.v} onClick={() => selectOption(q.id, opt.v)} aria-pressed={selected}
                  className={`flex items-start justify-between gap-3 rounded-[14px] border p-4 text-left text-base backdrop-blur transition active:scale-[0.99] ${
                    selected ? "border-primary bg-primarySoft font-bold ring-1 ring-primary/40" : "border-white/60 bg-white/60 hover:border-primary"
                  }`}>
                  <span>
                    {opt.label}
                    {opt.note && <span className="mt-0.5 block text-xs font-normal text-muted">{opt.note}</span>}
                  </span>
                  {selected && (
                    <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-bold text-primaryDark">
                      <CheckIcon />선택됨
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
