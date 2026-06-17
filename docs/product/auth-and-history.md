# 인증 · 진단 히스토리 설계

> 상태: ✅ 구현됨 (web/ MVP — Supabase Auth + Postgres/RLS). 본 문서는 현재 코드(`web/`) 기준으로 정리되어 있습니다.

## 1. 플로우
```
랜딩(/) → 로그인(/login) / 회원가입(/signup) / 비밀번호 찾기(/reset-password) → 진단(/diagnose)
진단(/diagnose) · 진단 히스토리(/history) · 프로필(/profile)  ← 하단 탭바로 이동
```
- 진단은 **로그인 없이(게스트)도** 바로 받을 수 있고, 로그인한 경우에만 결과가 히스토리에 저장됩니다.
- `/home` 경로는 더 이상 별도 대시보드가 아니라 `/diagnose`로 리다이렉트됩니다(`web/src/app/home/page.tsx`).
- 하단 탭바(`TabBar`)는 진단 / 히스토리 / 프로필 3개 탭만 노출하며, 랜딩·인증 화면에서는 숨겨집니다.

## 2. 인증 (구현 — Supabase Auth)
브라우저 mock이 아니라 **Supabase Auth**로 실제 서버 세션을 사용합니다.
- **이메일/비밀번호**: `supabase.auth.signUp` / `signInWithPassword`. 비밀번호 해시·세션은 Supabase가 처리(httpOnly 쿠키 기반 세션).
  - 회원가입 시 닉네임(`user_metadata.name`)과 **개인정보 수집·이용 동의**(필수 체크)를 받습니다(`web/src/app/signup/page.tsx`).
  - 이메일 인증이 켜져 있으면 가입 확인 메일 → `/auth/callback`으로 돌아와 세션 교환.
- **Google 로그인(OAuth)**: `GoogleButton` → Supabase OAuth → `/auth/callback`(`web/src/app/auth/callback/route.ts`)에서 `exchangeCodeForSession`으로 세션 교환. Google 계정 이름이 닉네임으로 저장됩니다.
- **비밀번호 재설정**: `/reset-password`에서 `resetPasswordForEmail`로 메일 발송 → 메일 링크가 `/auth/callback?next=/update-password`를 거쳐 `/update-password`에서 새 비밀번호 설정(`updateUser`).
- **세션 보호**: `web/src/middleware.ts` + `web/src/lib/supabase/middleware.ts`(`updateSession`)로 세션을 갱신. `/profile` 등 보호 화면은 서버에서 `getUser()`로 미로그인 시 `/login`으로 리다이렉트(2차 방어).
- **로그아웃**: `SignOutButton`(프로필 화면).

## 3. 진단 히스토리 (구현 — Supabase Postgres + RLS)
실제 데이터는 Prisma가 아니라 **Supabase의 단일 `diagnoses` 테이블**에 저장됩니다.
- 스키마: `web/supabase/schema.sql` — `diagnoses(id uuid, user_id uuid default auth.uid(), stage text, score int, result jsonb, created_at timestamptz)`.
  - `stage`: `crush`(썸) | `dating`(연애중) | `breakup`(이별후), `result`: 진단 결과 전체(JSONB), `score`: 0–100.
- **저장 시점**: `/diagnose` 결과 화면에서 로그인 사용자면 `diagnoses`에 insert. 비로그인이면 저장하지 않고 "로그인하면 히스토리에 저장됩니다" 안내(회원가입/로그인 유도)를 띄웁니다(`web/src/app/diagnose/page.tsx`).
- **히스토리 조회**: `/history`에서 본인 진단 목록을 `created_at desc`로 조회, `/history/[id]`에서 개별 결과를 `Report`로 재열람(`web/src/app/history/page.tsx`, `web/src/app/history/[id]/page.tsx`).
- **보안(RLS)**: `diagnoses` 테이블에 Row Level Security 활성화 — 본인(`auth.uid() = user_id`) 데이터만 select/insert/delete. 별도 인덱스 `(user_id, created_at desc)`.

> 참고: `web/prisma/schema.prisma`의 `User`/`Profile`/`Case`/`Diagnosis`/`Event`/`Feedback` 모델은 **초안(v0.1) — 미구현(계획)**입니다. 현재 MVP는 Prisma를 사용하지 않으며, 케이스 타임라인·결과 피드백(데이터 플라이휠) 등은 아직 계획 단계입니다. 데이터 모델 설명은 `../data/schema.md` 참고.

## 4. 화면 매핑
| 화면 | 실제 라우트(web) | 기능 스펙 문서 |
|------|------------------|----------------|
| 랜딩 | `/` | [landing](../functional-spec/pages/landing.md) |
| 로그인 | `/login` | [login](../functional-spec/pages/login.md) |
| 회원가입 | `/signup` | [signup](../functional-spec/pages/signup.md) |
| 비밀번호 찾기 | `/reset-password` | [reset-password](../functional-spec/pages/reset-password.md) |
| 새 비밀번호 설정 | `/update-password` | [update-password](../functional-spec/pages/update-password.md) |
| OAuth/메일 콜백 | `/auth/callback` | — |
| 진단 | `/diagnose` | [diagnose](../functional-spec/pages/diagnose.md) |
| 히스토리 | `/history` | [history](../functional-spec/pages/history.md) |
| 히스토리 상세 | `/history/[id]` | [history-detail](../functional-spec/pages/history-detail.md) |
| 프로필 | `/profile` | [profile](../functional-spec/pages/profile.md) |

> `/home`은 `/diagnose`로 리다이렉트되는 호환용 경로입니다(별도 화면 아님).
