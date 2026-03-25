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


-- ─── AI 리포트 루프 분석 ──────────────────────────────────────────────────────

-- 코인 부족으로 차단된 AI 분석 요청 (잠재 수요)
select
  properties->>'report_type' as report_type,
  count(*) as blocked_count
from user_events
where event_name = 'ai_report_blocked'
group by report_type;

-- AI 리포트 평균 체류시간 (ms)
select
  round(avg((properties->>'view_duration_ms')::numeric)) as avg_duration_ms,
  count(*) as view_count
from user_events
where event_name = 'ai_report_viewed';

-- AI 분석 요청 vs 실제 열람 비율
select
  count(*) filter (where event_name = 'ai_analysis_run') as requested,
  count(*) filter (where event_name = 'ai_report_viewed') as viewed,
  count(*) filter (where event_name = 'ai_report_blocked') as blocked
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
