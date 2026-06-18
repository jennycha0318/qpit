# 회원가입 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/signup` |
| File | `web/src/app/signup/page.tsx` |
| Access | 공개 |
| Rendering | Client (`"use client"`) |

## 목적
신규 계정 생성. 이메일/비밀번호 또는 Google로 가입.

## UI 요소
- 제목 "회원가입", 안내문 "이메일로 가입하거나 Google을 사용하세요."
- `GoogleButton` ("Google로 계속하기") + 안내문 "Google로 가입 시 계정 이름이 닉네임으로 저장돼요."
- 구분선 "또는 이메일로"
- 이름(닉네임) 입력 (placeholder "예: 지은")
- 이메일 입력 (`type="email"`, placeholder "you@example.com")
- 비밀번호 입력 (`type="password"`, placeholder "6자 이상")
- **출생연도 (필수)** — `YearSelect` 드롭다운 (`@/components/InfoFields`, 만 12~80세 범위, 기본 "출생연도 선택"). 진단 개인화·청소년 보호 판정에 사용.
- **MBTI (선택)** — `MbtiSelect` 드롭다운 (`@/components/InfoFields`, 기본 "모름 / 비공개"). 안내문 "진단 개인화와 청소년 보호 판정에 쓰여요. MBTI는 참고 요소예요." (※ 청소년 판정은 출생연도 기반이며, 안내문은 두 필드의 용도를 함께 설명함)
- 에러 메시지 영역(`text-bad`), 성공 메시지 영역(`text-good`)
- 개인정보 동의 체크박스 — `/privacy`로 가는 "개인정보 수집·이용" 링크(새 탭)와 안내문("이메일·닉네임·출생연도와 (선택)MBTI·진단 입력이 저장되며, 자유서술은 추후 AI 분석에 활용될 수 있어요.")
- "가입하기" 버튼 (로딩 중 "가입 중…", `disabled`)
- 링크: "로그인"(`/login`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 가입하기 | 검증 통과 시 `supabase.auth.signUp({email, password, options:{data:{name, birth_year, mbti}, emailRedirectTo}})` 호출. 이메일 인증 OFF로 세션이 즉시 생기면 이어서 `saveProfile(...)`로 프로필 저장 |
| Google로 계속하기 | `GoogleButton`의 OAuth 처리 |

## 검증 규칙
- 이름 비어있음 → "이름(닉네임)을 입력해 주세요."
- 이메일 형식 불일치(정규식 검사) → "올바른 이메일을 입력해 주세요."
- 비밀번호 6자 미만 → "비밀번호는 6자 이상이어야 해요."
- **출생연도 미선택 → "출생연도를 선택해 주세요."** (검증 순서: 이름 → 이메일 → 비밀번호 → 출생연도 → 동의)
- 개인정보 동의 미체크 → "개인정보 수집·이용에 동의해 주세요."
- Supabase 에러(중복 이메일 등) → `error.message` 표시
- 예외(네트워크 등) → "네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요."

> MBTI는 선택 입력이라 별도 검증 없음(미선택 시 `null` 저장).

## 상태
- `name`, `email`, `pw`: 입력값
- `birthYear`: 출생연도(필수, 문자열 → 저장 시 `Number()`), `mbti`: MBTI(선택, 미선택 시 `null`)
- `err`: 에러 메시지, `ok`: 성공 메시지
- `loading`: 가입 진행 중 여부(버튼 비활성화·문구 변경)
- `agree`: 개인정보 동의 체크 여부

## 가입 후 분기
- **이메일 인증 OFF** → `data.session` 존재 → `saveProfile(supabase, {birthYear, mbti})` 호출(실패해도 `try/catch`로 무시) → `router.push("/diagnose")`
- **이메일 인증 ON** → 세션 없음 → "가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 완료해 주세요." 안내 → 메일 링크 클릭 → `emailRedirectTo`(`${location.origin}/auth/callback`)

## 데이터
- 호출: `supabase.auth.signUp` (`options.data`로 user_metadata에 `name`·`birth_year`·`mbti` 저장)
- 프로필 저장: 세션 즉시 생성 시 `saveProfile()` (`@/lib/profile`) 호출 → 다음 두 곳에 기록
  - **user_metadata**(`auth.updateUser`) — 즉시 가용·폴백
  - **`public.profiles` 테이블**(`upsert`, SoT) — `id`(=`auth.users.id`)·`birth_year`·`mbti`·`updated_at`. RLS 본인 전용 select/insert/update (`web/supabase/schema.sql`)
  - ※ `profiles` 테이블 미생성/저장 실패 시에도 메타데이터로 동작(이후 진단/프로필 화면에서 백필). `getProfile/saveProfile`은 **테이블 우선 + user_metadata 폴백** 구조.
- Writes: auth.users, user_metadata, `public.profiles`(세션 즉시 생성 시), 세션(이메일 인증 OFF 시)
- 클라이언트: `createClient()` (`@/lib/supabase/client`)

> **메모**: 이메일 인증 ON 경로(세션 미생성)에서는 가입 시점에 `saveProfile`을 호출하지 않음. 출생연도·MBTI는 `signUp`의 `options.data`로 user_metadata에만 우선 저장되며, 인증 완료 후 진단(`/diagnose`)·프로필(`/profile`) 화면에서 `profiles` 테이블로 백필된다.

## 엣지 케이스
- 이미 가입된 이메일 → Supabase `error.message` 표시
- 이메일 인증 켜진 상태에서 가입 직후엔 세션 미생성(메일 확인 필요) → 이 경우 `saveProfile` 미호출, 메타데이터에만 출생연도·MBTI 보존
- 개인정보 미동의 시 가입 차단
- 출생연도 미선택 시 가입 차단(MBTI는 선택이라 미입력 허용)
- 프로필 저장 실패(예: `profiles` 테이블 미생성) → 가입 흐름은 진행, 메타데이터로 동작 후 추후 백필

## 관련
- Flow: [flow.md](../flow.md) §3.1
- 개인정보 처리방침: `/privacy` (`web/src/app/privacy/page.tsx`) — 수집 항목에 출생연도·MBTI(선택)·애착 성향(선택)·상대 정보(제3자, 선택) 반영
- 프로필 편집: [profile.md](profile.md) — 출생연도·MBTI·애착 성향 편집/저장
- 진단 플로우: [diagnose.md](diagnose.md) — 로그인+프로필 생년 있으면 '내 정보' 단계 생략, 청소년 판정은 생년 기반
