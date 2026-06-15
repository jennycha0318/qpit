# 프로필 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/profile` |
| File | `web/src/app/profile/page.tsx` (+ `components/SignOutButton.tsx`) |
| Access | 로그인 (middleware 보호) |
| Rendering | Server (dynamic) |

## 목적
계정 정보 확인 및 로그아웃.

## 동작
- `getUser()`로 사용자 정보
- `diagnoses` count(head, exact)로 진단 횟수 집계

## UI 요소
- 제목 "내 프로필"
- 정보 카드(행):
  - 이름 (`user_metadata.name`)
  - 이메일
  - 로그인 방식 (`app_metadata.provider` → "Google 계정" / "이메일")
  - 진단 횟수 (diagnoses count)
- "로그아웃" 버튼 (`SignOutButton`, client)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 로그아웃 | `signOut()` → `/` (랜딩) + 새로고침 |
| 하단 탭 | 진단/히스토리 이동 |

## 데이터
- Reads: 세션 사용자, `diagnoses` count(본인) · Writes: 로그아웃 시 세션 제거

## 엣지 케이스
- 비로그인 접근 → middleware가 `/login`으로
- 이름 없는 계정(구글 일부) → "-" 표시

## 향후
- 닉네임/애착유형 수정, 알림 설정, 결제/구독 관리

## 관련
- Flow: [flow.md](../flow.md) §3.5
