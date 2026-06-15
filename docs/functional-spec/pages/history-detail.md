# 히스토리 상세 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/history/[id]` |
| File | `web/src/app/history/[id]/page.tsx` |
| Access | 로그인 (RLS로 본인 데이터만) |
| Rendering | Server (dynamic) |

## 목적
저장된 진단 한 건을 진단 결과 화면 그대로 재열람한다.

## 동작
- `params.id`로 `supabase.from("diagnoses").select("result").eq("id",id).single()`
- 없거나 권한 없음(RLS) → `notFound()` (404)
- `result`(jsonb)를 `<Report d={result}>`로 렌더 (진단 시 화면과 동일)

## UI 요소
- "← 히스토리" 링크
- `<Report>` 전체 (점수·플랜·근거·액션·주의·메시지)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| ← 히스토리 | `/history` |
| 하단 탭 | 진단/히스토리/프로필 이동 |

## 데이터
- Reads: `diagnoses`(해당 id, 본인) · Writes: 없음

## 엣지 케이스
- 타인/존재하지 않는 id → RLS로 행 없음 → 404
- 비로그인 접근 → middleware가 `/login`으로

## 관련
- 목록: [history.md](history.md) · 렌더 컴포넌트 `web/src/components/Report.tsx`
