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
| 호스팅 | Vercel (prod: `https://qpit.vercel.app`) |
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
- `user_metadata.name` — 가입 시 입력한 닉네임 (`options.data.name`, 구글은 계정 표시이름)
- `user_metadata.birth_year` / `user_metadata.mbti` — 가입 시 수집(출생연도 필수·MBTI 선택). `profiles` 테이블 미생성/저장 실패 시 폴백 저장소로도 동작(아래 §4 `profiles` 참고).
- `app_metadata.provider` — `email` 또는 `google`

### 개인정보 동의
- 회원가입 시 **필수 동의 체크박스** → 미동의 시 가입 차단. 개인정보처리방침: `/privacy`.
- 콜백(`/auth/callback`)은 `next` 파라미터를 내부 경로로만 허용(오픈 리다이렉트 차단).

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
| `score` | int | — | 타이밍 점수 (엔진이 3–97로 clamp; 컬럼엔 CHECK 제약 없음) |
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
  },
  "needsSupport": false,         // 정서 위기 신호 → 결과에 심리상담 카드
  "minor": false,                // 청소년 눈높이 모드 (생년 기반 — 연나이 ≤19)
  "compat": {                    // 성향·궁합 '참고' 레이어 (MBTI·나이차) — 점수 미반영. 없으면 생략
    "tips": ["외향형(E) — 가볍고 잦은 안부 연락이 편안할 수 있어요."],
    "mbtiNote": "ENFP × ISTJ — 성향 차이가 있는 편…",  // 선택
    "ageGapNote": "나이차 약 7살 — 표현 방식의 차이를…"   // 선택
  }
}
```
> `score`/`stage`는 쿼리·정렬용으로 컬럼에도 중복 저장(비정규화). `result`는 렌더링용 전체 스냅샷.
> **minor·needsSupport·compat는 별도 컬럼이 아니라 `result` jsonb 안에만** 저장됨(테이블 스키마 변경 없음). `minor`는 페이지에서(생년 기반 연나이 ≤19로 판정 — 이전 '10대 버킷 선택' 방식에서 변경), `needsSupport`·`compat`는 엔진에서 결정.
> **`compat`(성향·궁합)는 참고 레이어로 점수에 반영되지 않음** — `score`는 기존 신호(애착·행동·맥락) 규칙으로만 산출. MBTI·나이차는 개인화·소통 팁용일 뿐 예측의 핵심이 아니며, `engine.ts`의 `computePersonality()`(`personality.ts`)가 생성. 입력은 진단 플로우의 내 정보(생년·MBTI)·상대 정보(선택)에서 옴.

### RLS (행 수준 보안)
```sql
alter table public.diagnoses enable row level security;
create policy "diagnoses_select_own" ... using (auth.uid() = user_id);
create policy "diagnoses_insert_own" ... with check (auth.uid() = user_id);
create policy "diagnoses_delete_own" ... using (auth.uid() = user_id);
```
- 모든 접근은 **본인 데이터만**. 타인 진단 조회/수정 불가.
- `user_id` 기본값이 `auth.uid()` → insert 시 자동으로 본인 소유.

### 테이블: `public.profiles`
사용자의 **영속 입력**(생년·MBTI·애착유형)을 저장. 진단 개인화 + 안전(청소년) 판정용. 사용자당 1행(PK = auth.users id).

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | uuid | — | PK = `auth.users(id)` (FK, on delete cascade). 별도 `user_id` 없이 `id` 자체가 소유자 |
| `birth_year` | int | — | 출생연도. 청소년/성인 판정·나이차 참고에 사용 (nullable) |
| `mbti` | text | — | 4글자 MBTI 또는 null(비공개/모름) |
| `attachment` | text | — | 애착 성향: `secure` / `anxious` / `avoidant` / null |
| `updated_at` | timestamptz | `now()` | 갱신 시각 |

> `diagnoses`와 달리 `id`가 곧 소유자(=`auth.uid()`)이며 별도 인덱스/`user_id` 컬럼이 없습니다.

#### profiles RLS
```sql
alter table public.profiles enable row level security;
create policy "profiles_select_own" ... using (auth.uid() = id);
create policy "profiles_insert_own" ... with check (auth.uid() = id);
create policy "profiles_update_own" ... using (auth.uid() = id);
```
- `select` / `insert` / `update` 모두 **본인 행만**(`auth.uid() = id`). **`delete` 정책은 없음** — 행 삭제는 `auth.users` 삭제 시 cascade로만 발생.

#### 읽기/저장: `web/src/lib/profile.ts`
`profiles` 테이블을 **SoT(우선)** 로 쓰되, **`user_metadata` 폴백**으로 테이블 미생성/저장 실패 시에도 동작(구현됨).
- `getProfile(supabase)` — `profiles`에서 `birth_year/mbti/attachment` 조회 후, 없으면 `user_metadata`로 폴백. 반환 `Profile { birthYear, mbti, attachment, name }`(`name`은 메타데이터에서만).
- `saveProfile(supabase, { birthYear?, mbti?, attachment? })` — (1) `auth.updateUser({ data })`로 메타데이터 동기화 → (2) `profiles` upsert. 둘 다 실패할 때만 throw(하나라도 성공하면 OK). **테이블이 아직 없어도 메타데이터로 안전 동작.**
- 호출처: 가입(`signup`)·진단 '내 정보' 단계(`diagnose`)·프로필 편집기(`ProfileEditor`).

---

## 5. API 패턴 (서버리스 — Supabase 직접 호출)
별도 REST 서버 없음. 클라이언트/서버 컴포넌트가 Supabase SDK로 직접:

| 동작 | 위치 | 코드 |
|------|------|------|
| 진단 저장 | diagnose (client) | `supabase.from("diagnoses").insert({user_id,stage,score,result})` (로그인 시만) |
| 히스토리 목록 | history (server) | `.select("id,stage,score,result,created_at").order("created_at",{ascending:false})` |
| 히스토리 상세 | history/[id] (server) | `.select("result").eq("id",id).single()` |
| 진단 횟수 | profile (server) | `.select("*",{count:"exact",head:true})` |
| 프로필 읽기 | signup·diagnose·ProfileEditor | `getProfile()` → `from("profiles").select(...).eq("id",uid).maybeSingle()` + `user_metadata` 폴백 |
| 프로필 저장 | signup·diagnose·ProfileEditor | `saveProfile()` → `auth.updateUser({data})` + `from("profiles").upsert({id,...})` |

라우트 핸들러:
- `GET /auth/callback` — OAuth·이메일 인증 코드를 세션으로 교환(`exchangeCodeForSession`) 후 `next`(기본 `/diagnose`)로 리다이렉트.

---

## 6. 셋업 / 배포 체크리스트
설치·실행: [`web/SETUP.md`](../../web/SETUP.md)

### Supabase 설정
- [ ] `web/supabase/schema.sql` 실행 (diagnoses + profiles 테이블 + RLS)
  - 미실행 시에도 `profiles`는 `user_metadata` 폴백으로 동작하지만, 영속 SoT 확보를 위해 실행 권장.
- [ ] Authentication → Email 활성화
- [ ] (구글) Google OAuth provider 설정 + Client ID/Secret
- [ ] **Authentication → URL Configuration → Redirect URLs** 에 추가:
  - `http://localhost:3000/auth/callback`
  - `https://qpit.vercel.app/auth/callback` ← **프로덕션 필수**
- [ ] **Site URL** 을 `https://qpit.vercel.app` 로 설정 (이메일 링크 기준)

### Vercel 설정
- [ ] 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
- [ ] Root Directory = `web` (Next.js 앱 위치)

---

## 7. 향후 확장 (스키마 로드맵)
- `diagnoses.case_id` 도입 → 같은 관계의 진단을 묶는 `cases` 테이블 (타임라인 컨설팅)
- `messages` 테이블 → 받은 메시지 해석 기록
- `feedback` 테이블 → 추천 채택/결과 피드백 (데이터 플라이휠, PRD §11-2)
- 참고용 정규화 모델: [`web/prisma/schema.prisma`](../../web/prisma/schema.prisma)
