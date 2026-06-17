# 히스토리 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/history` |
| File | `web/src/app/history/page.tsx` |
| Access | 로그인 (middleware 보호) |
| Rendering | Server Component, `dynamic = "force-dynamic"` |

## 목적
로그인 사용자의 지난 진단 결과 목록을 최신순으로 보여준다.

## 동작
- `supabase.from("diagnoses").select("id, stage, score, result, created_at").order("created_at", { ascending: false })`
- RLS로 **본인 데이터만** 조회됨.
- 조회 실패(`error`) 시 목록 대신 에러 카드를 렌더한다.

## UI 요소
- 제목 "진단 히스토리"
- 부제 "지난 진단 결과를 다시 볼 수 있어요."
- 항목 리스트 — 각 항목(`/history/[id]` 링크):
  - 점수 배지 — 숫자는 `score`, 색상은 점수에 따라(파스텔 팔레트): ≥65 아쿠아(`#4fa3a2`) / 45–64 머스터드(`#c79a4e`) / <45 로즈(`#b96b8f`). 배경은 같은 색의 10% 틴트(`${color}1a`).
  - 라벨 — `STAGE_LABEL[stage]`(없으면 "진단") + " · " + `result.scoreTitle`(없으면 "결과")
  - 플랜 한 줄 — `result.plan.when`(없으면 빈 문자열)
  - 날짜 — `created_at`을 KST(`Asia/Seoul`)로 변환, `ko-KR` `toLocaleString`(YYYY. MM. DD. HH:mm)
- 빈 상태(0건): 제목 "아직 진단 기록이 없어요" + 안내 "첫 진단을 하면 지난 결과를 다시 볼 수 있어요." + CTA "첫 진단 시작하기"(`/diagnose`)
- 에러 상태: 제목 + 카드 "기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 항목 탭 | `/history/[id]` (상세 재열람) |
| 첫 진단 시작하기(빈 상태) | `/diagnose` |

## 상태
- 로딩/저장 상태 없음 (서버에서 1회 조회 후 렌더).
- 분기: 정상 목록 / 빈 상태(0건) / 에러 상태.

## 데이터
- Reads: `diagnoses`(본인, RLS) — `id, stage, score, result, created_at`
- Writes: 없음

## 엣지 케이스
- 기록 0건 → 빈 상태 CTA(`/diagnose`)
- 조회 실패 → 에러 카드 안내
- `result.scoreTitle` / `result.plan.when` 누락 → 각각 "결과" / 빈 문자열로 대체
- 비로그인 접근 → middleware가 보호(로그인 페이지로 이동)
- 서버 타임존(UTC)과 무관하게 날짜는 KST로 표시

## 관련
- 상세: [history-detail.md](history-detail.md) · Backend: [../../backend/schema.md](../../backend/schema.md)
