# 진단 — Functional Spec (메인)

| 항목 | 값 |
|------|-----|
| Route | `/diagnose` |
| File | `web/src/app/diagnose/page.tsx` |
| Access | 공개 (미들웨어 비보호, 비로그인 진단 가능 / 저장만 로그인 필요) |
| Rendering | Client (`"use client"`) |
| 엔진 | `web/src/lib/diagnose/{survey,engine}.ts` |
| 컴포넌트 | `web/src/components/Report.tsx`, `web/src/components/SupportNotices.tsx` |

## 목적
나이대·상황·성향을 입력받아 **타이밍 점수 + 언제·어떻게 연락 플랜 + 근거·액션·주의·메시지(또는 보류)**를 산출. 로그인 시 결과를 `diagnoses`에 저장하고, 비로그인은 체험 후 저장 유도(가입/로그인). 10대 선택 시 청소년 눈높이 모드로 톤·지지가 강화된다.

## 단계 (phase 상태머신)
`phase`: `"age" | "stage" | "survey" | "result"` (초기값 `age`)

1. **age** — 나이대 선택: `10대` / `20대` / `30대` / `40대 이상` (2열 버튼)
   - 선택 시 `ageGroup` 저장 후 `stage`로 이동
   - `10대` 선택 시 청소년 모드(`minor`) 활성 근거가 됨
2. **stage** — 상황 선택: 썸 타는 중(crush) / 연애 중(dating) / 이별 후(breakup)
   - "← 나이대" 로 age 단계로 복귀
   - 비청소년: 하단에 외도·학대 **법적·윤리 고지**(`LegalEthicsNotice`) 노출
   - 청소년(10대): 고지 대신 "편하게 골라줘요. 정답은 없어요." 안내
3. **survey** — 단계별 설문 (썸 9 / 연애 9 / 이별 후 10 문항)
   - 선택지 클릭 시 0.32초(320ms) 후 **자동 다음 문항** (연타는 `advancingRef`로 차단)
   - 진행바(`progressbar`) + "질문 n / total"
   - 마지막 문항은 자유서술(text, 선택) → "진단 받기" 또는 "건너뛰고 진단하기"
   - "← 이전": 이전 문항(첫 문항이면 상황 선택 `stage`로 리셋)
4. **result** — 결과 표시(`<Report>`) + 저장 상태(`saveStatus`) + "다시 진단하기"

## 설문 정의
`survey.ts`의 `SURVEYS[stage]`. 각 단계 고유 질문 + 공통 4문항(`COMMON`).

- **공통(COMMON)**: 상대 성향(`partner`, 애착) · 나의 성향(`selfAttach`) · 현재 심리(`urgency`, 조급함) · 자유서술(`freeText`, text)
- **썸(crush)**: 알게 된 기간(`period`) · 연락 빈도 추세(`trend`) · 반응 온도(`warmth`) · 연락 주도(`initiation`) · 호감 신호(`signals`) + 공통 4 = **9문항**
- **연애 중(dating)**: 사귄 기간(`period`) · 최근 분위기(`mood`) · 최근 갈등(`conflict`) · 갈등 해결 방식(`resolve`) · 미래 얘기(`future`) + 공통 4 = **9문항**
- **이별 후(breakup)**: 사귄 기간(`period`) · 헤어진 기간(`since`) · 이별 제안자(`who`) · 이별 이유(`reason`) · 현재 연락 상태(`contact`) · 새로운 사람(`newperson`) + 공통 4 = **10문항**

`STAGE_LABEL`: crush="썸", dating="연애 중", breakup="이별 후".

## 진단 엔진 (결정적 규칙)
`engine.ts`의 `diagnose(stage, answers)` → `Diagnosis`:
- 요인(`factor`) 합산으로 점수 산출. 시작점은 단계별 baseline(crush 50 / dating 58 / breakup 50)이며 `clamp`로 **3–97**에 가둠
- 점수 구간(≥65 / 45–64 / <45)별 `reason`·`actions`·`risks`·`msgLabel`·`msg`(또는 보류 `hold`) 결정
- `makePlan(stage, score, a)` → `plan{when, tone, channel, steps[]}` (시점·수단·단계별 타임라인)
- 안전 가드레일:
  - 이별 후 `contact === "blocked"`(상대 차단): 점수 상한 20, 전용 "연락 중단" reason/actions/hold·plan, `needsSupport=true`
  - 매달림 패턴(`clingy`)·불안(`anxiousClingy`)·상대 변심(`other_person`/`newperson`) 시 주의 문구 prepend 및 점수 감점
  - `needsSupport`(정서 위기 신호)면 결과에 상담 연결 카드 노출
