# 큐핏(Qpit) 개발 노트 · 의사결정 로그

> 작성/갱신: 2026-06. 이 문서는 개발 과정에서 내린 결정과 합의를 모아 둔 단일 기준 문서입니다. "기억이 흩어지지 않도록" 새로운 결정이 생기면 여기에 추가하세요.

---

## 1. 제품 개요
- **이름:** 큐핏 (영문 **Qpit**). 2026-06 "Pacemaker"에서 리브랜딩. **UI 노출 텍스트는 한국어 "큐핏"으로 통일.**
- **한 줄 정의:** AI 연애 **타이밍 의사결정 컨설팅** 웹앱 (썸/짝사랑/연애/이별 단계별로 "지금 어떻게·언제 행동할지" 분석).
- **포지셔닝:** "연애 컨설팅"(코치/코칭 아님). 페르소나 = "AI 연애 컨설턴트".
- **해자(moat):** 모델 자체가 아니라 그 위의 도메인 시스템(구조화 설문 + 심리 프레임워크(반-아부) + 타임라인 + 결과 피드백 + 신뢰 브랜드).

## 2. 기술 스택 · 인프라
- **프런트/백:** Next.js 15 (App Router, TS, Tailwind, React 19) — 코드 루트 `web/`.
- **인증/DB:** Supabase (이메일 + Google OAuth + 진단 히스토리, RLS). 프로젝트 `https://dtvhjowhlefutlyovqrx.supabase.co`.
- **배포:** Vercel, GitHub `main` 푸시 시 자동 배포. 프로덕션 `https://pacemaker-six-eta.vercel.app`. 레포 `github.com/jennycha0318/pacemaker`.
- **환경변수(서버 전용, NEXT_PUBLIC 금지):** `ANTHROPIC_API_KEY`. 그 외 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. → `.env.local`(로컬) + Vercel Project Settings(Production 스코프) 양쪽 필요. **env 추가 후 Vercel은 반드시 Redeploy 해야 반영.**

## 3. AI 아키텍처
- **결과 해석 라우트:** `POST /api/interpret` — `{stage, answers, minor, name}` 수신 → **서버에서 규칙 엔진 재계산**(점수·타이밍·행동·주의는 규칙이 결정) → **Claude가 '해석(interpretation)·문구(message)'만 생성**. 구조화 출력(json_schema).
- **모델 결정(2026-06):** **결과 해석 = `claude-opus-4-8`** (고품질). **챗봇(추후) = `claude-sonnet-4-6`.** (라우트 `MODEL` 상수.)
- **시스템 프롬프트 프레임워크:** 애착이론, 근거기반(반-아부), 안전 최우선, 미성년 배려, 집착/스토킹 금지. "규칙 결과를 신뢰하고 일관된 해석만." **호칭:** 로그인=`OO님`, 비로그인=`당신`. **반말("너·네가") 금지.**
- **폴백:** 학대 케이스/보류(hold)/키 미설정/오류/거부 → 규칙 결과로 자동 폴백 → **키 없이도 앱 동작.**
- **클라이언트 플로우:** 설문 완료 → **'분석 중' 화면** → AI 보강 완료(또는 25초 타임아웃 폴백) 후 결과 페이지 전환 → 저장 1회.

## 4. 진단 플로우 (`web/src/app/diagnose/page.tsx`)
- 단계(Phase): `me → stage → partner → survey → analyzing → result`.
- 상황(stage): 썸(crush)·**짝사랑(unrequited)**·연애(dating)·이별(breakup). 짝사랑은 썸과 같은 설문/엔진 재사용(라벨·설명만 다름; 추후 전용 튜닝 가능).
- 뒤로가기 버튼: 전 단계 통일(스텝 표시 아래, 글래스 알약 = `BACK_BTN`).
- 규칙 엔진: `web/src/lib/diagnose/{engine,survey,personality,colors,freetext}.ts`. 점수·플랜·근거는 결정적 규칙.

