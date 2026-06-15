# 사용자 플로우 (Flow)

Pacemaker의 핵심 흐름. 구현 기준(`web/`).

---

## 1. 전체 지도
```
                ┌─────────────┐
                │   랜딩 /     │  (비로그인)
                └──────┬──────┘
            ┌──────────┴───────────┐
   "무료로 진단 시작"          "로그인·회원가입"
            │                      │
            ▼                      ▼
     ┌────────────┐         ┌────────────┐
     │ /diagnose  │◀────────│  /login    │──┬─▶ /signup
     │ (게스트)    │  로그인후 └────────────┘  ├─▶ /reset-password
     └─────┬──────┘                          └─ Google OAuth
           │ 결과
           ▼
   ┌───────────────────┐
   │ 결과 + 로그인 유도   │  (게스트는 저장 안 됨)
   └───────────────────┘

   [로그인 상태] 하단 탭: 진단 · 히스토리 · 프로필
   /diagnose  /history(+/[id])  /profile
```

---

## 2. 신규 사용자 — 게스트 체험 → 전환 (핵심 funnel)
> 설계 의도: 민감·충동적 사용 순간이라, **가입 전에 가치를 먼저** 경험시킨다.

```
랜딩 → "무료로 진단 시작 (로그인 없이)"
  → /diagnose : 상황 선택(썸/연애중/이별후)
  → 설문(8~10문항, 선택 시 자동 진행)
  → [규칙 엔진 계산]
  → 결과(점수·플랜·근거·액션·메시지)
  → saveStatus = "guest" → "로그인하면 저장돼요" 카드
      ├─ 회원가입 → /signup
      └─ 로그인 → /login
```
- 게스트: 진단·결과 전부 제공, **DB 저장 안 함**.
- 로그인 후 진단: 결과가 자동으로 `diagnoses`에 저장(saveStatus = saving→saved).

---

## 3. 인증 플로우

### 3.1 회원가입 (이메일)
```
/signup : 이름·이메일·비번(6자+) 입력 → signUp({data:{name}})
  ├─ 이메일 인증 OFF → 즉시 세션 → /diagnose
  └─ 이메일 인증 ON  → "확인 메일 발송" 안내 → (메일 링크) → /auth/callback → /diagnose
```

### 3.2 로그인 (이메일)
```
/login : 이메일·비번 → signInWithPassword
  ├─ 성공 → /diagnose
  └─ 실패 → "이메일 또는 비밀번호가 올바르지 않아요"
```

### 3.3 Google OAuth
```
/login 또는 /signup : "Google로 계속하기"
  → signInWithOAuth(redirectTo=/auth/callback)
  → 구글 동의 → /auth/callback (exchangeCodeForSession) → /diagnose
```

### 3.4 비밀번호 재설정
```
/login → "비밀번호 찾기" → /reset-password : 이메일 입력
  → resetPasswordForEmail(redirectTo=/auth/callback?next=/update-password)
  → (메일 링크) → /auth/callback (복구 세션 교환) → /update-password
  → 새 비번 입력 → updateUser({password}) → /diagnose
```

### 3.5 로그아웃
```
/profile → "로그아웃" → signOut() → / (랜딩)
```

---

## 4. 네비게이션 (하단 탭바)
- `web/src/components/TabBar.tsx`, 레이아웃 전역 배치.
- **로그인 상태에서만 표시** (게스트 진단 화면은 탭 없음).
- 탭: **진단**(`/diagnose`) · **히스토리**(`/history`) · **프로필**(`/profile`).
- 현재 경로 강조. `/history/[id]`는 히스토리 탭 활성.

---

## 5. 라우트 보호 (middleware)
```
공개:  / /login /signup /reset-password /update-password /diagnose /auth/callback
보호:  /home /history /profile   (비로그인 → /login)
```
- `/home`은 보호 + `/diagnose`로 리다이렉트(구 대시보드 대체).

---

## 6. 데이터 흐름 (진단 1건)
```
설문 답변(Answers)
  → diagnose(stage, answers)  [web/src/lib/diagnose/engine.ts, 결정적 규칙]
  → Diagnosis 객체 (점수·플랜·근거…)
  → 로그인 시: insert into diagnoses {stage, score, result, user_id=auth.uid()}
  → 히스토리/상세에서 result 그대로 <Report>로 렌더
```
상세: [../backend/schema.md](../backend/schema.md)
