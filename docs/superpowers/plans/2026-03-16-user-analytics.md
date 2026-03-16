# 사용자 행동 분석 시스템 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 Supabase SQL로 기능 사용량·리텐션·이탈 포인트를 파악할 수 있도록 `user_events` 이벤트 로그 테이블과 클라이언트 추적 레이어를 구축한다.

**Architecture:** `user_events` 테이블 하나에 모든 행동을 `event_name + properties(jsonb)` 형태로 기록한다. `useEventTracking` 훅이 Supabase insert를 담당하고, 기존 훅/컴포넌트에서 직접 `track()`을 호출한다. 게스트(비로그인)는 추적하지 않는다.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Supabase PostgreSQL, Supabase JS SDK

---

## Chunk 1: DB 마이그레이션 + 훅 구현

### Task 1: Supabase 마이그레이션 — `user_events` 테이블 생성

**Files:**
- Create: `supabase/migrations/20260316000001_create_user_events.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260316000001_create_user_events.sql

create table if not exists public.user_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_name  text not null,
  properties  jsonb default '{}',
  created_at  timestamptz default now()
);

-- 조회 성능용 인덱스
create index if not exists user_events_user_id_created_at_idx
  on public.user_events (user_id, created_at desc);

create index if not exists user_events_event_name_created_at_idx
  on public.user_events (event_name, created_at desc);

-- RLS 활성화 (관리자만 전체 조회, 본인 데이터만 insert)
alter table public.user_events enable row level security;

-- 본인 이벤트만 insert 가능
create policy "users can insert own events"
  on public.user_events
  for insert
  with check (auth.uid() = user_id);

-- 관리자(service_role)만 전체 select 가능 — anon/authenticated는 select 불가
-- (Supabase SQL 에디터는 service_role로 실행되므로 관리자 분석 가능)
```

- [ ] **Step 2: Supabase에 마이그레이션 적용**

Supabase 대시보드 SQL 에디터에서 위 SQL을 실행하거나:
```bash
npx supabase db push
```

Expected: `user_events` 테이블과 인덱스 2개, RLS 정책 1개 생성

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260316000001_create_user_events.sql
git commit -m "feat: add user_events migration for analytics tracking"
```

---

### Task 2: `useEventTracking` 훅 구현

**Files:**
- Create: `app/hooks/useEventTracking.ts`

- [ ] **Step 1: 훅 파일 작성**

```typescript
// app/hooks/useEventTracking.ts
'use client';

import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';

