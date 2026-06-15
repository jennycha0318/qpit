# Backend & DB Schema

> Pacemaker 백엔드 레퍼런스. 인증 · DB 스키마 · 보안(RLS) · API 패턴 · 배포.
> 구현체: `web/` (Next.js 15 App Router + Supabase). 상태: MVP.
> SQL 원본: [`web/supabase/schema.sql`](../../web/supabase/schema.sql)

---

## 1. 스택 개요
| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, RSC) + TypeScript |
| 인증 | Supabase Auth (이메일/비번 + Google OAuth + 비번 재설정) |
| DB | Supabase Postgres + RLS(행 수준 보안) |
| 호스팅 | Vercel (prod: `https://pacemaker-six-eta.vercel.app`) |
| Supabase | `https://dtvhjowhlefutlyovqrx.supabase.co` |

> 주의: Supabase가 백엔드(Auth + DB + API)를 담당합니다. 별도 서버 코드 없음.
> Next.js 서버 컴포넌트/미들웨어가 Supabase 클라이언트로 직접 통신.

---

## 2. 환경 변수
`web/.env.local` (gitignore됨). Vercel 환경변수에도 동일 등록 필요.
```
NEXT_PUBLIC_SUPABASE_URL=https://dtvhjowhlefutlyovqrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # publishable(공개) 키
```
- `NEXT_PUBLIC_` 접두사 → 브라우저에 노출됨. publishable 키는 공개 설계라 안전.
- `service_role`(secret) 키는 사용하지 않음(클라이언트 노출 금지). RLS로 보안.

---

## 3. 인증 (Supabase Auth)

### 제공 방식
| 방식 | 구현 | 메모 |
|------|------|------|
| 이메일/비밀번호 | `signInWithPassword`, `signUp` | 비번 최소 6자 |
| Google OAuth | `signInWithOAuth({provider:'google'})` | 콜백 `/auth/callback` |
| 비밀번호 재설정 | `resetPasswordForEmail` → `/update-password` | 복구 세션에서 `updateUser` |

### 사용자 데이터 (auth.users)
- `email`
- `user_metadata.name` — 가입 시 입력한 닉네임 (`options.data.name`)
- `app_metadata.provider` — `email` 또는 `google`

### 세션 관리
- `@supabase/ssr` 사용. 쿠키 기반 세션.
- `web/src/lib/supabase/`
  - `client.ts` — 브라우저(클라이언트 컴포넌트)
  - `server.ts` — 서버 컴포넌트/라우트 핸들러 (cookies)
  - `middleware.ts` — 요청마다 세션 갱신 + 보호 라우트 리다이렉트
- `web/src/middleware.ts` — 전역 미들웨어 진입점

### 보호 라우트 (middleware)
```
PROTECTED = ["/home", "/history", "/profile"]
```
- 비로그인이 보호 라우트 접근 → `/login` 리다이렉트
- `/diagnose` 는 공개(비로그인 체험 가능). 저장만 로그인 필요.

---

## 4. DB 스키마

### 테이블: `public.diagnoses`
한 건의 진단 결과를 저장.

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | uuid | `gen_random_uuid()` | PK |
| `user_id` | uuid | `auth.uid()` | 소유자 (auth.users FK, on delete cascade) |
| `stage` | text | — | `crush` / `dating` / `breakup` |
| `score` | int | — | 0–100 타이밍 점수 |
| `result` | jsonb | — | 진단 결과 전체 (Diagnosis 객체) |
| `created_at` | timestamptz | `now()` | 생성 시각 |

인덱스: `(user_id, created_at desc)` — 사용자별 최신순 히스토리 조회.

### `result` jsonb 구조 (Diagnosis)
`web/src/lib/diagnose/engine.ts`의 `Diagnosis` 타입과 동일:
```jsonc
{
  "scoreTitle": "재회 시도 적정도",
  "score": 72,
  "factors": [{ "label": "환경적 이유 (회복 가능성↑)", "delta": 13 }],
  "reason": "…",
  "actions": [{ "t": "부담 없는 안부로 재접촉", "d": "…" }],
  "risks": ["…"],
  "msgLabel": "가벼운 재접촉 예시",
  "msg": "잘 지내지? …",        // 또는 null
  "hold": null,                  // 보내면 안 될 때의 안내 (msg 대신)
  "plan": {
    "when": "오늘~3일 내가 첫 연락 적기",
    "tone": "good",            // good | warn | bad
    "channel": "카카오톡 — 가벼운 안부 한 통",
    "steps": [{ "time": "오늘~3일 내", "action": "…" }]
  }
}
```
> `score`/`stage`는 쿼리·정렬용으로 컬럼에도 중복 저장(비정규화). `result`는 렌더링용 전체 스냅샷.

### RLS (행 수준 보안)
```sql
alter table public.diagnoses enable row level security;
create policy "diagnoses_select_own" ... using (auth.uid() = user_id);
create policy "diagnoses_insert_own" ... with check (auth.uid() = user_id);
create policy "diagnoses_delete_own" ... using (auth.uid() = user_id);
```
- 모든 접근은 **본인 데이터만**. 타인 진단 조회/수정 불가.
- `user_id` 기본값이 `auth.uid()` → insert 시 자동으로 본인 소유.

---

## 5. API 패턴 (서버리스 — Supabase 직접 호출)
별도 REST 서버 없음. 클라이언트/서버 컴포넌트가 Supabase SDK로 직접:

| 동작 | 위치 | 코드 |
|------|------|------|
| 진단 저장 | diagnose (client) | `supabase.from("diagnoses").insert({stage,score,result})` |
| 히스토리 목록 | history (server) | `.select("id,stage,score,result,created_at").order("created_at",{ascending:false})` |
| 히스토리 상세 | history/[id] (server) | `.select("result").eq("id",id).single()` |
| 진단 횟수 | profile (server) | `.select("*",{count:"exact",head:true})` |

라우트 핸들러:
- `GET /auth/callback` — OAuth·이메일 인증 코드를 세션으로 교환(`exchangeCodeForSession`) 후 `next`(기본 `/diagnose`)로 리다이렉트.

---

## 6. 셋업 / 배포 체크리스트
설치·실행: [`web/SETUP.md`](../../web/SETUP.md)

### Supabase 설정
- [ ] `web/supabase/schema.sql` 실행 (diagnoses 테이블 + RLS)
- [ ] Authentication → Email 활성화
- [ ] (구글) Google OAuth provider 설정 + Client ID/Secret
- [ ] **Authentication → URL Configuration → Redirect URLs** 에 추가:
  - `http://localhost:3000/auth/callback`
  - `https://pacemaker-six-eta.vercel.app/auth/callback` ← **프로덕션 필수**
- [ ] **Site URL** 을 `https://pacemaker-six-eta.vercel.app` 로 설정 (이메일 링크 기준)

### Vercel 설정
- [ ] 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
- [ ] Root Directory = `web` (Next.js 앱 위치)

---

## 7. 향후 확장 (스키마 로드맵)
- `diagnoses.case_id` 도입 → 같은 관계의 진단을 묶는 `cases` 테이블 (타임라인 컨설팅)
- `messages` 테이블 → 받은 메시지 해석 기록
- `feedback` 테이블 → 추천 채택/결과 피드백 (데이터 플라이휠, PRD §11-2)
- 참고용 정규화 모델: [`web/prisma/schema.prisma`](../../web/prisma/schema.prisma)