- `freeText`(자유서술)는 현재 엔진 점수에 **미반영** — 기록 저장용이며 추후 AI 개인화로 연결 ([ai-personalization](../../product/ai-personalization.md))
- `minor` 플래그는 엔진이 아닌 페이지에서 설정: `finish()`에서 `d.minor = (ageGroup === "10대")`

### Diagnosis 타입
`scoreTitle, score, factors[], reason, actions[], risks[], msgLabel, msg?, hold?, plan, needsSupport?, minor?`

## 저장 상태 (saveStatus)
`"idle" | "saving" | "saved" | "error" | "guest"`. 중복 insert는 `savingRef`로 차단.

| 상태 | 의미 | UI |
|------|------|-----|
| saving | 로그인 확인/저장 중 | "결과 저장 중…" |
| saved | DB insert 성공 | "히스토리에 저장됨" (good 색) |
| error | insert 실패·예외 | "저장에 실패했어요. 네트워크·로그인 상태를 확인해 주세요." + **다시 저장** 버튼 |
| guest | 비로그인 | "이 결과를 저장할까요?" 카드 + 회원가입/로그인, 하단 "처음으로" |

## 결과 화면 구성 (`<Report>`)
순서대로:
1. 청소년 지지 배너(`MinorSupportBanner`) — `minor`일 때 **항상 최상단**
2. 점수 링(SVG 원형, 색상·badge가 65/45 경계로 분기) + `scoreTitle` + `reason`
3. 위기 상담 연결(`CrisisResources`) — `needsSupport`일 때만, `minor`면 청소년 눈높이 변형(1388 우선)
4. 언제·어떻게(`plan.when` / `channel` / `steps[]` 타임라인)
5. 이렇게 판단했어요 — `factors`에서 delta≠0만, |delta| 내림차순 **상위 6개**
6. 추천 액션(`actions`)
7. 이것만은 주의하세요(`risks`)
8. 메시지 — `hold`가 있으면 보류 카드, 없으면 `msg` 말풍선
9. 법적·윤리 고지(`LegalEthicsNotice compact`) — **비청소년(`!minor`)에게만** 하단 노출

## SupportNotices 컴포넌트
- `CrisisResources({minor})` — 자살예방 109(24시간), 청소년 상담 1388/#1388. `minor`면 부드러운 톤 + 1388 우선.
- `MinorSupportBanner()` — 청소년 결과 상단 "참고용" 안내 배너.
- `LegalEthicsNotice({compact})` — 외도·학대 법적·윤리 고지 + 대한법률구조공단 무료 법률상담 외부 링크.

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 나이대 선택 | `ageGroup` 저장 → 상황 선택(stage) |
| "← 처음으로" / "← 나이대" | 홈(`/`) / age 단계 |
| 상황 선택 | 설문 시작(survey, 답·인덱스 리셋) |
| 선택지 클릭 | 답 저장 + 320ms 후 자동 진행(마지막이면 진단) |
| 진단 받기 / 건너뛰고 진단하기 | `freeText` 포함/공백으로 엔진 실행 → 결과 |
| "← 이전" | 이전 문항(첫 문항이면 stage로) |
| 다시 진단하기 | stage 단계로 리셋(나이대는 유지) |
| (error) 다시 저장 | `saveDiagnosis` 재시도 |
| (guest) 회원가입 / 로그인 / 처음으로 | `/signup` · `/login` · `/` |

## 데이터
- Reads: `supabase.auth.getUser()` (로그인 여부 판단)
- Writes(로그인 시): `insert into diagnoses { user_id: auth.uid(), stage, score, result: d }`
  - `result`에는 `Diagnosis` 객체 전체(JSON)를 저장
- 비로그인: insert 생략, `saveStatus="guest"`

## 엣지 케이스
- 비로그인 → 저장 생략, 결과는 정상 제공(저장 유도 카드)
- insert 실패(RLS·네트워크)·예외 → `error` 상태로 정직 표기(거짓 "저장됨" 금지) + 재시도
- in-flight 중 stage 변경 방어: `saveDiagnosis(d, s)`/`finish`가 호출 시점 stage를 인자로 고정
- 빠른 연타: 설문 진행은 `advancingRef`, 저장은 `savingRef`로 중복 차단
- 이별 후 상대 차단(`blocked`): 점수 상한·전 메시지 보류·상담 연결 강제
- 새로고침 시 결과 유실(저장된 경우 히스토리에서 재열람)

## 관련
- Backend: [../../backend/schema.md](../../backend/schema.md) · Flow: [flow.md](../flow.md) §2, §6
- AI 개인화: [../../product/ai-personalization.md](../../product/ai-personalization.md)
