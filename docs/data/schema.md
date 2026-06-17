# 데이터 모델 (참고용 정규화 모델 · 대부분 미구현)

> ⚠️ **실제 백엔드/DB는 [../backend/schema.md](../backend/schema.md)** 가 단일 진실입니다 (Supabase).
> 이 문서는 향후 정규화(cases/feedback 등) 방향을 위한 **참고 모델**이며, 아래 엔티티 대부분은 **현재 미구현(계획)**입니다.
>
> **현재 실제 DB(2026-06 MVP)**: Supabase Postgres에 `diagnoses` 단일 테이블만 존재
> (`id`, `user_id`, `stage`, `score`, `result` jsonb, `created_at`) + 본인 전용 RLS.
> 컬럼/타입 정의는 [`web/supabase/schema.sql`](../../web/supabase/schema.sql) 및 [../backend/schema.md](../backend/schema.md) 참고.
> 아래의 `User`/`Profile`/`Case`/`Event`/`Feedback` 및 그 필드는 **이 문서에만 있는 계획 모델**로, 실제 테이블·컬럼과 일치하지 않습니다.

## 엔티티 관계 (계획 — 현재 미구현)
```
User 1──1 Profile       (계획)
User 1──N Case          (계획)
Case 1──N Diagnosis     (계획 — 현재는 diagnoses 단일 테이블, Case 없음)
Case 1──N Event         (v2: 타임라인, 계획)
Diagnosis 1──1 Feedback (데이터 플라이휠, 계획)
```
> 현재 MVP는 `Case` 묶음 없이 진단 1건이 `diagnoses` 한 행으로 독립 저장됩니다.

## 엔티티 요약
> 아래는 계획 모델의 필드명입니다. **현재 구현된 `Diagnosis` 결과의 실제 필드명은 다릅니다**
> (`web/src/lib/diagnose/engine.ts`의 `Diagnosis` 타입: `scoreTitle`, `score`, `factors[]`, `reason`,
> `actions[]`, `risks[]`, `msgLabel`, `msg`, `hold`, `plan`, `needsSupport`, `minor`).

| 엔티티 | 상태 | 역할 | 핵심 필드 (계획) |
|--------|------|------|-----------|
| **User** | 계획 (현재는 Supabase `auth.users`) | 사용자 (게스트 진단 허용) | email?, ageRange, gender? |
| **Profile** | 계획 | 성향 프로필 | attachmentType, loveValues, conflictStyle |
| **Case** | 계획 | 한 건의 연애 고민 | stage, durationDays, lastContactAt, contactTrend, partnerAttachment |
| **Diagnosis** | **구현됨** (규칙기반, 비-LLM) | 진단 결과 (diagnoses 테이블에 저장) | timingScore, timingLabel, actions[], risks[], generatedMessage |
| **Event** | 계획 (v2) | 케이스 타임라인 | type, occurredAt |
| **Feedback** | 계획 (미구현) | 결과 피드백 (데이터 플라이휠) | followed, outcome |

## 설계 메모
- **게스트 우선**: 가입 없이도 진단 가능(민감 도메인). 현재 구현은 비로그인 게스트 진단 허용, 로그인 시에만 `diagnoses`에 저장. (`User.email` optional은 계획 모델 표현)
- **JSON 필드**: 계획 모델의 SQLite 단계에선 배열/객체를 문자열로 저장. **현재 실제 DB는 이미 Supabase Postgres이며 `result`를 `jsonb`로 저장**(문자열 직렬화 불필요).
- **Diagnosis에 model/promptVer 기록 (계획)**: 추천 품질을 모델·프롬프트 버전별로 추적(재현성). ※ **현재 엔진은 규칙기반(결정적)으로 LLM model/promptVer 개념이 없음** — LLM 개인화 결합 시 도입 예정.
- **Feedback = 데이터 플라이휠 (계획/미구현)**: PRD §11-2의 핵심 해자. 실제 결과를 모아 추천 개선 — 현재 결과 피드백/저장 기능 없음.

## DB 전략
- **현재(MVP, 구현됨)**: 개발·운영 모두 **Supabase Postgres** + RLS 사용. SQLite는 미사용.
- (과거 계획) 개발 SQLite → 운영 PostgreSQL 전환 — 실제로는 처음부터 Supabase Postgres로 통일됨.
- 참고용 Prisma 정규화 초안: [`web/prisma/schema.prisma`](../../web/prisma/schema.prisma) (미적용 · 계획).
