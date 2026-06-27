# 큐핏

> AI 기반 연애·재회 의사결정 컨설팅 서비스

"고백해도 될까? 지금 연락해도 될까?"
연애의 결정적 순간마다, 내 상황과 상대 성향 데이터를 분석해
**언제·어떻게 행동해야 성공 확률이 높은지** 알려주는 AI 연애 컨설턴트.

## 라이브
- 🌐 https://qpit.vercel.app

## 지금까지 만든 것 (현재 상태)
- **인증** — 이메일/비밀번호 + Google OAuth + 비밀번호 재설정 (Supabase Auth)
- **진단** — 썸(고백)/연애(유지)/이별(재회) 상황별 설문 → 규칙 엔진이 **타이밍 점수 + 언제·어떻게 플랜 + 근거·액션·메시지** 산출
- **게스트 체험** — 로그인 없이 진단 1회 체험, 저장·히스토리는 로그인
- **히스토리** — 진단 결과 저장·목록·재열람 (사용자별, RLS 보안)
- **하단 탭** — 진단 / 히스토리 / 프로필 (앱 화면 공통)
- **안전·윤리**
  - 위기 신호 감지 시 **심리상담 연결** (자살예방 109, 청소년 9~24세 1388/#1388)
  - **외도·학대 법적·윤리 사전 고지** + 대한법률구조공단 무료상담 링크
  - **개인정보 수집·이용 동의** + 개인정보처리방침
  - **청소년(미성년) 눈높이 모드** — 부드러운 지지 톤, 자극 최소화
- **디자인** — 초록 메인(안정감), 감탄로드 돋움체, 한글 단어단위 줄바꿈

## 문서
- [제품 기획서 (PRD)](docs/PRD.md)
- [기능 명세 (Functional Spec)](docs/functional-spec/README.md) — 페이지별 spec + [flow](docs/functional-spec/flow.md)
- [백엔드 · DB 스키마](docs/backend/schema.md)
- [개선 백로그 (페르소나 감사)](docs/improvement-backlog.md)
- [AI 개인화 설계](docs/product/ai-personalization.md) · [디자인](docs/design/design-system.md)

## 기술 스택
- **앱(web/)**: Next.js 15 (App Router, TypeScript, Tailwind)
- **인증·DB**: Supabase (Auth + Postgres + RLS)
- **호스팅**: Vercel
- 셋업·실행: [web/SETUP.md](web/SETUP.md)

## 저장소 구조
```
docs/        기획·기능명세·백엔드·디자인 문서
prototype/   초기 HTML 프로토타입 (탐색용, 디자인은 web/ 와 별개)
qpit.html  프로토타입 단일 파일 데모(다운로드용)
web/         실제 제품 (Next.js + Supabase)
```
> 참고: `prototype/`(및 `qpit.html`)는 초기 탐색용이라 최신 web/ 앱과 디자인·기능이 다릅니다. 최신 제품은 `web/` 입니다.

## 개발 로드맵
1. ✅ 기획 (PRD)
2. ✅ HTML 프로토타입
3. ✅ MVP — Next.js + Supabase (인증·진단·히스토리)
4. ✅ 안전·윤리 (상담연결·법률고지·동의·청소년 모드)
5. ✅ AI 개인화(Claude) 결합 — 자유서술·상대 설명 반영(interpret/chat), 회고 기반 재진단 개인화
6. ✅ 백로그 우선순위 반영 — P1~P7, 히스토리 추세(prevInsight 최근 5건+누적 적중률), 상대 유형별 플레이북, 안전 하드닝, 톤 분기
7. ⬜ 그로스·수익화 — 재방문 트리거(예측 검증 알림)·카톡 퍼스트 훅·9:16 공유 카드·적중률 집계 (NPS 양수 확인 후 결제)
