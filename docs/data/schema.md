# 데이터 모델 (참고용 정규화 모델 · 대부분 미구현)

> ⚠️ **실제 백엔드/DB는 [../backend/schema.md](../backend/schema.md)** 가 단일 진실입니다 (Supabase).
> 이 문서는 향후 정규화(cases/feedback 등) 방향을 위한 **참고 모델**이며, 아래 엔티티 대부분은 **현재 미구현(계획)**입니다.
>
> **현재 실제 DB(2026-06 MVP)**: Supabase Postgres에 `diagnoses` + `profiles` 두 테이블 존재.
> - `diagnoses`: `id`, `user_id`, `stage`, `score`, `result` jsonb, `created_at` + 본인 전용 RLS.
> - `profiles`(신설·구현됨): `id`(=auth.users), `birth_year`, `mbti`, `attachment`, `updated_at` + 본인 전용 RLS.
> 컬럼/타입 정의는 [`web/supabase/schema.sql`](../../web/supabase/schema.sql) 및 [../backend/schema.md](../backend/schema.md) 참고.
> 아래의 `User`/`Case`/`Event`/`Feedback` 및 그 필드는 **이 문서에만 있는 계획 모델**로, 실제 테이블·컬럼과 일치하지 않습니다.
> `Profile`은 일부 필드(`birth_year`/`mbti`/`attachment`)가 **구현됨**(실제 `profiles` 테이블)이며, 그 외 정규화 필드는 아직 계획입니다.

## 엔티티 관계 (일부 구현 · 대부분 계획)
```
User 1──1 Profile       (부분 구현 — profiles 테이블: birth_year/mbti/attachment)
User 1──N Case          (계획)
Case 1──N Diagnosis     (계획 — 현재는 diagnoses 단일 테이블, Case 없음)
Case 1──N Event         (v2: 타임라인, 계획)
Diagnosis 1──1 Feedback (데이터 플라이휠, 계획)
```
> 현재 MVP는 `Case` 묶음 없이 진단 1건이 `diagnoses` 한 행으로 독립 저장됩니다.
> `Profile`은 `User`(=`auth.users`)와 1:1로 `profiles` 테이블(PK = `auth.users.id`)에 구현돼 있습니다.

## 엔티티 요약
> 아래는 계획 모델의 필드명입니다. **현재 구현된 `Diagnosis` 결과의 실제 필드명은 다릅니다**
> (`web/src/lib/diagnose/engine.ts`의 `Diagnosis` 타입: `scoreTitle`, `score`, `factors[]`, `reason`,
> `actions[]`, `risks[]`, `msgLabel`, `msg`, `hold`, `plan`, `needsSupport`, `minor`).

| 엔티티 | 상태 | 역할 | 핵심 필드 (계획) |
|--------|------|------|-----------|
| **User** | 계획 (현재는 Supabase `auth.users`) | 사용자 (게스트 진단 허용) | email?, ageRange, gender? |
| **Profile** | **부분 구현됨** (`profiles` 테이블) | 영속 입력·성향 프로필 (진단 개인화·안전 판정) | **구현**: birth_year, mbti, attachment, updated_at · **계획**: loveValues, conflictStyle |
| **Case** | 계획 | 한 건의 연애 고민 | stage, durationDays, lastContactAt, contactTrend, partnerAttachment |
| **Diagnosis** | **구현됨** (규칙기반, 비-LLM) | 진단 결과 (diagnoses 테이블에 저장) | timingScore, timingLabel, actions[], risks[], generatedMessage |
| **Event** | 계획 (v2) | 케이스 타임라인 | type, occurredAt |
| **Feedback** | 계획 (미구현) | 결과 피드백 (데이터 플라이휠) | followed, outcome |

## Profile 엔티티 (구현됨 · `profiles` 테이블)
> 위 계획 모델의 `Profile`(성향 프로필) 중 **영속 입력 3종(birth_year/mbti/attachment)이 실제로 구현**되었습니다.
> SQL 원본 [`web/supabase/schema.sql`](../../web/supabase/schema.sql) · 읽기/저장 [`web/src/lib/profile.ts`](../../web/src/lib/profile.ts).

### 실제 컬럼 (`public.profiles`)
| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | uuid | — | PK = `auth.users(id)` (`on delete cascade`). User 1:1 |
| `birth_year` | int | null | 출생연도 — 청소년/성인 판정·나이차 참고 |
| `mbti` | text | null | 4글자 MBTI 또는 null(비공개/모름) |
| `attachment` | text | null | `secure` / `anxious` / `avoidant` / null |
| `updated_at` | timestamptz | `now()` | 갱신 시각 |

