# 히스토리 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/history` |
| File | `web/src/app/history/page.tsx` |
| Access | 로그인 (middleware 보호) |
| Rendering | Server (dynamic) |

## 목적
로그인 사용자의 지난 진단 결과 목록을 최신순으로 보여준다.

## 동작
- `supabase.from("diagnoses").select("id,stage,score,result,created_at").order("created_at",{ascending:false})`
- RLS로 **본인 데이터만** 조회됨.

## UI 요소
- 제목 "진단 히스토리"
- 항목 리스트 — 각 항목:
  - 점수 배지 (색: ≥65 초록 / 45–64 주황 / <45 빨강)
  - 상황 라벨 + 진단 타이틀 (예: "이별 후 · 재회 시도 적정도")
  - 플랜 한 줄 (`result.plan.when`)
  - 날짜 (YYYY.MM.DD HH:mm)
- 빈 상태: "아직 진단 기록이 없어요" + "새 진단 시작하기"(`/diagnose`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 항목 탭 | `/history/[id]` (상세 재열람) |
| 새 진단 시작하기(빈 상태) | `/diagnose` |
| 하단 탭 | 진단/프로필 이동 |

## 데이터
- Reads: `diagnoses`(본인) · Writes: 없음

## 엣지 케이스
- 기록 0건 → 빈 상태 CTA
- 비로그인 접근 → middleware가 `/login`으로

## 관련
- 상세: [history-detail.md](history-detail.md) · Backend: [../../backend/schema.md](../../backend/schema.md)
