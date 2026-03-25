# TODOS

## 1. Vitest 단위 테스트 인프라 설치 + useEventTracking 훅 테스트

**What:** Vitest를 설치하고 `useEventTracking` 훅에 대한 단위 테스트를 작성한다.

**Why:** 현재 Playwright E2E만 있어 내부 로직(이벤트 로깅, 훅 동작)을 자동 검증할 수 없다. 이벤트 추적이 실제로 동작하는지, silent fail이 올바르게 처리되는지 확인 불가.

**Pros:**
- 내부 로직 회귀 방지
- 리팩토링 안전망
- 새 이벤트 추가 시 빠른 검증

**Cons:**
- Vitest + React Testing Library 설치/설정 필요 (CC: ~15min)
- 테스트 유지보수 비용 발생

**Context:** `useEventTracking`은 현재 7개 컴포넌트/훅에서 사용 중. Supabase `user_events` 테이블에 INSERT하는 단순한 훅이지만, silent fail 처리와 게스트 무시 로직이 있어 테스트할 가치 있음. Vitest는 Next.js 16과 호환되며 설정이 간단.

**Depends on:** 없음

---

## 2. 디자인 문서 업데이트 — 기존 구현 반영

**What:** `~/.gstack/projects/yescjs-stock-journal/` 디자인 문서의 "구현 범위" 섹션을 현재 상태로 업데이트한다.

**Why:** 디자인 문서가 이미 구현된 이벤트 로깅 시스템(7개 이벤트, useEventTracking 훅, user_events 테이블)을 새로 제안하고 있어 혼란 유발.

**Pros:**
- 문서와 코드의 일관성 유지
- 향후 참조 시 혼란 방지

**Cons:**
- 문서 작업만 필요, 코드 변경 없음

**Context:** 2026-03-16에 user_events 테이블 + useEventTracking 훅 + 7개 이벤트 전부 구현됨. 2026-03-25 Eng Review에서 ai_report_blocked + ai_report_viewed 2개 추가.

**Depends on:** 없음
