# 비밀번호 찾기 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/reset-password` |
| File | `web/src/app/reset-password/page.tsx` |
| Access | 공개 |
| Rendering | Client |

## 목적
가입 이메일로 비밀번호 재설정 링크를 발송한다.

## UI 요소
- 이메일 입력
- 에러/성공 메시지
- "재설정 링크 보내기" 버튼
- 링크: "로그인으로 돌아가기"

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 재설정 링크 보내기 | 이메일 형식 검증 → `resetPasswordForEmail` 호출 |

## 동작
- `resetPasswordForEmail(email, { redirectTo: /auth/callback?next=/update-password })`
- 성공 시: "재설정 링크를 이메일로 보냈어요. 메일을 확인해 주세요."
- 이후 흐름: 메일 링크 → `/auth/callback`(복구 세션 교환) → `/update-password`

## 검증
- 이메일 형식 불량 → "올바른 이메일을 입력해 주세요."

## 보안 메모
- 가입 여부와 무관하게 동일 성공 메시지(계정 열거 방지) — Supabase 기본 동작.

## 데이터
- 호출: `resetPasswordForEmail` · Writes: 없음(메일 발송)

## 관련
- 다음 단계: [update-password.md](update-password.md) · Flow: [flow.md](../flow.md) §3.4
