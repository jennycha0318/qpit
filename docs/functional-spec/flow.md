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
     │ /diagnose  │◀────────│  /login    │──┬─▶ /signup (출생연도·MBTI·동의)
     │ (게스트)    │  로그인후 └────────────┘  ├─▶ /reset-password ─▶ /update-password
     └─────┬──────┘                          └─ Google OAuth
           │ 내 정보 → 상황 → 상대 정보 → 설문 → 결과
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
  → /diagnose  (단계 = me → stage → partner → survey → result)
     1) 내 정보 (me): 출생연도(필수) + 내 MBTI(선택)  ← 생년 기반 청소년(minor) 판정
     2) 상황 선택 (stage): 썸 / 연애 중 / 이별 후
     3) 상대 정보 (partner): 상대 출생연도·MBTI (선택, "모르겠어요·건너뛰기" 가능)
     4) 설문 (survey): 선택 시 320ms 자동 진행, 마지막은 자유서술-선택
  → [규칙 엔진 계산]
  → 결과 (result): 점수·플랜·근거·액션·메시지 + 성향·궁합(참고) 카드
  → 비로그인이면 saveStatus="guest" → "로그인하면 저장돼요" 카드 (회원가입/로그인)
```
- 게스트: 진단·결과 전부 제공, **DB 저장 안 함**.
- 로그인 후 진단: 결과 자동 저장(saving→saved). 실패 시 "다시 저장".
- **로그인 + 프로필에 생년 있으면 '내 정보(me)' 단계 생략** → 바로 상황 선택부터. (생년 미수집 사용자는 me 단계에서 입력하고, 로그인 상태면 프로필에 백필 저장)
- 구 '나이대 버킷'(10대/20대/30대/40대 이상) 단계는 **폐지**됨. 청소년 판정은 더 이상 '10대 선택'이 아니라 **출생연도 기반(연 나이 ≤19세, `CUR_YEAR - 생년 ≤ 19`)**.

---

## 3. 인증 플로우

### 3.1 회원가입 (이메일)
```
/signup : 이름·이메일·비번(6자+) + 출생연도(필수) + MBTI(선택) + 개인정보 동의(필수 체크)
  → signUp({data:{name, birth_year, mbti}})  (메타데이터에 생년·MBTI 동봉)
  ├─ 이메일 인증 OFF → 즉시 세션 → saveProfile(생년·MBTI) → /diagnose
  └─ 이메일 인증 ON  → "확인 메일 발송" → 메일 링크 → /auth/callback → /diagnose
```
- 동의 문구에 **이메일·닉네임·출생연도·(선택)MBTI·진단 입력 저장**이 명시됨.
- 세션 즉시 생성 시 `saveProfile`로 profiles 테이블 저장(실패해도 메타데이터에 남아 추후 백필).

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
/profile → "계정 관리" 그룹의 "로그아웃" → signOut() → / (랜딩)
```

### 3.6 프로필 편집
```
/profile : 계정 정보(읽기) + ProfileEditor(편집)
  → 출생연도·MBTI·애착 성향 편집 → saveProfile → "저장됨 ✓"
```
- 이전엔 읽기 전용이었으나, 지금은 **출생연도·MBTI·애착 성향을 편집/저장** 가능.
- 로그아웃 버튼은 별도 **'계정 관리'** 그룹으로 분리.

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
- **청소년(minor) 모드** → 결과 상단 지지 배너 + 청소년 상담 카드, 외도 법률 고지는 비노출.
  - 판정 기준이 구 '10대 선택'에서 **출생연도 기반(연 나이 ≤19세)**으로 변경됨. `diagnose` 페이지에서 `d.minor`를 부여.
- **외도·학대 법적·윤리 고지** → 진단 상황(stage) 선택 화면(성인일 때) + 결과(성인)에 표시 + 대한법률구조공단 링크.
- **개인정보 동의** → 회원가입 필수 체크 + `/privacy`. 수집항목에 출생연도·MBTI·애착 성향·상대 정보(제3자, 선택)가 반영됨.

---

## 7. 데이터 흐름 (진단 1건)
```
설문 답변 + 내/상대 생년·MBTI (Answers에 myMbti·partnerMbti·myBirthYear·partnerBirthYear 병합)
  → diagnose(stage, answers)  [결정적 규칙, needsSupport 산출]
       ├─ 점수·플랜·근거·needsSupport = 결정적 규칙 신호(애착·행동·맥락)만으로 산출
       └─ computePersonality(answers) → compat (성향·궁합 참고 레이어) — ★점수 미반영
  → Diagnosis (점수·플랜·근거… + needsSupport + compat) , 페이지에서 minor(생년 기반) 부여
  → 로그인 시: insert into diagnoses {user_id, stage, score, result(=Diagnosis)}
  → 히스토리/상세에서 result 그대로 <Report>로 렌더(청소년·위기 톤 + 성향·궁합 참고 카드 포함)
```
- **성향·궁합 '참고' 레이어**(`Diagnosis.compat`, `web/src/lib/diagnose/personality.ts`):
  - 상대 MBTI → 소통 톤 팁(E/I·S/N·T/F·J/P 4줄), 나/상대 MBTI → 궁합 한 줄, 생년 → 나이차 코멘트.
  - ★중요: **점수에는 전혀 반영하지 않음.** 결정적 규칙 점수는 기존 신호만 유지. MBTI·나이차는 '예측 핵심'이 아니라 **개인화·참여용 참고 레이어**(솔직한 신뢰도 표기).
  - 결과(`Report.tsx`)에 "성향·궁합 (참고)" 카드 + "MBTI·나이차는 참고 요소, 핵심 판단은 신호 기준" 고지 노출.
- **영속 프로필**(`public.profiles`, `web/src/lib/profile.ts`): id(=auth.users.id)·birth_year·mbti·attachment·updated_at, 본인전용 RLS(select/insert/update). 읽기/저장은 `getProfile`/`saveProfile`가 **profiles 테이블 우선 + user_metadata 폴백**(테이블 미생성 시에도 메타데이터로 동작).

상세: [../backend/schema.md](../backend/schema.md)
