# 데이터 모델

> 단일 진실(source of truth)은 [`web/prisma/schema.prisma`](../../web/prisma/schema.prisma).
> 이 문서는 그 설계 의도를 설명한다.

## 엔티티 관계
```
User 1──1 Profile
User 1──N Case
Case 1──N Diagnosis
Case 1──N Event        (v2: 타임라인)
Diagnosis 1──1 Feedback (데이터 플라이휠)
```

## 엔티티 요약
| 엔티티 | 역할 | 핵심 필드 |
|--------|------|-----------|
| **User** | 사용자 (익명 허용) | email?, ageRange, gender? |
| **Profile** | 성향 프로필 | attachmentType, loveValues, conflictStyle |
| **Case** | 한 건의 연애 고민 | stage, durationDays, lastContactAt, contactTrend, partnerAttachment |
| **Diagnosis** | AI 진단 결과 | timingScore, timingLabel, actions[], risks[], generatedMessage |
| **Event** | 케이스 타임라인 (v2) | type, occurredAt |
| **Feedback** | 결과 피드백 (품질개선) | followed, outcome |

## 설계 메모
- **익명 우선**: `User.email`은 optional — 민감 도메인이라 가입 없이 사용 가능해야 함
- **JSON 문자열 필드**: SQLite 단계에선 배열/객체를 문자열로 저장. PostgreSQL 전환 시 `Json` 타입으로 변경
- **Diagnosis에 model/promptVer 기록**: 추천 품질을 모델·프롬프트 버전별로 추적 (재현성)
- **Feedback = 데이터 플라이휠**: PRD §11-2의 핵심 해자. 실제 결과를 모아 추천 개선

## DB 전략
- 개발: SQLite (빠른 시작)
- 운영: PostgreSQL (Supabase/Neon 등 검토)
