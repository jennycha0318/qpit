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
     │ /diagnose  │◀────────│  /login    │──┬─▶ /signup (개인정보 동의)
     │ (게스트)    │  로그인후 └────────────┘  ├─▶ /reset-password ─▶ /update-password
     └─────┬──────┘                          └─ Google OAuth
           │ 나이대 → 상황 → 설문 → 결과
           ▼
   ┌───────────────────┐
   │ 결과 + (게스트면)    │
   │  로그인 유도 카드    │
   └───────────────────┘

   [앱 화면 공통] 하단 탭: 진단 · 히스토리 · 프로필
   /diagnose  /history(+/[id])  /profile  /privacy
```

---

## 2. 신규 사용자 — 게스트 체험 → 전환
> 민감·충동적 사용 순간이라 **가입 전에 가치를 먼저** 경험시킨다.

```
랜딩 → "무료로 진단 시작 (로그인 없이)"
  → /diagnose
     1) 나이대 선택 (10대 / 20대 / 30대 / 40대 이상)  ← 10대면 '청소년 모드'
     2) 상황 선택 (썸 / 연애 중 / 이별 후)
     3) 설문 (선택 시 320ms 자동 진행, 마지막은 자유서술-선택)
  → [규칙 엔진 계산]
  → 결과(점수·플랜·근거·액션·메시지)
  → 비로그인이면 saveStatus="guest" → "로그인하면 저장돼요" 카드 (회원가입/로그인)
```
- 게스트: 진단·결과 전부 제공, **DB 저장 안 함**.
- 로그인 후 진단: 결과 자동 저장(saving→saved). 실패 시 "다시 저장".

---

## 3. 인증 플로우

### 3.1 회원가입 (이메일)
```
/signup : 이름·이메일·비번(6자+) + 개인정보 동의(필수 체크)
  → signUp({data:{name}})
  ├─ 이메일 인증 OFF → 즉시 세션 → /diagnose
  └─ 이메일 인증 ON  → "확인 메일 발송" → 메일 링크 → /auth/callback → /diagnose
```

### 3.2 로그인 (이메일)
```
/login : 이메일·비번 → signInWithPassword
  ├─ 성공 → /diagnose
  ├─ 실패 → "이메일 또는 비밀번호가 올바르지 않아요"
  └─ OAuth 콜백 실패로 ?error=auth 진입 시 → 안내 표시
```

### 3.3 Google OAuth
```
/login·/signup : "Google로 계속하기"
  → signInWithOAuth(redirectTo=/auth/callback)
  → 구글 동의 → /auth/callback (코드→세션 교환, 오픈리다이렉트 차단) → /diagnose
```

### 3.4 비밀번호 재설정
```
/login → "비밀번호 찾기" → /reset-password : 이메일
  → resetPasswordForEmail(redirectTo=/auth/callback?next=/update-password)
  → 메일 링크 → /auth/callback(복구 세션) → /update-password
  → 새 비번 → updateUser({password}) → /diagnose
```

### 3.5 로그아웃
```
/profile → "로그아웃" → signOut() → / (랜딩)
```

---

## 4. 네비게이션 (하단 탭바)
- `web/src/components/TabBar.tsx`, 레이아웃 전역 배치.
- **앱 화면에서 항상 표시**(진단/히스토리/프로필). 랜딩·로그인·회원가입·비번찾기·새비번 화면에선 숨김.
- `/history/[id]`는 히스토리 탭 활성. 비로그인이 히스토리/프로필 탭 탭하면 미들웨어가 `/login`으로.

---

## 5. 라우트 보호 (middleware)
```
공개:  / /login /signup /reset-password /update-password /privacy /diagnose /auth/callback
보호:  /home /history /profile   (비로그인 → /login)
```
- `/home`은 보호 + `/diagnose`로 리다이렉트(구 대시보드 대체).

---

## 6. 안전·윤리 흐름
- **위기 신호 감지**(이별 차단/저점수/집착 등 needsSupport) → 결과에 심리상담 카드(자살예방 109, 청소년 1388/#1388). 청소년 모드면 눈높이 변형.
- **청소년(10대) 모드** → 결과 상단 지지 배너 + 청소년 상담 카드, 외도 법률 고지는 비노출.
- **외도·학대 법적·윤리 고지** → 진단 시작 화면 + 결과(성인)에 표시 + 대한법률구조공단 링크.
- **개인정보 동의** → 회원가입 필수 체크 + `/privacy`.

---

## 7. 데이터 흐름 (진단 1건)
```
나이대 + 설문 답변(Answers)
  → diagnose(stage, answers)  [결정적 규칙, needsSupport 산출]
  → Diagnosis (점수·플랜·근거… + needsSupport) , 페이지에서 minor 부여
  → 로그인 시: insert into diagnoses {user_id, stage, score, result(=Diagnosis)}
  → 히스토리/상세에서 result 그대로 <Report>로 렌더(청소년·위기 톤 포함)
```
상세: [../backend/schema.md](../backend/schema.md)
