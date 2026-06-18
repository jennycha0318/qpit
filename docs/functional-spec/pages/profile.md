# 프로필 — Functional Spec

| 항목 | 값 |
|------|-----|
| Route | `/profile` |
| File | `web/src/app/profile/page.tsx` (+ `web/src/components/ProfileEditor.tsx`, `web/src/components/SignOutButton.tsx`, `web/src/components/InfoFields.tsx`) |
| Access | 로그인 (middleware 보호 + 페이지 내 2차 방어) |
| Rendering | Server 셸(`force-dynamic`) + 프로필 편집기는 client |

## 목적
계정 정보 확인, **편집 가능한 프로필(출생연도·MBTI·애착 성향) 저장**, 로그아웃.

## UI 요소
- 제목 "내 프로필"
- 정보 카드(`card`, 읽기 전용) — 행(`Row`) 4개:
  - 이름 (`user_metadata.name`, 없으면 "-")
  - 이메일 (`user.email`, 없으면 "-")
  - 로그인 방식 (`app_metadata.provider === "google"` → "Google 계정", 그 외 → "이메일")
  - 진단 횟수 (`diagnoses` count, 조회 실패 시 "-", 성공 시 `${count ?? 0}회`)
- **내 정보 편집 카드 (`ProfileEditor`, client)** — 라벨 "내 정보 (진단 개인화)":
  - 출생연도 (`YearSelect`, 만 12~80세 범위) — 편집/저장 가능
  - MBTI (`MbtiSelect`, 16유형 또는 "모름/비공개") — 편집/저장 가능
  - 애착 성향 (`secure` 안정형 / `anxious` 불안형 / `avoidant` 회피형 / "" 모름·비공개) — 편집/저장 가능
  - 안내 문구 "MBTI·나이차는 참고 요소예요. 핵심 판단은 진단 신호를 기준으로 해요."
  - "저장" 버튼 — 상태에 따라 "저장 중…" / "저장됨 ✓" 라벨, 저장 중 비활성화
  - 저장 실패 시 하단 문구 "저장에 실패했어요. 다시 시도해 주세요."
  - (이전엔 읽기 전용 안내만 있었음 → 편집·저장 기능으로 확장됨)
- **"계정 관리" 그룹** — 소제목 "계정 관리" + "로그아웃" 버튼 (`SignOutButton`, client)
  - 진행 중 라벨 "로그아웃 중…" + 버튼 비활성화
  - 실패 시 하단 에러 문구 "로그아웃에 실패했어요. 다시 시도해 주세요."

> 참고(포지셔닝): MBTI·나이차·궁합은 **참여·개인화용 '참고 레이어'**이며 진단 점수에는 반영하지 않습니다(결정적 규칙 점수는 연락 흐름·반응·애착 등 신호 기준 유지). 자세한 결과 노출은 [diagnose.md](./diagnose.md) 참조.

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 프로필 편집 후 저장 | `saveProfile()` 호출 → 메타데이터 동기화 + `profiles` 테이블 upsert, 성공 시 "저장됨 ✓" |
| 프로필 저장 실패 | 에러 문구 표시, 폼 유지(재시도 가능) |
| 로그아웃 | `supabase.auth.signOut()` → `router.push("/")` + `router.refresh()` |
| 로그아웃 실패 | 에러 메시지 표시, 버튼 다시 활성화 (페이지 유지) |

## 상태
- Server: `user` 미존재 시 `redirect("/login")`
- Client(`ProfileEditor`): `status` = `loading`(초기 프로필 로드) → `idle` → `saving` → `saved` / `error`. 값 변경 시 "saved"는 다시 "idle"로 되돌아감(`touch`)
- Client(`SignOutButton`): `loading`(요청 진행), `err`(실패 메시지)

## 데이터
- Reads:
  - `supabase.auth.getUser()` 세션 사용자, `diagnoses` count(exact, head)
  - `getProfile()`(`web/src/lib/profile.ts`) — `profiles` 테이블(`birth_year`/`mbti`/`attachment`) **우선**, 없으면 `user_metadata` 폴백 (테이블 미생성 시에도 메타데이터로 동작)
- Writes:
  - `saveProfile()` — `auth.updateUser({ data })` 메타데이터 동기화 + `profiles` 테이블 upsert. 둘 중 하나만 성공해도 OK(둘 다 실패 시 에러). 테이블이 없거나 실패해도 메타데이터로 동작
  - 로그아웃 시 세션 제거(`auth.signOut()`)
- 테이블(`web/supabase/schema.sql`): `public.profiles` — `id uuid PK = auth.users(id) on delete cascade`, `birth_year int`, `mbti text`, `attachment text`, `updated_at timestamptz`. RLS 본인 전용 select/insert/update

## 엣지 케이스
- 비로그인 접근 → middleware가 처리, 페이지에서도 `redirect("/login")`로 2차 방어
- 이름 없는 계정 → "-" 표시
- `diagnoses` count 조회 오류 → 진단 횟수 "-" 표시
- 프로필 초기 로드 오류 → 빈 폼으로 시작(무시)
- `profiles` 테이블 미생성/저장 실패 → 메타데이터에 저장되어 동작(폴백), 둘 다 실패해야 에러 표시
- 로그아웃 호출 오류/예외 → 에러 문구 표시, 화면 유지

## 향후
- 닉네임 수정, 알림 설정, 결제/구독 관리
- 프로필 입력 기반 개인화 고도화(현재 MBTI·나이차는 참고 레이어로만 활용)

## 관련
- Flow: [flow.md](../flow.md) §3.5
- 가입 시 프로필 수집: [signup.md](./signup.md)
- 진단 플로우(내 정보·상대 정보·참고 레이어): [diagnose.md](./diagnose.md)
