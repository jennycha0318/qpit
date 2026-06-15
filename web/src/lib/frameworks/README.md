# lib/frameworks — 심리 프레임워크 규칙 레이어 ★

**이 폴더가 Pacemaker의 핵심 차별점이다.** (PRD §11-2)
범용 LLM의 아첨(sycophancy)·일관성 부족을 보완하는, 검증된 심리 이론 기반 규칙 레이어.

## 역할
입력 변수를 받아 → 프레임워크 규칙을 적용 → 가중치·권고·제약을 산출.
이 결과를 `lib/ai`의 프롬프트에 주입해 LLM이 "전문가 관점"으로 판단하도록 강제한다.

## 예정 구성
```
frameworks/
├── attachment.ts    # 애착이론: 상대 유형별 적정 접근 속도
├── reContact.ts     # 재접촉 곡선: 이별 후 경과시간 ↔ 수용도
├── reciprocity.ts   # 상호성·희소성: 과잉 연락 vs 적정 거리
├── lossAversion.ts  # 손실회피: 무행동의 기회비용
└── index.ts         # 규칙 통합 → 종합 가중치 산출
```

## 형식 (예시 아이디어)
```ts
// 각 규칙: (입력) => { weight, recommendation, constraints }
// 예) 이별 14일 미만 + 상대 회피형 → 재접촉 점수 감점, "no-contact 유지" 권고
```

> TODO: docs/product/ai-logic.md §3을 규칙으로 형식화
