# 인증 · 진단 히스토리 설계

> 상태: 🚧 설계 v0.1 (프로토타입은 mock, 실제는 백엔드 필요)

## 1. 플로우
```
랜딩 → 로그인 / 회원가입 / 비밀번호 찾기 → 홈
홈 → 새 진단 · 받은 메시지 해석 · 진단 히스토리 · 프로필
```

## 2. 프로토타입 (현재 구현 — mock)
브라우저만으로 동작하도록 **localStorage 기반 mock 인증**:
- 회원가입/로그인: `localStorage`에 사용자 저장 (비번은 데모용 base64 — 비보안)
- Google 로그인: 데모 구글 계정으로 즉시 로그인 (실제 OAuth 아님)
- 세션: `localStorage`에 현재 이메일 저장 → 새로고침해도 로그인 유지
- 히스토리: 진단 완료 시 `pacemaker_history_<email>`에 결과 저장, 히스토리 화면에서 다시 열람

> ⚠️ mock의 한계: 기기/브라우저에 종속, 보안 없음, 비번 재설정은 안내만. **실제 서비스 전 반드시 아래로 교체.**

## 3. 실제 구현 (web/ — 권장)
### 인증
- **Supabase Auth** 또는 **NextAuth(Auth.js)** — 둘 다 Google 제공자 기본 지원
- Google 로그인: Google Cloud OAuth 클라이언트 ID 발급 → provider 설정
- 이메일/비번: 해시(bcrypt 등)는 서비스가 처리, 비번 재설정은 메일 링크
- 세션: 서버 세션/JWT (httpOnly 쿠키)

### 히스토리 (이미 있는 스키마 활용)
- `User` ← 인증 사용자 (provider 필드 추가: email/google)
- `Case` / `Diagnosis` 테이블에 진단 저장 (web/prisma/schema.prisma)
- 히스토리 = 로그인 사용자의 `Case`+`Diagnosis` 목록 조회
- 보안: 행 수준 접근제어(사용자 본인 데이터만)

## 4. 화면 매핑
| 화면 | 프로토타입 id | 실제(web) |
|------|---------------|-----------|
| 로그인 | screen-login | /login |
| 회원가입 | screen-signup | /signup |
| 비번찾기 | screen-reset | /reset-password |
| 홈 | screen-home | /(home) |
| 히스토리 | screen-history | /history |
| 프로필 | screen-profile | /profile |
