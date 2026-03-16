# 사용자 행동 분석 시스템 설계

**날짜**: 2026-03-16
**목적**: 관리자가 서비스 개선을 위해 사용자의 기능 사용량, 리텐션, 이탈 포인트를 파악한다
**저장소**: Supabase PostgreSQL
**조회 방법**: SQL 에디터 (향후 대시보드 확장 가능)

---

## 1. 데이터 모델

### `user_events` 테이블

```sql
create table user_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  event_name  text not null,
  properties  jsonb default '{}',
  created_at  timestamptz default now()
);

-- 조회 성능용 인덱스
create index on user_events (user_id, created_at desc);
create index on user_events (event_name, created_at desc);
```

- `user_id` — 로그인 사용자만 추적 (게스트 제외)
- `event_name` — 이벤트 식별자
- `properties` — 이벤트별 추가 데이터 (jsonb)

### 추적 이벤트 목록

| event_name | 발생 시점 | properties 예시 |
|---|---|---|
| `session_start` | 앱 진입 시 | `{ page: '/trade' }` |
| `trade_created` | 거래 입력 완료 | `{ symbol, side, strategy_id }` |
| `ai_analysis_run` | AI 분석 실행 | `{ report_type: 'weekly' }` |
| `tool_used` | 계산기 도구 사용 | `{ tool: 'position-size' }` |
| `calendar_viewed` | 캘린더 탭 열기 | — |
| `onboarding_completed` | 온보딩 체크리스트 완료 | — |
| `import_completed` | CSV 가져오기 완료 | `{ trade_count: 12 }` |

---

## 2. 클라이언트 추적 레이어

### `useEventTracking` 훅

```ts
// app/hooks/useEventTracking.ts
export function useEventTracking(user: User | null) {
  const track = useCallback(async (
    eventName: string,
    properties: Record<string, unknown> = {}
  ) => {
    if (!user) return; // 게스트는 추적 안 함
    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: eventName,
      properties,
    });
  }, [user]);

  return { track };
}
```

### 호출 위치

기존 훅/컴포넌트에서 직접 `track()`을 호출한다. 별도 미들웨어 없이 기존 코드 흐름에 삽입한다.

| 위치 | 이벤트 |
|---|---|
| `trade/page.tsx` 마운트 | `session_start` |
| `useTrades.ts` — 거래 저장 성공 후 | `trade_created` |
| `useAIAnalysis.ts` — 분석 실행 후 | `ai_analysis_run` |
| `tools/*/page.tsx` 마운트 | `tool_used` |
| `CalendarView.tsx` 마운트 | `calendar_viewed` |
| `useOnboarding.ts` — 완료 처리 시 | `onboarding_completed` |
| `ImportModal.tsx` — 가져오기 성공 후 | `import_completed` |

---

## 3. 분석 SQL 쿼리

### 기능 사용량

```sql
-- 이벤트별 사용 횟수 (전체 기간)
select event_name, count(*) as total
from user_events
group by event_name
order by total desc;
```

### 리텐션 (가입 후 7일/30일 재방문)

```sql
-- 가입 후 7일 내 재방문한 사용자 비율
select
  count(distinct e.user_id) filter (
    where e.created_at > u.created_at + interval '1 day'
    and   e.created_at < u.created_at + interval '7 days'
  ) * 100.0 / count(distinct u.id) as retention_7d_pct
from auth.users u
left join user_events e on e.user_id = u.id;
```

### 이탈 포인트 (온보딩 퍼널)

```sql
-- 가입 → 첫 거래 → 온보딩 완료 단계별 사용자 수
select
  count(distinct user_id) filter (where event_name = 'session_start')       as step1_session,
  count(distinct user_id) filter (where event_name = 'trade_created')        as step2_trade,
  count(distinct user_id) filter (where event_name = 'onboarding_completed') as step3_onboarding
from user_events;
```

### DAU (일별 활성 사용자)

```sql
select
  created_at::date as day,
  count(distinct user_id) as dau
from user_events
where event_name = 'session_start'
group by day
order by day desc
limit 30;
```

---

## 4. 향후 확장

- `/admin` 페이지 추가 시 위 SQL을 API Route로 래핑해서 시각화
- 이벤트 추가는 `user_events` 테이블 변경 없이 새 `event_name` + `properties`만 삽입하면 됨
- RLS 정책: `user_events`는 관리자 role만 전체 조회 가능하도록 설정 권장
