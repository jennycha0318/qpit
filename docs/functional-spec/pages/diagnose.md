# 진단 — Functional Spec (메인)

| 항목 | 값 |
|------|-----|
| Route | `/diagnose` |
| File | `web/src/app/diagnose/page.tsx` |
| Access | 공개 (저장만 로그인 필요) |
| Rendering | Client |
| 엔진 | `web/src/lib/diagnose/{survey,engine}.ts` |

## 목적
상황·성향을 입력받아 **타이밍 점수 + 언제·어떻게 연락 플랜 + 근거·액션·메시지**를 산출. 로그인 시 결과를 히스토리에 저장. 비로그인은 체험 후 가입 유도.

## 단계 (phase 상태머신)
1. **stage** — 상황 선택: 썸(crush) / 연애 중(dating) / 이별 후(breakup)
2. **survey** — 단계별 설문 (썸 8 / 연애 8 / 재회 9 문항 + 공통 성향/자유서술)
   - 선택지 클릭 시 0.2초 후 **자동 다음 문항**
   - 진행바 + "질문 n/total"
   - 마지막 자유서술(선택) → "진단 받기" 또는 "건너뛰고 진단하기"
   - "← 이전" : 이전 문항(첫 문항이면 상황 선택으로)
3. **result** — 결과 표시(`<Report>`) + 저장 상태

## 설문 정의
`survey.ts`의 `SURVEYS[stage]`. 공통 질문: 상대 성향(애착) · 나의 성향 · 현재 심리(조급함) · 자유서술.

## 진단 엔진 (결정적 규칙)
`engine.ts`의 `diagnose(stage, answers)` → `Diagnosis`:
- 요인(factor) 합산으로 점수(3–97 클램프) 산출
- 점수 구간(≥65 / 45–64 / <45)별 근거·액션·리스크·메시지/보류(hold)
- `makePlan` → 언제(시점)·수단·단계별 타임라인
- 안전 가드레일: 차단 시 점수 상한·연락 중단, 변심·집착 경고
- 자유서술(freeText)은 현재 엔진 미반영(추후 AI 개인화로 연결 — [ai-personalization](../../product/ai-personalization.md))

## 저장 상태 (saveStatus)
| 상태 | 의미 | UI |
|------|------|-----|
| saving | 로그인 확인/저장 중 | "결과 저장 중…" |
| saved | DB 저장 성공 | "히스토리에 저장됨" |
| error | insert 실패 | "저장에 실패했어요…" (정직 표기) |
| guest | 비로그인 | "로그인하면 저장돼요" 카드 + 회원가입/로그인 |

## 결과 화면 구성 (`<Report>`)
점수 링 → 언제·어떻게(플랜) → 판단 근거(요인) → 추천 액션 → 주의 → 메시지(또는 보류)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 상황 선택 | 설문 시작 |
| 선택지 클릭 | 답 저장 + 자동 진행 |
| 진단 받기/건너뛰기 | 엔진 실행 → 결과 |
| 다시 진단하기 | 상황 선택으로 리셋 |
| (게스트) 회원가입/로그인 | `/signup` `/login` |

## 데이터
- Reads: `getUser`(저장 여부 판단)
- Writes(로그인 시): `insert into diagnoses {stage, score, result}` (user_id=auth.uid())

## 엣지 케이스
- 비로그인 → 저장 생략, 결과는 정상 제공
- insert 실패(RLS·네트워크) → error 상태로 정직 표기(거짓 "저장됨" 금지)
- 새로고침 시 결과 유실(저장된 경우 히스토리에서 재열람)

## 관련
- Backend: [../../backend/schema.md](../../backend/schema.md) · Flow: [flow.md](../flow.md) §2, §6
