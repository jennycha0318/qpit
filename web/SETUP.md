# 큐핏(Qpit) Web — 셋업 가이드

Next.js 15 + Supabase(Auth + DB) MVP. 아래 순서대로 하면 로컬에서 동작합니다.

## 1. 의존성 설치
```bash
cd web
npm install
```

## 2. Supabase 프로젝트 만들기
1. https://supabase.com 에서 프로젝트 생성 (무료)
2. **Project Settings → API** 에서 두 값 복사:
   - `Project URL`
   - `anon public` key

## 3. 환경 변수
`web/.env.local.example` 를 복사해 `web/.env.local` 로 만들고 값 채우기:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. DB 스키마 생성
Supabase 대시보드 → **SQL Editor** → `web/supabase/schema.sql` 내용 붙여넣고 **Run**.
(진단 히스토리 테이블 + RLS 보안 생성)

## 5. 이메일 로그인 설정
- **Authentication → Providers → Email** 활성화 (기본 켜짐)
- 빠른 테스트를 원하면 **Authentication → Sign In / Providers → Email → "Confirm email" 끄기**
  → 가입 즉시 로그인됨 (운영에서는 켜두는 걸 권장)

## 6. Google 로그인 설정 (선택)
1. **Google Cloud Console** → OAuth 동의 화면 + OAuth 클라이언트 ID(웹) 생성
   - 승인된 리디렉션 URI: `https://<프로젝트>.supabase.co/auth/v1/callback`
2. 발급한 Client ID/Secret 을 Supabase **Authentication → Providers → Google** 에 입력하고 활성화
3. Supabase **Authentication → URL Configuration → Redirect URLs** 에 추가:
   - `http://localhost:3000/auth/callback`
   - (배포 후) `https://<도메인>/auth/callback`

## 7. 실행
```bash
npm run dev
```
→ http://localhost:3000

## 플로우
랜딩 → 로그인/회원가입/비밀번호찾기 → 홈 → 새 진단 / 진단 히스토리 / 프로필

## 현재 범위 & 다음 단계
- ✅ 이메일·구글 인증, 세션, 보호 라우트(미들웨어)
- ✅ 규칙 기반 진단 + Supabase 저장 + 히스토리 조회/재열람(RLS)
- ⬜ 받은 메시지 해석 · 캡처 업로드 (프로토타입에 있음 — 이식 예정)
- ⬜ AI 개인화(Claude) 결합 (docs/product/ai-personalization.md)
