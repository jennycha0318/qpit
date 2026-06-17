# AI 컨설팅 로직 상세 설계

> PRD §6의 확장 문서. 이 문서가 차별화의 핵심 로직을 규정한다.
> 상태: 🚧 초안 — 현재 MVP는 **규칙 기반(결정적) 엔진**으로 동작하며, LLM 레이어는 계획 단계.

## 0. 현재 구현 상태 (2026-06 MVP)
- **현재 진단 엔진은 규칙 기반(결정적)이며 LLM/AI API를 호출하지 않는다.** 같은 입력은 항상 같은 결과를 낸다.
- 구현 위치: `web/src/lib/diagnose/survey.ts`(설문 정의), `web/src/lib/diagnose/engine.ts`(점수·플랜·근거 계산).
- 흐름: `/diagnose`에서 나이대 → 상황(썸 `crush` / 연애 `dating` / 이별 `breakup`) → 설문 → 결과 리포트. 비로그인(게스트)도 진단 가능, 로그인 시 `diagnoses` 테이블에 저장.
- 산출물: 점수(3~97 clamp), 요인(`factors`), 플랜(`when`/`channel`/`steps`), 액션, 리스크, 추천 메시지. 위기 플래그 `needsSupport`, 청소년(미성년 10대) 플래그 `minor`.
- 자유 서술 입력(`freeText`)은 기록으로만 저장되고 **현재 점수에는 반영되지 않는다**(추후 AI 개인화에 활용 예정).
- 아래 §1~§5의 LLM 파이프라인(프레임워크 규칙 → LLM 프롬프트 → 검증)은 **계획**이다. `web/src/lib/frameworks/`·`web/src/lib/ai/`에는 현재 설계 README만 있고 구현 코드는 없다.

## 1. 파이프라인 개요 (계획)
> 아래는 향후 LLM 개인화 레이어를 결합했을 때의 목표 파이프라인이다. **현재 MVP는 [규칙 레이어]까지만 결정적으로 구현되어 있고, [LLM 프롬프트] 이후는 미구현이다.**
```
사용자 입력(설문)
  → [정규화] 입력을 표준 변수로 변환                  ← (현재) 설문 응답을 enum 변수로 사용
  → [규칙 레이어] 심리 이론 기반 가중치/제약 적용        ← (현재) engine.ts의 결정적 점수 계산
  → [LLM 프롬프트] 구조화 프롬프트로 진단 생성 (JSON)   ← (계획/미구현)
  → [후처리/검증] 가드레일·스키마 검증                  ← (계획/미구현)
  → 진단 리포트 렌더링                                ← (현재) Report 컴포넌트
```

## 2. 입력 변수 (정규화 대상)
현재 설문 문항·enum은 `web/src/lib/diagnose/survey.ts`에 정의되어 있다(상황별 분기).
- 공통: 상대 표현 성향 `partner`(expressive/inconsistent/reserved ≈ 안정/불안/회피형), 본인 태도 `selfAttach`(secure/anxious/avoidant), 마음 상태 `urgency`(low/mid/high), 자유 서술 `freeText`(선택, 점수 미반영).
- 썸(`crush`): 알게 된 기간 `period`, 연락 추세 `trend`, 상대 반응 온도 `warmth`, 연락 주도 `initiation`, 호감 신호 `signals`.
- 연애(`dating`): 교제 기간 `period`, 관계 분위기 `mood`, 갈등 `conflict`, 갈등 대응 `resolve`, 미래 대화 `future`.
- 이별(`breakup`): 교제 기간 `period`, 경과 시간 `since`, 이별 주도 `who`, 이별 사유 `reason`, 현재 연락 상태 `contact`(차단 `blocked` 포함), 상대 새 사람 `newperson`.

> 정확한 enum/라벨/문항 매핑은 항상 `survey.ts`가 기준이다.

## 3. 규칙 레이어 (현재 구현 — 핵심 차별점)
범용 LLM의 아첨(sycophancy)을 억제하고 일관된 전문가 판단을 재현하는 **결정적 규칙**. `web/src/lib/diagnose/engine.ts`에 구현됨.
- 각 응답 enum에 가중치(delta)를 매핑해 합산 → 기준점(상황별 50/58 등)에 더하고 **3~97로 clamp**.
- 특수 규칙(예): 이별 시 상대 차단(`blocked`)이면 점수를 20 이하로 제한하고 위기 안내. "나만 달려가는" 집착 패턴(과한 연락 + 불안/조급)은 감점 + 리스크 경고 + `needsSupport` 플래그.
- 점수 구간(65↑ / 45~64 / 45↓)별로 근거·액션·리스크·추천 메시지·플랜(when/channel/steps)을 결정적으로 생성.

> (계획) 아래 심리 프레임워크를 별도 규칙 모듈(`web/src/lib/frameworks/`)로 형식화하고 LLM 프롬프트에 주입하는 작업은 미구현이다(현재는 engine.ts 내부에 직접 코드화):
> - 애착이론: 상대 유형별 적정 접근 속도 · 재접촉 곡선: 이별 후 경과시간 ↔ 수용도 · 상호성·희소성: 과잉 연락 vs 적정 거리 · 손실회피: 무행동의 기회비용 제시

## 4. 출력 스키마
### 4-1. 현재 구현 (`Diagnosis` — engine.ts)
```ts
interface Diagnosis {
  scoreTitle: string;          // 예: "고백 적정도" / "관계 안정도" / "재회 시도 적정도"
  score: number;               // 3~97 clamp
  factors: { label: string; delta: number }[];
  reason: string;
  actions: { t: string; d: string }[];
  risks: string[];
  msgLabel: string;
  msg?: string;                // 추천 연락 문구 (보류 시 생략)
  hold?: string;               // "지금은 보내지 마세요" 안내
  plan: { when: string; tone: "good"|"warn"|"bad"; channel: string;
          steps: { time: string; action: string }[] };
  needsSupport?: boolean;      // 정서 위기 → 상담 연결 노출
  minor?: boolean;             // 미성년(10대) → 청소년 눈높이 톤
}
```

### 4-2. LLM 출력 목표 스키마 (계획)
> 향후 LLM 레이어를 도입하면 구조화 JSON 출력을 강제하고, 위 `Diagnosis`와 매핑/검증할 예정이다.
```json
{
  "timingScore": 72,
  "timingLabel": "now | wait_n_days | hold",
  "timingReason": "한 줄 근거",
  "actions": [{ "priority": 1, "content": "...", "reason": "..." }],
  "risks": ["흔한 실수 경고"],
  "generatedMessage": "추천 연락 문구 초안"
}
```

## 5. 안전 가드레일
현재 가드레일은 규칙 엔진과 UI에 직접 구현되어 있다(LLM 프롬프트 아님).
- 집착·매달림 패턴 감지 시 감점 + 리스크 경고, 차단(`blocked`) 시 모든 연락 중단 권고.
- 비단정 프레이밍, 위기 신호(`needsSupport`) 시 상담 연결(자살예방 109, 청소년 1388)·법적·윤리 고지 노출(`SupportNotices` 컴포넌트).
- 미성년(10대) 모드(`minor`)는 청소년 눈높이 톤 + 지지 강화.

> (계획) LLM 도입 시 위 가드레일을 시스템 프롬프트에도 내장 → `web/src/lib/ai/prompts/`. PRD §8 참조.
