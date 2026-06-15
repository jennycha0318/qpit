# Web (Next.js 앱)

2단계: 실제 제품. Next.js + TypeScript + Tailwind + Prisma + Claude API.
**아직 초기화 전** — 폴더 구조만 잡아둔 상태.

## 초기화 (프로토타입 검증 후 실행)
```bash
# web/ 디렉토리에서
npx create-next-app@latest . --ts --tailwind --app --src-dir
npm install @prisma/client && npx prisma init
npm install @anthropic-ai/sdk
```
> 주의: `create-next-app`은 기존 폴더 구조를 덮어쓸 수 있으니,
> 빈 디렉토리에 생성 후 미리 잡아둔 `prisma/`, `src/lib/` 등을 병합하는 방식 권장.

## 구조
```
web/
├── prisma/schema.prisma   # DB 스키마 (작성됨)
├── public/
└── src/
    ├── app/               # App Router (페이지·API)
    │   ├── (marketing)/   # 랜딩
    │   ├── consult/       # 진단 플로우
    │   └── api/           # AI 진단 API
    ├── components/{ui,consult}/
    ├── lib/
    │   ├── ai/            # Claude 연동 + 프롬프트 ★
    │   ├── frameworks/    # 심리 프레임워크 규칙 레이어 ★ (핵심 차별점)
    │   └── db/            # Prisma 클라이언트
    ├── types/
    └── styles/
```
★ = 범용 LLM과 차별화되는 핵심 (PRD §11-2, docs/product/ai-logic.md)

## 환경 변수 (.env — git에 올리지 말 것)
```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
```
