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
- 에러 메시지 영역(`text-bad`), 성공 메시지 영역(`text-good`)
- 개인정보 동의 체크박스 — `/privacy`로 가는 "개인정보 수집·이용" 링크(새 탭)와 안내문("이메일·닉네임과 진단 입력(상황·자유서술)이 저장되며, 자유서술은 추후 AI 분석에 활용될 수 있어요.")
- "가입하기" 버튼 (로딩 중 "가입 중…", `disabled`)
- 링크: "로그인"(`/login`)

## 사용자 액션
| 액션 | 결과 |
|------|------|
| 가입하기 | 검증 통과 시 `supabase.auth.signUp({email, password, options:{data:{name}, emailRedirectTo}})` 호출 |
| Google로 계속하기 | `GoogleButton`의 OAuth 처리 |

## 검증 규칙
- 이름 비어있음 → "이름(닉네임)을 입력해 주세요."
- 이메일 형식 불일치(정규식 검사) → "올바른 이메일을 입력해 주세요."
- 비밀번호 6자 미만 → "비밀번호는 6자 이상이어야 해요."
- 개인정보 동의 미체크 → "개인정보 수집·이용에 동의해 주세요."
- Supabase 에러(중복 이메일 등) → `error.message` 표시
- 예외(네트워크 등) → "네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요."

## 상태
- `name`, `email`, `pw`: 입력값
- `err`: 에러 메시지, `ok`: 성공 메시지
- `loading`: 가입 진행 중 여부(버튼 비활성화·문구 변경)
- `agree`: 개인정보 동의 체크 여부

## 가입 후 분기
- **이메일 인증 OFF** → `data.session` 존재 → `router.push("/diagnose")`
- **이메일 인증 ON** → 세션 없음 → "가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 완료해 주세요." 안내 → 메일 링크 클릭 → `emailRedirectTo`(`${location.origin}/auth/callback`)

## 데이터
- 호출: `supabase.auth.signUp` (`options.data.name`으로 user_metadata.name 저장)
- Writes: auth.users, 세션(이메일 인증 OFF 시)
- 클라이언트: `createClient()` (`@/lib/supabase/client`)

## 엣지 케이스
- 이미 가입된 이메일 → Supabase `error.message` 표시
- 이메일 인증 켜진 상태에서 가입 직후엔 세션 미생성(메일 확인 필요)
- 개인정보 미동의 시 가입 차단

## 관련
- Flow: [flow.md](../flow.md) §3.1
- 개인정보 처리방침: `/privacy`