export function useEventTracking(user: User | null) {
  const track = useCallback(
    async (eventName: string, properties: Record<string, unknown> = {}) => {
      if (!user) return; // 게스트는 추적 안 함

      try {
        await supabase.from('user_events').insert({
          user_id: user.id,
          event_name: eventName,
          properties,
        });
      } catch (err) {
        // 추적 실패는 조용히 무시 (사용자 경험 영향 없도록)
        console.error('[analytics] track failed:', err);
      }
    },
    [user]
  );

  return { track };
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/hooks/useEventTracking.ts
git commit -m "feat: add useEventTracking hook for analytics"
```

---

## Chunk 2: 이벤트 호출 연결

### Task 3: `session_start` 이벤트 — `trade/page.tsx`

**Files:**
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: `useEventTracking` import 추가**

`app/trade/page.tsx` 상단 훅 import 목록에 추가:
```typescript
import { useEventTracking } from '@/app/hooks/useEventTracking';
```

- [ ] **Step 2: 훅 인스턴스 생성**

`TradePage` 컴포넌트 안, 기존 훅 선언부(`useStreak`, `useOnboarding` 아래)에 추가:
```typescript
const { track } = useEventTracking(currentUser);
```

- [ ] **Step 3: 세션 시작 이벤트 기록**

기존 스트릭 `useEffect` (약 58번째 줄) 바로 아래에 추가:
```typescript
// 세션 시작 이벤트 (로그인 사용자, 인증 로딩 완료 후 1회)
const sessionTrackedRef = useRef(false);
useEffect(() => {
    if (!authLoading && currentUser && !sessionTrackedRef.current) {
        sessionTrackedRef.current = true;
        track('session_start', { page: '/trade' });
    }
}, [authLoading, currentUser, track]);
```

- [ ] **Step 4: 빌드 오류 없는지 확인**

```bash
npm run build 2>&1 | tail -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add app/trade/page.tsx
git commit -m "feat: track session_start event on trade page"
```

---

### Task 4: `trade_created` 이벤트 — `trade/page.tsx`

**Files:**
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: `handleAddTrade` 성공 후 track 호출 추가**

`handleAddTrade` 함수 안, `showNotify('success', ...)` 바로 아래에 추가:
```typescript
track('trade_created', { symbol: data.symbol, side: data.side });
```

수정 후 함수 모습:
```typescript
const handleAddTrade = async (data: TradeSubmitData, imageFile: File | null) => {
    try {
        await addTrade(data, imageFile);
        showNotify('success', '기록이 저장되었습니다.');
        track('trade_created', { symbol: data.symbol, side: data.side });
        recordToday();
        onboarding.completeStep('firstTrade');
        // ... 이하 동일
    }
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: 커밋**

```bash
git add app/trade/page.tsx
git commit -m "feat: track trade_created event on add trade"
```

---

### Task 5: `import_completed` 이벤트 — `trade/page.tsx`

**Files:**
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: ImportModal `onImport` 콜백 안에 track 추가**

`app/trade/page.tsx`의 `ImportModal` 렌더링 부분:
```typescript
<ImportModal
    isOpen={showImportModal}
    onClose={() => setShowImportModal(false)}
    existingTrades={trades}
    onImport={async (newTrades) => {
        const count = await importTrades(newTrades);
        showNotify('success', `${count}건의 거래가 추가되었습니다.`);
        track('import_completed', { trade_count: count });  // 추가
        return count;
    }}
/>
```

- [ ] **Step 2: 커밋**

```bash
git add app/trade/page.tsx
git commit -m "feat: track import_completed event"
```

---

### Task 6: `ai_analysis_run` 이벤트 — `useAIAnalysis.ts`

**Files:**
- Modify: `app/hooks/useAIAnalysis.ts`

- [ ] **Step 1: `useEventTracking` import 추가**

```typescript
import { useEventTracking } from '@/app/hooks/useEventTracking';
```

- [ ] **Step 2: 훅 파라미터에 `track` 주입 방식 대신, 훅 내부에서 직접 사용**

`useAIAnalysis` 함수 시그니처 유지 (변경 없음), 함수 본문 상단에 추가:
```typescript
const { track } = useEventTracking(user);
```

- [ ] **Step 3: `generateWeeklyReport` 성공 후 track 추가**

`setWeeklyReport(data);` 바로 아래:
```typescript
track('ai_analysis_run', { report_type: 'weekly_report' });
```

- [ ] **Step 4: `reviewTrade` 성공 후 track 추가**

`setTradeReview(prev => ...)` 바로 아래:
```typescript
track('ai_analysis_run', { report_type: 'trade_review' });
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: 커밋**

```bash
git add app/hooks/useAIAnalysis.ts
git commit -m "feat: track ai_analysis_run event"
```

---

### Task 7: `onboarding_completed` 이벤트 — `useOnboarding.ts`

**Files:**
- Modify: `app/hooks/useOnboarding.ts`

> 참고: `useOnboarding`은 이미 `user: User | null`을 첫 번째 파라미터로 받는다 (`export function useOnboarding(user: User | null)`). 시그니처 변경 불필요.

- [ ] **Step 1: `useEventTracking` import 추가**

```typescript
import { useEventTracking } from '@/app/hooks/useEventTracking';
```

- [ ] **Step 2: 훅 내부에서 track 인스턴스 생성**

`useOnboarding(user: User | null)` 함수 본문 상단(기존 `useState` 선언 바로 아래)에 추가:
```typescript
const { track } = useEventTracking(user);
```

- [ ] **Step 3: `completeStep`에서 모든 단계 완료 시 track 추가**

`completeStep` 콜백 안, `allDone` 판단 직후:
```typescript
const allDone = Object.values(newSteps).every(Boolean);
const completedAt = allDone ? new Date().toISOString() : data.completedAt;

if (allDone) {
  track('onboarding_completed');
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: 커밋**

```bash
git add app/hooks/useOnboarding.ts
git commit -m "feat: track onboarding_completed event"
```

---

### Task 8: `tool_used` 이벤트 — 계산기 컴포넌트들

> 참고: `app/tools/*/page.tsx` 파일들은 Server Components (`'use client'` 없음)이므로 훅을 사용할 수 없다. 실제 렌더링은 `app/components/tools/` 안의 클라이언트 컴포넌트가 담당하므로, 이 파일들을 수정한다.

**Files:**
- Modify: `app/components/tools/PositionSizeCalculator.tsx`
- Modify: `app/components/tools/RiskRewardCalculator.tsx`
- Modify: `app/components/tools/CompoundCalculator.tsx`
- Modify: `app/components/tools/AverageDownCalculator.tsx`

- [ ] **Step 1: 각 계산기 컴포넌트 상단 확인**

```bash
head -5 app/components/tools/PositionSizeCalculator.tsx
head -5 app/components/tools/RiskRewardCalculator.tsx
head -5 app/components/tools/CompoundCalculator.tsx
head -5 app/components/tools/AverageDownCalculator.tsx
```

Expected: 모두 `'use client';` 로 시작

- [ ] **Step 2: 각 컴포넌트에 공통 패턴 적용**

각 파일에 `useSupabaseAuth`, `useEventTracking`, `useEffect`를 추가하고 마운트 시 `tool_used` 이벤트를 기록한다.

예시 (`PositionSizeCalculator.tsx`):
```typescript
// 기존 import 목록에 추가
import { useEffect } from 'react';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';

// 컴포넌트 함수 내부 상단에 추가:
const { user } = useSupabaseAuth();
const { track } = useEventTracking(user);

useEffect(() => {
  track('tool_used', { tool: 'position-size' });
}, [track]);
```

나머지 컴포넌트도 동일하게 적용 (`tool` 값만 변경):
- `RiskRewardCalculator` → `{ tool: 'risk-reward' }`
- `CompoundCalculator` → `{ tool: 'compound-calculator' }`
- `AverageDownCalculator` → `{ tool: 'average-down' }`

- [ ] **Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: 커밋**

```bash
git add app/components/tools/
git commit -m "feat: track tool_used event on calculator components"
```

---

### Task 9: `calendar_viewed` 이벤트 — `CalendarView.tsx`

> 참고: `CalendarView`는 `user` prop을 받지 않고, 렌더링 경로가 `trade/page.tsx → TradeListView → CalendarView`로 이미 2단계다. CLAUDE.md 규칙("Prop drilling: Max 2 levels")에 따라 prop을 추가로 전달하지 않고, CalendarView 내부에서 `useSupabaseAuth()`를 직접 호출한다.

**Files:**
- Modify: `app/components/CalendarView.tsx`

- [ ] **Step 1: import 추가**

`app/components/CalendarView.tsx` 상단에 추가:
```typescript
import { useEffect } from 'react';
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useEventTracking } from '@/app/hooks/useEventTracking';
```

- [ ] **Step 2: 컴포넌트 함수 내부에 추적 로직 추가**

`CalendarView` 함수 내부 상단(기존 `const dataMap = useMemo(...)` 바로 앞)에 추가:
```typescript
const { user } = useSupabaseAuth();
const { track } = useEventTracking(user);

useEffect(() => {
  track('calendar_viewed');
}, [track]);
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: 커밋**

```bash
git add app/components/CalendarView.tsx
git commit -m "feat: track calendar_viewed event"
```

---

## Chunk 3: 검증 및 분석 쿼리 문서화

### Task 10: 수동 검증

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: 로그인 후 기능 사용**

1. `/trade` 진입 → `session_start` 발생 확인
2. 거래 1건 입력 → `trade_created` 발생 확인
3. AI 분석 실행 → `ai_analysis_run` 발생 확인
4. `/tools/position-size` 방문 → `tool_used` 발생 확인

- [ ] **Step 3: Supabase SQL 에디터에서 확인**

```sql
select event_name, properties, created_at
from user_events
order by created_at desc
limit 20;
```

Expected: 위에서 실행한 이벤트들이 행으로 조회됨

---

### Task 11: 분석 쿼리 파일 저장

**Files:**
- Create: `docs/analytics-queries.sql`

- [ ] **Step 1: 쿼리 파일 작성**

```sql
-- docs/analytics-queries.sql
-- 사용자 행동 분석 쿼리 모음 (Supabase SQL 에디터에서 실행)

-- ─── 기능 사용량 ────────────────────────────────────────────────────────────

-- 이벤트별 총 사용 횟수
select event_name, count(*) as total
from user_events
group by event_name
order by total desc;

-- 도구별 사용 횟수
select properties->>'tool' as tool, count(*) as total
from user_events
where event_name = 'tool_used'
group by tool
order by total desc;

-- AI 분석 유형별 사용 횟수
select properties->>'report_type' as report_type, count(*) as total
from user_events
where event_name = 'ai_analysis_run'
group by report_type;


-- ─── 리텐션 ─────────────────────────────────────────────────────────────────

-- 가입 후 7일 내 재방문한 사용자 비율
select
  count(distinct e.user_id) filter (
    where e.created_at > u.created_at + interval '1 day'
    and   e.created_at < u.created_at + interval '7 days'
  ) * 100.0 / nullif(count(distinct u.id), 0) as retention_7d_pct
from auth.users u
left join user_events e on e.user_id = u.id;

-- 가입 후 30일 내 재방문한 사용자 비율
select
  count(distinct e.user_id) filter (
    where e.created_at > u.created_at + interval '1 day'
    and   e.created_at < u.created_at + interval '30 days'
  ) * 100.0 / nullif(count(distinct u.id), 0) as retention_30d_pct
from auth.users u
left join user_events e on e.user_id = u.id;


-- ─── 이탈 포인트 (온보딩 퍼널) ──────────────────────────────────────────────

-- 가입 → 첫 거래 → 온보딩 완료 단계별 사용자 수
select
  count(distinct user_id) filter (where event_name = 'session_start')        as step1_visited,
  count(distinct user_id) filter (where event_name = 'trade_created')         as step2_first_trade,
  count(distinct user_id) filter (where event_name = 'onboarding_completed')  as step3_onboarding_done
from user_events;

-- AI 분석까지 도달한 사용자 수
select
  count(distinct user_id) filter (where event_name = 'trade_created')   as has_trade,
  count(distinct user_id) filter (where event_name = 'ai_analysis_run') as used_ai
from user_events;


-- ─── DAU (일별 활성 사용자) ──────────────────────────────────────────────────

select
  created_at::date as day,
  count(distinct user_id) as dau
from user_events
where event_name = 'session_start'
group by day
order by day desc
limit 30;


-- ─── 주간 활성 사용자 (WAU) ──────────────────────────────────────────────────

select
  date_trunc('week', created_at)::date as week_start,
  count(distinct user_id) as wau
from user_events
where event_name = 'session_start'
group by week_start
order by week_start desc
limit 12;
```

- [ ] **Step 2: 커밋**

```bash
git add docs/analytics-queries.sql
git commit -m "docs: add analytics SQL queries for admin use"
```

---

## 완료 기준

- [ ] `user_events` 테이블이 Supabase에 존재하고 RLS가 활성화되어 있다
- [ ] 로그인 후 `/trade` 진입 시 `session_start` 이벤트가 기록된다
- [ ] 거래 입력 시 `trade_created` 이벤트가 기록된다
- [ ] CSV 가져오기 완료 시 `import_completed` 이벤트가 기록된다
- [ ] AI 분석 실행 시 `ai_analysis_run` 이벤트가 기록된다
- [ ] 계산기 도구 방문 시 `tool_used` 이벤트가 기록된다
- [ ] 캘린더 탭 방문 시 `calendar_viewed` 이벤트가 기록된다
- [ ] 온보딩 모든 단계 완료 시 `onboarding_completed` 이벤트가 기록된다
- [ ] `docs/analytics-queries.sql` 쿼리가 Supabase SQL 에디터에서 오류 없이 실행된다
- [ ] `npm run build`가 오류 없이 완료된다
