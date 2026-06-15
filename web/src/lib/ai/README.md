# lib/ai — Claude API 연동 + 프롬프트

AI 진단 생성의 LLM 레이어.

## 예정 구성
```
ai/
├── client.ts      # Anthropic SDK 클라이언트 (claude-opus-4-8)
├── diagnose.ts    # 입력 → 진단(JSON) 생성 메인 함수
├── prompts/       # 시스템·진단 프롬프트 (버전 관리)
│   └── ...
└── schema.ts      # 진단 출력 JSON 스키마 (zod)
```

## 원칙
- 출력은 **구조화 JSON 강제** (자유 산문 금지) → docs/product/ai-logic.md §4
- 안전 가드레일을 시스템 프롬프트에 내장 → PRD §8
- `frameworks/`의 규칙 결과를 프롬프트에 주입 (LLM 단독 판단 금지)
- 프롬프트 버전을 Diagnosis.promptVer에 기록 (재현성)
