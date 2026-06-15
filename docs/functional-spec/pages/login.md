# 로그인 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/login` |
| File | `web/src/app/login/page.tsx` |
| Access | 공개 |
| Rendering | Client |

## 목적
기존 사용자를 인증한다. 이메일/비번 + Google.

## UI 요소
- "Google로 계속하기" 버튼 (`GoogleButton`)
- 구분선 "또는 이메일로"
- 이메일 입력, 비밀번호 입력
- 에러 메시지 영역
- "로그인" 버튼 (로딩 시 "로그인 중…")
- 링크: "비밀번호 찾기"(`/reset-password`), "회원가입"(`/signup`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 로그인 (이메일/비번) | 성공 → `/diagnose` / 실패 → 에러 메시지 |
| Google로 계속하기 | OAuth → `/auth/callback` → `/diagnose` |
| Enter 키 (비번 필드) | 로그인 시도 |
| 비밀번호 찾기 | `/reset-password` |
| 회원가입 | `/signup` |

## 상태
- `loading` — 요청 중 버튼 비활성
- `err` — "이메일 또는 비밀번호가 올바르지 않아요." (구체 사유 노출 안 함 = 계정 열거 방지)

## 데이터
- 호출: `signInWithPassword` / `signInWithOAuth` · Writes: 세션 쿠키

## 엣지 케이스
- 잘못된 자격 → 일반 에러(어느 필드가 틀렸는지 비공개)
- Google provider 미설정 시 OAuth 실패 → Supabase 설정 필요([backend](../../backend/schema.md) §6)

## 관련
- Flow: [flow.md](../flow.md) §3.2, §3.3
