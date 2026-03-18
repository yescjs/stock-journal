# user_events 30일 자동 삭제 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pg_cron을 사용해 `user_events` 테이블에서 30일이 지난 데이터를 매일 자동 삭제한다.

**Architecture:** 마이그레이션 파일에 pg_cron 등록 가이드를 주석으로 포함하고, Supabase SQL 에디터에서 별도로 실행한다. 기존 `20260316_daily_coin_reset.sql`과 동일한 패턴을 따른다.

**Tech Stack:** Supabase PostgreSQL, pg_cron

---

## Chunk 1: 마이그레이션 파일 생성 및 적용

### Task 1: 마이그레이션 파일 생성

**Files:**
- Create: `supabase/migrations/20260316000002_user_events_cleanup_cron.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260316000002_user_events_cleanup_cron.sql
-- user_events 30일 이상 된 데이터 자동 삭제 (pg_cron)
--
-- 사전 조건: Supabase 대시보드 → Database → Extensions → pg_cron 활성화
--
-- 아래 구문을 Supabase SQL 에디터에서 별도 실행:
--
-- SELECT cron.unschedule('cleanup-user-events')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-user-events');
-- SELECT cron.schedule(
--   'cleanup-user-events',
--   '0 15 * * *',
--   $$DELETE FROM public.user_events WHERE created_at < now() - interval '30 days'$$
-- );
--
-- 실행 시간: UTC 15:00 = KST 자정 (매일)
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | grep -E "✓ Compiled|error" | head -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260316000002_user_events_cleanup_cron.sql
git commit -m "feat: add pg_cron job to auto-delete user_events older than 30 days"
```

---

### Task 2: Supabase에 pg_cron 스케줄 등록

> 이 단계는 코드 변경 없이 Supabase SQL 에디터에서 실행한다.

- [ ] **Step 1: Supabase SQL 에디터에서 실행**

```sql
SELECT cron.unschedule('cleanup-user-events')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-user-events');

SELECT cron.schedule(
  'cleanup-user-events',
  '0 15 * * *',
  $$DELETE FROM public.user_events WHERE created_at < now() - interval '30 days'$$
);
```

- [ ] **Step 2: 등록 확인**

```sql
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'cleanup-user-events';
```

Expected:

| jobname | schedule | command | active |
|---|---|---|---|
| cleanup-user-events | 0 15 * * * | DELETE FROM public.user_events... | true |

---

## 완료 기준

- [ ] `supabase/migrations/20260316000002_user_events_cleanup_cron.sql` 파일이 존재한다
- [ ] `cron.job` 테이블에 `cleanup-user-events` 잡이 `active = true`로 등록되어 있다
- [ ] `npm run build`가 오류 없이 완료된다
