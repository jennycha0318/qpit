# 히스토리 상세 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/history/[id]` |
| File | `web/src/app/history/[id]/page.tsx` |
| Access | 로그인 필요 (미들웨어가 `/history` 접두사 보호, RLS로 본인 데이터만) |
| Rendering | Server (`export const dynamic = "force-dynamic"`) |

## 목적
저장된 진단 한 건을 진단 결과 화면 그대로 재열람한다.

## UI 요소
- "← 히스토리" 링크 (`text-sm text-muted`)
- `<Report d={d} />` 전체 (점수·플랜·근거 등 진단 결과 화면과 동일)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| ← 히스토리 | `/history`로 이동 |

## 상태
- 서버 컴포넌트로, 클라이언트 상태 없음. 데이터 유효성 검증 결과에 따라 정상 렌더 또는 404.

## 데이터
- `params`는 `Promise<{ id: string }>`로 `await` 후 `id` 추출.
- `supabase.from("diagnoses").select("result").eq("id", id).single()` (서버 클라이언트 `@/lib/supabase/server`).
- `result`(jsonb)를 `Diagnosis` 타입(`@/lib/diagnose/engine`)으로 캐스팅해 `<Report>`에 전달.
- Reads: `diagnoses`(해당 id, RLS로 본인 행) · Writes: 없음

## 엣지 케이스
- 조회 에러 / 행 없음 / `result` 없음 / `result`가 객체 아님 → `notFound()` (404).
- 깨진 데이터(`score`가 number 아님, `plan` 없음, `factors`가 배열 아님) → `Report` 크래시 대신 `notFound()` (404).
- 타인/존재하지 않는 id → RLS로 행 없음 → 404.
- 비로그인 접근 → 미들웨어(`web/src/lib/supabase/middleware.ts`, 보호 접두사 `/home`·`/history`·`/profile`)가 `/login`으로 리다이렉트.

## 관련
- 목록: [history.md](history.md)
- 렌더 컴포넌트: `web/src/components/Report.tsx`
- 진단 타입: `web/src/lib/diagnose/engine.ts`
