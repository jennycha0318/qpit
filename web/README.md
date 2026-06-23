# Web — Next.js + Supabase 앱

큐핏(Qpit) 실제 제품. **Next.js 15 (App Router, TS, Tailwind) + Supabase (Auth + DB)**.

👉 **셋업/실행은 [SETUP.md](SETUP.md) 참고** (Supabase 키 + 스키마 + 구글 OAuth)

## 빠른 시작
```bash
cd web
npm install
cp .env.local.example .env.local   # 값 채우기 (Supabase URL/anon key)
# Supabase SQL Editor 에서 supabase/schema.sql 실행
npm run dev    # http://localhost:3000
```

## 구조
```
web/
├── supabase/schema.sql        # DB 스키마 + RLS (Supabase에 실행)
├── src/
│   ├── middleware.ts          # 세션 갱신 + 보호 라우트
│   ├── lib/
│   │   ├── supabase/          # 클라이언트(browser/server/middleware)
│   │   └── diagnose/          # 규칙 진단 엔진 + 설문 정의
│   ├── components/            # Report, GoogleButton, SignOutButton
│   └── app/
│       ├── page.tsx           # 랜딩
│       ├── login / signup / reset-password
│       ├── auth/callback      # OAuth·이메일 콜백
│       ├── home               # 홈(진단/히스토리/프로필)
│       ├── diagnose           # 설문 → 진단 → 저장
│       ├── history /[id]      # 히스토리 목록·재열람
│       └── profile            # 계정·로그아웃
└── prisma/schema.prisma       # (참고용 정규화 모델 — 현재는 supabase/schema.sql 사용)
```

## 인증
- 이메일/비밀번호 + Google OAuth + 비밀번호 재설정 (Supabase Auth)
- `middleware.ts`가 `/home /diagnose /history /profile` 보호

## 데이터
- `diagnoses` 테이블에 진단 결과 저장 (RLS: 본인 데이터만)
- 히스토리에서 과거 진단 재열람

## 다음 단계
- 받은 메시지 해석 · 캡처 업로드 이식 (프로토타입 참고)
- AI 개인화(Claude) 결합 — `docs/product/ai-personalization.md`
