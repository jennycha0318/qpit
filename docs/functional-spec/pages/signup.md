# 회원가입 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/signup` |
| File | `web/src/app/signup/page.tsx` |
| Access | 공개 |
| Rendering | Client |

## 목적
신규 계정 생성. 이메일/비번 + Google.

## UI 요소
- "Google로 계속하기" 버튼
- 이름(닉네임), 이메일, 비밀번호(6자+) 입력
- 에러/성공 메시지 영역
- "가입하기" 버튼
- 링크: "로그인"(`/login`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 가입하기 | 검증 통과 시 `signUp({data:{name}})` |
| Google로 계속하기 | OAuth → `/auth/callback` → `/diagnose` |

## 검증 규칙
- 이름 비어있으면 → "이름(닉네임)을 입력해 주세요."
- 비번 6자 미만 → "비밀번호는 6자 이상이어야 해요."
- Supabase 에러(중복 이메일 등) → 에러 메시지 표시

## 가입 후 분기
- **이메일 인증 OFF** → 즉시 세션 → `/diagnose`
- **이메일 인증 ON** → "가입 확인 메일을 보냈어요…" 안내 → 메일 링크 클릭 → `/auth/callback` → `/diagnose`

## 데이터
- 호출: `signUp` (user_metadata.name 저장) · Writes: auth.users, 세션

## 엣지 케이스
- 이미 가입된 이메일 → Supabase 에러 메시지
- 이메일 인증 켜진 상태에서 가입 직후엔 로그인 안 됨(메일 확인 필요)

## 관련
- Flow: [flow.md](../flow.md) §3.1
