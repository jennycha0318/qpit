# 진단 — Functional Spec (메인)

| 항목 | 값 |
|------|-----|
| Route | `/diagnose` |
| File | `web/src/app/diagnose/page.tsx` |
| Access | 공개 (미들웨어 비보호, 비로그인 진단 가능 / 저장만 로그인 필요) |
| Rendering | Client (`"use client"`) |
| 엔진 | `web/src/lib/diagnose/{survey,engine,personality}.ts` |
| 컴포넌트 | `web/src/components/Report.tsx`, `web/src/components/SupportNotices.tsx`, `web/src/components/InfoFields.tsx` |
| 프로필 | `web/src/lib/profile.ts` (`getProfile`/`saveProfile`), `web/supabase/schema.sql`(`profiles`) |

## 목적
**내 정보·상황·성향**을 입력받아 **타이밍 점수 + 언제·어떻게 연락 플랜 + 근거·액션·주의·메시지(또는 보류)**를 산출. 로그인 시 결과를 `diagnoses`에 저장하고, 비로그인은 체험 후 저장 유도(가입/로그인). **생년(연나이 ≤19) 기반 청소년 판정** 시 청소년 눈높이 모드로 톤·지지가 강화된다. 상대 정보(생년·MBTI)·나이차·MBTI 궁합은 **점수 미반영 '참고 레이어'**로만 제공한다.

## 단계 (phase 상태머신) — 구현됨
`phase`: `"me" | "stage" | "partner" | "survey" | "result"` (초기값 `me`)

> **변경**: 기존 `age`(나이대 버킷: 10대/20대/30대/40대 이상) 단계는 **폐지**. 대신 출생연도를 직접 받는 **`me`(내 정보)** 단계와, 상대 생년·MBTI를 받는 **`partner`(상대 정보, 선택)** 단계가 신설됨. 청소년 판정 기준도 '10대 선택'에서 **생년(연나이 ≤19)** 으로 변경.

0. **프로필 로딩(loadingProfile)** — 진입 시 `getProfile()` 호출. 로그인 + 프로필에 생년이 있으면 `myBirthYear`/`myMbti`를 채우고 **`me` 단계를 건너뛰어 바로 `stage`로 이동**(`hasProfileBirth=true`). 로딩 중에는 "불러오는 중…" 표시.
1. **me** — 내 정보: 출생연도(필수, `YearSelect`) + 내 MBTI(선택, `MbtiSelect`)
   - "← 처음으로"로 홈(`/`) 복귀
   - 출생연도 미선택 시 '다음' 비활성
   - '다음'(`submitMe`) 시 로그인 상태면 `saveProfile`로 프로필 백필(베스트에포트, 구글 가입 등 생년 미수집 사용자 대비) 후 `stage`로 이동
   - 출생연도가 청소년(연나이 ≤19) 모드(`minor`)의 판정 근거가 됨
2. **stage** — 상황 선택: 썸 타는 중(crush) / 연애 중(dating) / 이별 후(breakup)
   - `hasProfileBirth`면 "← 처음으로", 아니면 "← 내 정보"로 `me` 단계 복귀
   - 비청소년: 하단에 외도·학대 **법적·윤리 고지**(`LegalEthicsNotice`) 노출
   - 청소년(`minor`): 고지 대신 "편하게 골라줘요. 정답은 없어요." 안내
   - 상황 선택(`pickStage`) 시 답·인덱스·상대정보 리셋 후 **`partner`로 이동**
3. **partner** — 상대 정보(선택): 상대 출생연도(선택) + 상대 MBTI(선택)
   - "← 상황"으로 `stage` 복귀
   - '다음'은 입력값을 그대로 들고 `survey`로, **'모르겠어요 · 건너뛰기'는 상대정보를 비우고** `survey`로 이동(건너뛰어도 진단 정확도 동일)
   - 안내: "알면 궁합·소통 팁을 더해드려요. 몰라도 괜찮아요" / "상대 정보는 제3자 정보라 꼭 필요한 만큼만" / "MBTI·나이차는 참고 요소"
4. **survey** — 단계별 설문 (썸 9 / 연애 9 / 이별 후 10 문항)
   - 선택지 클릭 시 0.32초(320ms) 후 **자동 다음 문항** (연타는 `advancingRef`로 차단)
   - 진행바(`progressbar`) + "질문 n / total"
   - 마지막 문항은 자유서술(text, 선택) → "진단하기"
   - "← 이전": 이전 문항(첫 문항이면 **상대 정보 `partner`로 리셋**)
5. **result** — 결과 표시(`<Report>`) + 저장 상태(`saveStatus`) + "다시 진단하기"

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
- `minor` 플래그는 엔진이 아닌 페이지에서 설정: `finish()`에서 `d.minor = minor`(= `isMinorYear(myBirthYear)`, **생년 기반 연나이 ≤19**)

### 성향·궁합 '참고' 레이어 (`personality.ts`) — 구현됨, **점수 미반영**
`diagnose()`가 `res.compat = computePersonality(a)`를 채움(`Compat`). MBTI·나이차는 **신뢰도가 낮아 결정적 점수에 반영하지 않고** 개인화·참고용으로만 노출한다. 핵심 판단은 여전히 규칙 엔진의 신호(애착·행동·맥락)가 담당한다.
- **상대 MBTI → 소통 톤 팁(`tips[]`)**: E/I·S/N·T/F·J/P 4축별 연락·메시지 톤 한 줄(우리 결과의 '언제·어떻게'와 연결)
- **나/상대 MBTI → 궁합 한 줄(`mbtiNote`)**: 일치 글자 수(≥3 / 2 / 그 외)에 따른 가벼운 코멘트
- **생년 → 나이차 코멘트(`ageGapNote`)**: 두 생년이 모두 있을 때만, 차이 ≥10 / ≥6 구간에 한 줄
- 입력이 없으면(`tips`·`mbtiNote`·`ageGapNote` 모두 없음) `compat`은 `undefined`
- 입력은 페이지가 `finish()`에서 설문 답에 병합: `{ ...ans, myMbti, partnerMbti, myBirthYear, partnerBirthYear }`. 즉 MBTI·나이차는 '예측의 핵심 무기'가 아니라 **참여·개인화 레이어**다.

