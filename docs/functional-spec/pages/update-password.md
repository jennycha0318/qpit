# 새 비밀번호 설정 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/update-password` |
| File | `web/src/app/update-password/page.tsx` |
| Access | 복구 세션 필요 (재설정 링크 경유) |
| Rendering | Client |

## 목적
비밀번호 재설정 링크로 들어온 사용자가 새 비밀번호를 설정한다.

## 진입 조건
- `/reset-password` → 메일 링크 → `/auth/callback`이 복구 코드를 세션으로 교환 → 이 페이지.
- 진입 시 `getUser()`로 세션 확인:
  - 세션 있음(`ready=true`) → 새 비번 폼 표시
  - 세션 없음/만료(`ready=false`) → "링크가 만료됐어요" 화면 + 재요청/로그인 링크
  - 확인 중(`ready=null`) → 버튼 비활성

## UI 요소
- 새 비밀번호, 새 비밀번호 확인 입력
- 에러/성공 메시지
- "비밀번호 변경" 버튼

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 비밀번호 변경 | 검증 통과 → `updateUser({password})` → 성공 시 1.2초 후 `/diagnose` |

## 검증 규칙
- 세션 없음 → "세션이 유효하지 않아요. 재설정 링크로 다시 들어와 주세요."
- 6자 미만 → "비밀번호는 6자 이상이어야 해요."
- 두 입력 불일치 → "두 비밀번호가 일치하지 않아요."

## 데이터
- 호출: `getUser`(.catch로 실패 처리), `updateUser({password})` · Writes: auth.users 비번

## 엣지 케이스
- `getUser` 네트워크 실패 → `ready=false`(만료 화면)으로 폴백(로딩 멈춤 방지)
- 일반 로그인 사용자가 직접 접근해도 본인 비번 변경은 정상(허용)

## 관련
- Flow: [flow.md](../flow.md) §3.4
