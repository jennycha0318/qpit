# 프로필 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/profile` |
| File | `web/src/app/profile/page.tsx` (+ `web/src/components/SignOutButton.tsx`) |
| Access | 로그인 (middleware 보호 + 페이지 내 2차 방어) |
| Rendering | Server (`force-dynamic`) |

## 목적
계정 정보 확인 및 로그아웃.

## UI 요소
- 제목 "내 프로필"
- 정보 카드(`card`) — 행(`Row`) 4개:
  - 이름 (`user_metadata.name`, 없으면 "-")
  - 이메일 (`user.email`, 없으면 "-")
  - 로그인 방식 (`app_metadata.provider === "google"` → "Google 계정", 그 외 → "이메일")
  - 진단 횟수 (`diagnoses` count, 조회 실패 시 "-", 성공 시 `${count ?? 0}회`)
- "로그아웃" 버튼 (`SignOutButton`, client)
  - 진행 중 라벨 "로그아웃 중…" + 버튼 비활성화
  - 실패 시 하단 에러 문구 "로그아웃에 실패했어요. 다시 시도해 주세요."

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 로그아웃 | `supabase.auth.signOut()` → `router.push("/")` + `router.refresh()` |
| 로그아웃 실패 | 에러 메시지 표시, 버튼 다시 활성화 (페이지 유지) |

## 상태
- Server: `user` 미존재 시 `redirect("/login")`
- Client(`SignOutButton`): `loading`(요청 진행), `err`(실패 메시지)

## 데이터
- Reads: `supabase.auth.getUser()` 세션 사용자, `diagnoses` count(exact, head)
- Writes: 로그아웃 시 세션 제거(`auth.signOut()`)

## 엣지 케이스
- 비로그인 접근 → middleware가 처리, 페이지에서도 `redirect("/login")`로 2차 방어
- 이름 없는 계정 → "-" 표시
- `diagnoses` count 조회 오류 → 진단 횟수 "-" 표시
- 로그아웃 호출 오류/예외 → 에러 문구 표시, 화면 유지

## 향후
- 닉네임/애착유형 수정, 알림 설정, 결제/구독 관리

## 관련
- Flow: [flow.md](../flow.md) §3.5
