# 디자인 시스템

> 실제 적용 기준(`web/`). 톤: **차분하고 부드러운 — 파스텔 그라데이션 + 글래스모피즘**.
> 민감한 고민을 다루므로 가볍지 않되, 위압적이지 않게(프로스트 글래스로 숨 쉬는 여백).

## 컬러 (결정)
파스텔 드리미 팔레트(라벤더·페리윙클·위스테리아·아쿠아). `web/tailwind.config.ts` 기준.

### 팔레트 원색 (레퍼런스)
| 이름 | 값 |
|------|-----|
| Floral White | `#f7f4ea` |
| Lavender | `#ded9e2` |
| Periwinkle | `#c0b9dd` |
| Wisteria Blue | `#80a1d4` |
| Pearl Aqua | `#75c9c8` |

### 역할 토큰
| 토큰 | 값 | 용도 |
|------|-----|------|
| primary | `#80a1d4` | 메인(위스테리아 블루) — 버튼·강조·활성 |
| primaryDark | `#5f82bd` | 강조 텍스트·배지 |
| primarySoft | `#eaeef8` | 옅은 배경(배지·활성 탭·게스트 카드) |
| accent | `#75c9c8` | 보조(펄 아쿠아) — 버튼/진행바 그라데이션 끝점 |
| bg | `#eef0fb` | 배경 베이스(위에 메시 그라데이션 오버레이) |
| surface | `#ffffff` | 불투명 카드/입력 기준색(글래스는 alpha 적용) |
| ink | `#2c2f55` | 본문 텍스트(딥 인디고) |
| muted | `#7b7fa6` | 보조 텍스트(뮤트 페리윙클) |
| line | `#e4e2f1` | 보더 |
| good / warn / bad | `#4fa3a2` / `#c79a4e` / `#b96b8f` | 점수 구간(≥65 / 45–64 / <45) |

### 배경 (메시 그라데이션)
5개 `radial-gradient` 오버레이로 드리미 메시 연출(라벤더 좌상 → 페리윙클 우상 → 위스테리아 우하 → 아쿠아 좌하 → 플로럴 중앙). **`body::before`의 `position: fixed` 고정 레이어**로 깔아 모바일 깜빡임/흔들림 방지(`background-attachment: fixed` 미사용). 뷰포트 높이는 `100svh`로 주소창 변화 시 중앙정렬 흔들림 방지.

## 글래스모피즘 (핵심 질감)
- **카드(`.card`)**: `rgba(255,255,255,0.55)` + `backdrop-filter: blur(16px)` + `1px` 화이트 보더(`rgba(255,255,255,0.65)`) + soft shadow(`0 8px 30px rgba(70,80,130,.10)`), 라운드 22px.
- **선택 버튼(나이대/상황/설문 옵션)**: `bg-white/60` + `backdrop-blur` + 화이트 보더. 선택 시 `border-primary + bg-primarySoft`.
- **탭바**: `bg-white/65` + `backdrop-blur-xl` + 상단 화이트 보더, safe-area 대응.
- **입력(`.field-input`)**: `rgba(255,255,255,0.6)` + blur, 포커스 시 primary 보더.

## 타이포그래피 (결정)
- **제목·본문 모두 고딕 — Pretendard** (`h1~h4`·`.font-title` 및 `body`). 손글씨체(온글잎 박다현/긍정)에서 **고딕으로 변경**(2026-06; 진지한 컨설팅 톤·가독성). 루트 18px.
- Pretendard Variable은 `layout.tsx`의 jsDelivr `<link>`로 로드(별도 @font-face 불필요).
- fallback: `-apple-system, system-ui, "Apple SD Gothic Neo", "Malgun Gothic"`.
- **한글 줄바꿈은 단어(어절) 단위**: `word-break: keep-all; overflow-wrap: break-word;` (body 전역).

## 톤·원칙
- **이모지 최소화** — 진지한 인상. 라인 아이콘만 사용.
- 모바일 우선(최대 너비 480px), 하단 글래스 탭 네비게이션.
- 심리적 안전감을 주는 여백·부드러운 라운드(카드 22px) + 프로스트 질감.
- 버튼 CTA는 위스테리아→아쿠아 그라데이션 필(rounded-full).

## 컴포넌트(globals.css `@layer components`)
- `.btn` / `.btn-primary`(위스테리아→아쿠아 그라데이션) / `.btn-ghost`(글래스) / `.btn:disabled`(opacity-50 + not-allowed)
- `.card`(글래스, 라운드 22px)
- `.field-input`(글래스, 포커스 시 primary 보더)

## 접근성·모바일 (ralph loop 반영)
- 탭바: `focus-visible:ring-2 ring-primary` 포커스 링, 활성 탭 `bg-primarySoft` 하이라이트, 터치 타깃 ≥48px, `pb-[env(safe-area-inset-bottom)]`.
- 위기 상담 카드: `border-2 border-primary` + 알림 아이콘으로 가시성 강화(안전 크리티컬).
- 진행바 `duration-500 ease-out`, 설문 자동진행 320ms.

## 적용 항목
- [x] 컬러 — 파스텔(라벤더/위스테리아/아쿠아) 메인
- [x] 글래스모피즘(카드·버튼·탭바·입력)
- [x] 메시 그라데이션 배경
- [x] 타이포 — Pretendard 고딕(제목·본문) + keep-all
- [x] 하단 글래스 탭바(접근성·safe-area)
- [ ] 모션/마이크로인터랙션 추가 정교화(ux-improvement-backlog 참고)
- [ ] 일러스트 톤

> 참고: `prototype/` 및 루트 `font-preview.html`은 초기 탐색용이라 현재 디자인과 다릅니다. 기준은 `web/`.
> 개선 백로그: [`docs/ux-improvement-backlog.md`](../ux-improvement-backlog.md)