- **RLS(본인 전용)**: `profiles_select_own` / `profiles_insert_own` / `profiles_update_own` — 모두 `auth.uid() = id`. (delete 정책은 없음)
- **읽기/저장**: [`web/src/lib/profile.ts`](../../web/src/lib/profile.ts)의 `getProfile`/`saveProfile`.
  - **`profiles` 테이블 우선 + `user_metadata` 폴백**: 테이블이 미생성이거나 조회·저장이 실패해도 `auth.users.user_metadata`(birth_year/mbti/attachment)로 동작. `saveProfile`은 메타데이터·테이블 양쪽에 베스트에포트로 기록하고, 둘 다 실패할 때만 에러.
  - 앱 타입 `Profile`은 카멜케이스(`birthYear`/`mbti`/`attachment`/`name`)이며 `name`은 메타데이터에서만 옵니다(컬럼 없음).

### 수집·사용 경로 (구현됨)
- **가입** ([`web/src/app/signup/page.tsx`](../../web/src/app/signup/page.tsx)): 출생연도(필수)·MBTI(선택) 수집 → 프로필+메타데이터 저장. 동의 문구에 출생연도·MBTI 반영.
- **프로필 편집** ([`web/src/app/profile/page.tsx`](../../web/src/app/profile/page.tsx) + [`components/ProfileEditor.tsx`](../../web/src/components/ProfileEditor.tsx)): 출생연도·MBTI·애착 성향 **편집·저장 가능**(이전엔 읽기전용). 로그아웃은 '계정 관리' 그룹.
- **진단 플로우** ([`web/src/app/diagnose/page.tsx`](../../web/src/app/diagnose/page.tsx)): 단계 = 내 정보(생년+내 MBTI) → 상황(stage) → 상대 정보(상대 생년·MBTI, 선택·건너뛰기) → 설문 → 결과. 로그인+프로필 생년이 있으면 '내 정보' 단계 생략. 이전 '나이대(10대/20대…) 버킷' 단계는 폐지.
  - **청소년(minor) 판정 = 생년 기반**(연나이 ≤19, `CUR_YEAR - birth_year ≤ 19`). 이전 '10대 선택' 방식에서 변경.

### MBTI·궁합·나이차 = 참고 레이어 (★점수 미반영)
- 엔진([`web/src/lib/diagnose/engine.ts`](../../web/src/lib/diagnose/engine.ts)) + [`personality.ts`](../../web/src/lib/diagnose/personality.ts)에 **성향·궁합 '참고' 레이어**가 신설됨: 상대 MBTI→소통 톤 팁, 나/상대 MBTI→궁합 한 줄, 생년→나이차 코멘트.
- 결과는 `Diagnosis.compat`(`Compat = { tips[], mbtiNote?, ageGapNote? }`) 필드로 담김. `result` jsonb에 함께 저장됨(별도 컬럼 아님).
- **결정적 규칙 점수에는 일절 반영되지 않습니다**(`computePersonality`는 점수 계산과 분리). 즉 MBTI/나이차는 '예측 핵심'이 아니라 **개인화·참여용 참고 레이어**입니다. 진단 엔진은 여전히 규칙기반(결정적).
- 결과 화면([`web/src/components/Report.tsx`](../../web/src/components/Report.tsx))에 '성향·궁합 (참고)' 카드 + "MBTI·나이차는 참고 요소, 핵심 판단은 신호 기준" 고지를 노출.
- 개인정보처리방침([`web/src/app/privacy/page.tsx`](../../web/src/app/privacy/page.tsx)) 수집항목에 출생연도·MBTI·애착·상대정보(제3자, 선택) 반영됨.

## 설계 메모
- **게스트 우선**: 가입 없이도 진단 가능(민감 도메인). 현재 구현은 비로그인 게스트 진단 허용, 로그인 시에만 `diagnoses`에 저장. (`User.email` optional은 계획 모델 표현)
- **JSON 필드**: 계획 모델의 SQLite 단계에선 배열/객체를 문자열로 저장. **현재 실제 DB는 이미 Supabase Postgres이며 `result`를 `jsonb`로 저장**(문자열 직렬화 불필요).
- **Diagnosis에 model/promptVer 기록 (계획)**: 추천 품질을 모델·프롬프트 버전별로 추적(재현성). ※ **현재 엔진은 규칙기반(결정적)으로 LLM model/promptVer 개념이 없음** — LLM 개인화 결합 시 도입 예정.
- **Feedback = 데이터 플라이휠 (계획/미구현)**: PRD §11-2의 핵심 해자. 실제 결과를 모아 추천 개선 — 현재 결과 피드백/저장 기능 없음.

## DB 전략
- **현재(MVP, 구현됨)**: 개발·운영 모두 **Supabase Postgres** + RLS 사용. SQLite는 미사용.
- (과거 계획) 개발 SQLite → 운영 PostgreSQL 전환 — 실제로는 처음부터 Supabase Postgres로 통일됨.
- 참고용 Prisma 정규화 초안: [`web/prisma/schema.prisma`](../../web/prisma/schema.prisma) (미적용 · 계획).
