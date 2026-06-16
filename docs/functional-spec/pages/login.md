# 로그인 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/login` |
| File | `web/src/app/login/page.tsx` |
| Access | 공개 (미들웨어 비보호) |
| Rendering | Client (`"use client"`) |

## 목적
기존 사용자를 인증한다. 이메일/비밀번호 또는 Google OAuth.

## UI 요소
- 제목 "로그인", 부제 "Pacemaker에 오신 걸 환영해요."
- "Google로 계속하기" 버튼 (`GoogleButton`, 로딩 시 "연결 중…")
- 구분선 "또는 이메일로"
- 이메일 입력 (`type="email"`, placeholder `you@example.com`)
- 비밀번호 입력 (`type="password"`, placeholder `비밀번호`)
- 에러 메시지 영역 (페이지 에러 `err` + Google 버튼 자체 에러)
- "로그인" 버튼 (로딩 시 "로그인 중…")
- 링크: "비밀번호 찾기"(`/reset-password`), "회원가입"(`/signup`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 로그인 (이메일/비밀번호) | `signInWithPassword` → 성공 시 `/diagnose` / 실패 시 에러 메시지 |
| Enter 키 (비밀번호 필드) | `login()` 호출 (로그인 시도) |
| Google로 계속하기 | `signInWithOAuth` → 구글로 리다이렉트 → `/auth/callback` |
| 비밀번호 찾기 | `/reset-password` 이동 |
| 회원가입 | `/signup` 이동 |

## 상태
- `email`, `pw` — 입력값
- `loading` — 로그인 요청 중 버튼 비활성, 라벨 "로그인 중…"
- `err` — 에러 메시지 (아래 케이스 참조)
- `GoogleButton` 내부 `loading` / `err` — Google 흐름 전용 별도 상태

## 데이터
- 호출: `supabase.auth.signInWithPassword` / `supabase.auth.signInWithOAuth`(provider `google`, `redirectTo` = `{origin}/auth/callback`)
- 클라이언트: `createClient`(`@/lib/supabase/client`)
- Writes: 세션 쿠키

## 엣지 케이스
- 잘못된 자격 → "이메일 또는 비밀번호가 올바르지 않아요." (어느 필드가 틀렸는지 비공개 = 계정 열거 방지)
- 로그인 중 예외(네트워크 등) → "네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
- OAuth 콜백 실패로 `/login?error=auth` 진입 시 → `useEffect`가 "로그인에 실패했어요. 다시 시도해 주세요." 표시
- Google OAuth 시작 실패 → "구글 로그인을 시작할 수 없어요. 잠시 후 다시 시도해 주세요." (`GoogleButton`)
- Google 흐름 예외 → "구글 로그인 중 오류가 발생했어요." (`GoogleButton`)

## 관련
- Flow: [flow.md](../flow.md) §3.2, §3.3