### Diagnosis 타입
`scoreTitle, score, factors[], reason, actions[], risks[], msgLabel, msg?, hold?, plan, needsSupport?, minor?, compat?`
- `Compat`(`personality.ts`): `tips: string[]`, `mbtiNote?`, `ageGapNote?`

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
9. **성향·궁합 (참고)** — `compat`이 있을 때만. 제목에 '참고' 배지 + `mbtiNote`·`ageGapNote`·`tips[]`, 하단 고지 "MBTI·나이차는 참고 요소예요. 핵심 판단은 위의 신호(연락 흐름·반응·마음 상태)를 기준으로 해요." (**점수 미반영 명시**)
10. 법적·윤리 고지(`LegalEthicsNotice compact`) — **비청소년(`!minor`)에게만** 하단 노출

## SupportNotices 컴포넌트
- `CrisisResources({minor})` — 자살예방 109(24시간), 청소년 상담 1388/#1388. `minor`면 부드러운 톤 + 1388 우선.
- `MinorSupportBanner()` — 청소년 결과 상단 "참고용" 안내 배너.
- `LegalEthicsNotice({compact})` — 외도·학대 법적·윤리 고지 + 대한법률구조공단 무료 법률상담 외부 링크.

## 사용자 액션
| 액션 | 결과 |
|------|------|
| (me) 출생연도·MBTI 입력 → 다음 | `submitMe`: 로그인 시 `saveProfile` 백필 후 상황 선택(stage) |
| "← 처음으로" / "← 내 정보" | 홈(`/`) / `me` 단계(`hasProfileBirth` 여부로 분기) |
| 상황 선택 | `pickStage`: 답·인덱스·상대정보 리셋 후 **상대 정보(partner)** 이동 |
| (partner) 다음 | 입력값 유지한 채 설문(survey)으로 |
| (partner) 모르겠어요 · 건너뛰기 | 상대 생년·MBTI 비우고 설문(survey)으로 |
| "← 상황" | partner → stage 복귀 |
| 선택지 클릭 | 답 저장 + 320ms 후 자동 진행(마지막이면 진단) |
| 진단하기 | `freeText` 포함으로 엔진 실행 → 결과 |
| "← 이전" | 이전 문항(첫 문항이면 **partner로**) |
| 다시 진단하기 | `reset`: stage 단계로 리셋(내 정보는 유지, 상대정보는 초기화) |
| (error) 다시 저장 | `saveDiagnosis` 재시도 |
| (guest) 회원가입 / 로그인 / 처음으로 | `/signup` · `/login` · `/` |

## 데이터
- Reads:
  - `getProfile(supabase)` — 진입 시 프로필 로드(`birthYear`/`mbti`). `profiles` 테이블 우선, `user_metadata` 폴백 — **테이블 미생성 시에도 메타데이터로 동작**. 생년 있으면 `me` 단계 생략.
  - `supabase.auth.getUser()` — 저장 시 로그인 여부 판단
- Writes:
  - (me '다음', 로그인 시) `saveProfile(supabase, { birthYear, mbti })` — `profiles` upsert + `auth.updateUser` 메타데이터 동기화(둘 중 하나만 성공해도 OK). 베스트에포트(실패해도 진단 진행).
  - (결과 저장, 로그인 시) `insert into diagnoses { user_id: auth.uid(), stage, score, result: d }`. `result`에는 `Diagnosis` 객체 전체(JSON, `compat` 포함)를 저장.
- 비로그인: insert 생략, `saveStatus="guest"`
- `profiles` 테이블(`web/supabase/schema.sql`): `id uuid PK = auth.users(id) on delete cascade`, `birth_year int`, `mbti text`, `attachment text`, `updated_at timestamptz`. RLS 본인전용 select/insert/update.

## 엣지 케이스
- 비로그인 → `me` 단계부터 시작(프로필 없음), 저장 생략, 결과는 정상 제공(저장 유도 카드)
- `profiles` 테이블 미생성/조회 실패 → `getProfile`이 메타데이터로 폴백(빈 폼이면 `me` 단계 정상 진행)
- 상대 정보 미입력/건너뛰기 → `compat`이 `undefined`이거나 일부만 채워져 '성향·궁합(참고)' 카드가 생략/축약. **진단 점수·핵심 판단은 동일**(참고 레이어라 점수 미반영)
- insert 실패(RLS·네트워크)·예외 → `error` 상태로 정직 표기(거짓 "저장됨" 금지) + 재시도
- in-flight 중 stage 변경 방어: `saveDiagnosis(d, s)`/`finish`가 호출 시점 stage를 인자로 고정
- 빠른 연타: 설문 진행은 `advancingRef`, 저장은 `savingRef`로 중복 차단
- 이별 후 상대 차단(`blocked`): 점수 상한·전 메시지 보류·상담 연결 강제
- 새로고침 시 결과 유실(저장된 경우 히스토리에서 재열람)

## 관련
- Backend: [../../backend/schema.md](../../backend/schema.md) · Flow: [flow.md](../flow.md) §2, §6
- AI 개인화: [../../product/ai-personalization.md](../../product/ai-personalization.md)
