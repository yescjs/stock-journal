# user_events 30일 자동 삭제 설계

**날짜**: 2026-03-16
**목적**: user_events 테이블에 쌓이는 데이터가 무한정 증가하지 않도록, 30일이 지난 이벤트를 매일 자동으로 삭제한다.

---

## 구현 방식

**pg_cron 직접 DELETE** — 별도 함수 없이 cron 스케줄에 DELETE 쿼리를 직접 등록한다.

기존 `daily-coin-reset` 패턴과 동일하게:
1. 마이그레이션 파일에 주석으로 SQL 에디터 실행 가이드를 포함한다.
2. pg_cron 스케줄은 Supabase SQL 에디터에서 별도 실행한다.

---

## 마이그레이션 파일

**파일**: `supabase/migrations/20260316000002_user_events_cleanup_cron.sql`

```sql
-- user_events 30일 이상 된 데이터 자동 삭제 (pg_cron)
-- 사전 조건: Supabase 대시보드 → Database → Extensions → pg_cron 활성화
-- 아래 구문은 Supabase SQL 에디터에서 별도 실행:
--
-- SELECT cron.unschedule('cleanup-user-events')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-user-events');
-- SELECT cron.schedule(
--   'cleanup-user-events',
--   '0 15 * * *',
--   $$DELETE FROM public.user_events WHERE created_at < now() - interval '30 days'$$
-- );
```

---

## 실행 시간

`0 15 * * *` (UTC) = 매일 KST 자정

기존 `daily-coin-reset` 스케줄(UTC 15:00)과 동일한 시간대 기준을 사용한다.

---

## 완료 기준

- 마이그레이션 파일이 존재한다
- Supabase SQL 에디터에서 cron.schedule 구문을 실행하면 `cron.job` 테이블에 `cleanup-user-events` 잡이 등록된다
- 30일 초과 데이터가 매일 자동으로 삭제된다
