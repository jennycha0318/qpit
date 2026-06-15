# 프로젝트 폴더 구조

Pacemaker는 **문서 → HTML 프로토타입 → Next.js 앱** 순으로 발전합니다.
세 단계가 한 저장소에 공존하도록 다음과 같이 구성합니다.

```
pacemaker/
├── README.md                  # 프로젝트 개요
├── STRUCTURE.md               # (이 문서) 폴더 구조 설명
├── .gitignore
│
├── docs/                      # 📄 기획·사업·설계 문서 (코드 무관)
│   ├── PRD.md                 # 제품 기획서 (메인)
│   ├── product/               # 제품 상세 스펙
│   │   ├── features.md        # 기능 명세
│   │   ├── user-flows.md      # 사용자 플로우
│   │   └── ai-logic.md        # AI 컨설팅 로직 상세 설계
│   ├── data/                  # 데이터 설계
│   │   └── schema.md          # 데이터 모델 (DB 스키마 설명)
│   ├── design/                # 디자인 시스템
│   │   └── design-system.md   # 컬러·타이포·컴포넌트 가이드
│   └── business/              # 사업 문서
│       ├── competitor-analysis.md  # 경쟁 분석
│       └── pricing.md         # 가격·수익 모델
│
├── prototype/                 # 🧪 1단계: HTML 프로토타입 (빌드 도구 없음)
│   ├── index.html             # 진입점 (랜딩/진단 플로우)
│   ├── css/                   # 스타일
│   ├── js/                    # 로직 (mock 데이터로 플로우 검증)
│   └── assets/                # 이미지·아이콘
│
└── web/                       # 🚀 2단계: Next.js 앱 (실제 제품)
    ├── prisma/
    │   └── schema.prisma      # DB 스키마 (소스 오브 트루스)
    ├── public/                # 정적 파일
    └── src/
        ├── app/               # App Router (페이지·레이아웃·API)
        │   ├── (marketing)/   # 랜딩 페이지 그룹
        │   ├── consult/       # 진단 플로우 (설문→리포트)
        │   └── api/           # API 라우트 (AI 진단 엔드포인트 등)
        ├── components/        # UI 컴포넌트
        │   ├── ui/            # 범용 UI (버튼·카드·입력 등)
        │   └── consult/       # 진단 도메인 컴포넌트
        ├── lib/               # 핵심 로직·설정
        │   ├── ai/            # Claude API 연동 + 프롬프트
        │   ├── frameworks/    # 심리 프레임워크 규칙 레이어
        │   └── db/            # DB 클라이언트 (Prisma)
        ├── types/             # 공용 타입 정의
        └── styles/            # 전역 스타일 (Tailwind)
```

## 단계별 작업 순서

| 단계 | 위치 | 내용 |
|------|------|------|
| 1. 기획 | `docs/` | 제품·데이터·사업 문서 정리 |
| 2. 프로토타입 | `prototype/` | HTML로 진단 플로우 UX 검증 (mock AI) |
| 3. MVP | `web/` | Next.js + Prisma + Claude API로 실제 구현 |

## 핵심 원칙
- **`docs/`는 항상 최신 소스 오브 트루스** — 코드보다 기획이 먼저 바뀜
- **`web/src/lib/frameworks/`가 차별화의 핵심** — 범용 LLM과 다른 "규칙 레이어"가 여기 산다
- **`prisma/schema.prisma`가 데이터의 단일 진실** — `docs/data/schema.md`는 그 설명본
