# Pacemaker 💘

> AI 기반 연애·재회 의사결정 컨설팅 서비스

"고백해도 될까? 지금 연락해도 될까?"
연애의 결정적 순간마다, 내 상황과 상대 성향 데이터를 분석해
**언제·어떻게 행동해야 성공 확률이 높은지** 알려주는 AI 연애 컨설턴트.

## 🚀 데모 바로 써보기 (다운로드)
**[⬇️ pacemaker.html 다운로드](https://github.com/jennycha0318/pacemaker/raw/main/pacemaker.html)**
— 단일 파일이라 받아서 **더블클릭만 하면** 브라우저에서 바로 실행됩니다. (서버·설치 불필요)

> 이 파일은 `prototype/` 소스를 합쳐 자동 생성됩니다.
> 소스 수정 후 다시 만들려면: `node prototype/build.js`
> (개발 중 분리된 버전으로 보려면 `prototype/index.html`)

## 라이브
- 🌐 https://pacemaker-six-eta.vercel.app (Vercel)

## 문서
- [제품 기획서 (PRD)](docs/PRD.md)
- [기능 명세 (Functional Spec)](docs/functional-spec/README.md) — 페이지별 spec + [flow](docs/functional-spec/flow.md)
- [백엔드 · DB 스키마](docs/backend/schema.md)

## 개발 로드맵
1. ✅ 기획 (PRD)
2. ✅ HTML 프로토타입 (진단 + 플랜 + 메시지 해석 + 공유 + mock 인증/히스토리)
3. 🚧 MVP — Next.js + Supabase (인증/DB/히스토리) · [web/SETUP.md](web/SETUP.md)
4. ⬜ AI 개인화(Claude) 결합 + 메시지 해석 이식
5. ⬜ 확장 (타임라인 컨설팅 / 시뮬레이션)

## 기술 스택 (예정)
- 프로토타입: HTML / CSS / JS
- 제품: Next.js + TypeScript + Tailwind
- AI: Claude API (claude-opus-4-8)
