# 디자인 시스템

> 실제 적용 기준(`web/`). 톤: **진지하고 안정감 있는** — 민감한 고민을 다루므로 가볍지 않게.

## 컬러 (결정)
메인 컬러는 **초록**(안정감). `web/tailwind.config.ts` 기준.

| 토큰 | 값 | 용도 |
|------|-----|------|
| primary | `#2e7d5b` | 메인 초록(버튼·강조·좋은 타이밍) |
| primaryDark | `#1f5c43` | 버튼 그라데이션·강조 텍스트 |
| primarySoft | `#e8f2ec` | 옅은 초록 배경(배지·카드) |
| accent | `#3f8e76` | 보조(진행바 그라데이션 등) |
| bg | `#f5f7f5` | 차분한 중성 배경 |
| surface | `#ffffff` | 카드 |
| ink | `#1e2a25` | 본문 텍스트 |
| muted | `#6b776f` | 보조 텍스트 |
| line | `#e3eae5` | 보더 |
| good / warn / bad | `#2e7d5b` / `#c08a2e` / `#c2564c` | 점수 구간(≥65 / 45–64 / <45) |

## 타이포그래피 (결정)
- **본문/UI: 감탄로드 돋움체(GamtanRoad Dotum)** — `@font-face`로 CDN 로드(`fonts-archive/GamtanRoadDotum`, Regular 400 / Bold 700).
- fallback: `Pretendard, -apple-system, system-ui, "Apple SD Gothic Neo", "Malgun Gothic"`.
- **한글 줄바꿈은 단어(어절) 단위**: `word-break: keep-all; overflow-wrap: break-word;` (body 전역).

## 톤·원칙
- **이모지 최소화** — 진지한 인상. 스테이지/카드의 장식 이모지 제거, 라인 아이콘만.
- 모바일 우선(최대 너비 480px), 하단 탭 네비게이션.
- 심리적 안전감을 주는 여백·부드러운 라운드(카드 18px).

## 컴포넌트(globals.css `@layer components`)
- `.btn` / `.btn-primary`(초록 그라데이션) / `.btn-ghost`
- `.card`(흰 카드, line 보더, 라운드 18px)
- `.field-input`(포커스 시 primary 보더)

## 적용 항목
- [x] 컬러 — 초록 메인
- [x] 타이포 — 감탄로드 돋움체 + keep-all
- [x] 컴포넌트(버튼·카드·입력·리포트)
- [x] 하단 탭바
- [ ] 모션/마이크로인터랙션 정교화
- [ ] 일러스트 톤

> 참고: `prototype/` 및 루트 `font-preview.html`은 초기 탐색용(로즈 톤)이라 현재 디자인과 다릅니다. 기준은 `web/`.
