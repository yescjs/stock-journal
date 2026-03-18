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
-- (RLS가 활성화된 상태에서 select 정책 없음 = 전체 denied가 기본값)
-- Supabase SQL 에디터는 service_role로 실행되므로 관리자 분석에 활용 가능

-- 이 테이블은 append-only 설계:
-- INSERT만 허용, UPDATE/DELETE 정책 없음 (= 모두 denied)