## 5. 디자인
- **방향:** 글래스모피즘 + 소프트 파스텔(라벤더/위스테리아/아쿠아). (초록 폐기.) 금색도 시도했으나 폐기.
- **로고(최종):** 파스텔 하트 + 좌하단→우상단 **대각선 관통 화살**(화살촉=마름모, 깃=`>>`). 그라데이션 `#9a8fd8→#7c9ed4→#5cc1bf`(외곽선/화살), 하트 채움 `#cfc7ef→#bcd0ee→#a9e6e2`. `Logo.tsx` + `icon.svg`(파비콘). 관통효과 = 자루(line) 뒤 → 하트(불투명) → 깃·촉 순서로 그려 가운데를 가림. **SVG 주의:** 수평/수직 line에 그라데이션 쓰면 `gradientUnits="userSpaceOnUse"` 필요(대각선은 무관).
- **워드마크:** 전 화면 "큐핏" 파스텔 그라데이션(wisteria→aqua). 로그인/회원가입/공유는 `BrandLockup pastel`(20px), 랜딩/스플래시/로딩은 인라인(히어로 크기 유지).
- **스플래시:** `SplashScreen.tsx` — 전체 로드마다 최소 1.4초 통통 튀는 로고(`pm-bounce`) + "큐핏" + 태그라인 후 페이드아웃. (loading.tsx는 너무 빨라 안 보여서 추가.)
- **랜딩:** 글로우 오브 제거(배경 통일), 특징 카드 periwinkle 테두리, 체크 일렬·가운데.
- **결과 페이지:** MBTI 궁합 카드 제거, 위기상담 카드 최하단.

## 6. 안전·정책 (필수 유지)
- **게이팅:** 외도·**학대(통제/위협/폭력)**·재진단 강박·차단 후 우회 — 안전 우선 분기(학대 시 점수 엔진 우회, 상담 연결). **미성년(≤19세)** 모드는 현행 유지(지지 강화). 위기 신호(자해 등) → 상담 연결(CrisisResources).
- **MBTI:** 점수 **미반영**, '참고 레이어'로만. 단정 금지·경향성 어투. 근거 = `docs/reference/mbti-love.md`(박선영 2001 석사논문 1편, 소표본·약한 근거 → 과신 금지).

## 7. Google 로그인 설정 메모
정상 동작 조건(모두 외부 콘솔에서 사용자 직접 설정):
1. **Google Cloud Console** OAuth 클라이언트 → 승인된 리디렉션 URI에 `https://dtvhjowhlefutlyovqrx.supabase.co/auth/v1/callback`.
2. **Supabase → Auth → Providers → Google** Enable + Client ID/Secret 입력.
3. **Supabase → Auth → URL Configuration** Site URL + Redirect URLs(`<prod>/auth/callback`, `http://localhost:3000/auth/callback`).
4. OAuth 동의 화면 **프로덕션 게시**(테스트 상태면 "확인 안 된 앱" 경고). → 2026-06 완료.
- 코드: `GoogleButton`에 `prompt=select_account`(항상 계정 선택창). 로그인 시 뜨는 Gmail "본인 확인"은 **구글 계정 보안(신규 앱 1회성)** 으로 앱이 제어 불가.

## 8. 미완 · 예정
- **챗봇(진단 Q&A) + 결제(메시지당 과금):** 미구현. 챗봇 모델 = **Sonnet 4.6**. 결제는 **결정사항(결제사·가격·무료 한도)** + 사용자의 결제계정/키 세팅 필요. ⚠️ 결제/금융 트랜잭션·크리덴셜 입력은 어시스턴트가 대신 못 함 — 사용자가 설정.
- 받은 메시지 해석(캡처 업로드), 이미지 업로드 — 프로토타입에 있음, 이식 예정.
- 짝사랑 전용 설문/점수 분리(선택).
- MBTI 자료를 `/api/interpret` 시스템 프롬프트 컨텍스트로 주입(선택).

## 9. 어시스턴트 제약(반복 확인된 것)
- API 키·비밀번호·결제정보 등 **크리덴셜을 대신 입력 불가** — 사용자가 직접 콘솔/대시보드에서.
- **금융 거래(결제 실행) 불가.** 결제 연동 코드는 만들 수 있으나 계정/키 세팅·결제 실행은 사용자.
- 저작권 자료(예: 논문 PDF) **원문 그대로 복제·커밋 금지** — 요약/변형만.

## 10. 참고 경로
- 규칙 엔진: `web/src/lib/diagnose/`
- AI 라우트: `web/src/app/api/interpret/route.ts`
- 진단 플로우: `web/src/app/diagnose/page.tsx`
- 로고/스플래시: `web/src/components/{Logo,SplashScreen}.tsx`, `web/src/app/icon.svg`
- MBTI 참고: `docs/reference/mbti-love.md`
- 셋업: `web/SETUP.md`
