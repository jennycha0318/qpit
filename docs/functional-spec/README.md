# Functional Spec

Pacemaker 웹앱의 기능 명세. 페이지별 spec + 전체 flow.
구현체: `web/` (Next.js 15 App Router). Prod: `https://pacemaker-six-eta.vercel.app`

## 문서 구성
- [flow.md](flow.md) — 전체 사용자 플로우 (인증·진단·전환·재설정·네비게이션)
- 페이지별 spec ([pages/](pages/))

## 페이지 목록
| 페이지 | 경로 | 접근 | Spec |
|--------|------|------|------|
| 랜딩 | `/` | 공개 | [landing.md](pages/landing.md) |
| 로그인 | `/login` | 공개 | [login.md](pages/login.md) |
| 회원가입 | `/signup` | 공개 | [signup.md](pages/signup.md) |
| 비밀번호 찾기 | `/reset-password` | 공개 | [reset-password.md](pages/reset-password.md) |
| 새 비밀번호 설정 | `/update-password` | 복구 세션 | [update-password.md](pages/update-password.md) |
| 진단 (메인 탭) | `/diagnose` | 공개(저장은 로그인) | [diagnose.md](pages/diagnose.md) |
| 히스토리 | `/history` | 로그인 | [history.md](pages/history.md) |
| 히스토리 상세 | `/history/[id]` | 로그인 | [history-detail.md](pages/history-detail.md) |
| 프로필 | `/profile` | 로그인 | [profile.md](pages/profile.md) |
| 개인정보처리방침 | `/privacy` | 공개 | (페이지: `web/src/app/privacy/page.tsx`) |

부가:
- `/home` → `/diagnose` 리다이렉트 (구 대시보드, 하단 탭으로 대체)
- `/auth/callback` → OAuth·이메일 인증 콜백 (페이지 아님, [flow.md](flow.md) 참조)
- 하단 탭바(진단/히스토리/프로필) → **앱 화면에서 항상 표시**(랜딩·인증 화면 제외) ([flow.md](flow.md) §4)
- 진단은 **나이대 선택(10대=청소년 모드)** → 상황 → 설문 순. 안전 고지(상담·법률·동의)는 [flow.md](flow.md) §6 참조.

## 관련 문서
- 백엔드/DB: [../backend/schema.md](../backend/schema.md)
- 제품 기획: [../PRD.md](../PRD.md)
- AI 개인화 설계: [../product/ai-personalization.md](../product/ai-personalization.md)
