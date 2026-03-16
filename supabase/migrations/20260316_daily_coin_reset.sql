-- 0. 기존 'purchase' 타입 데이터를 'refund'로 마이그레이션 (결제 시스템 제거에 따른 데이터 정리)
UPDATE public.coin_transactions SET type = 'refund' WHERE type = 'purchase';

-- 1. coin_transactions.type CHECK 제약 조건 업데이트
--    purchase 제거, daily_bonus 추가, refund 유지 (AI 분석 오류 환불에 사용)
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
    CHECK (type IN ('signup_bonus', 'daily_bonus', 'spend', 'refund'));

-- 2. payment_orders 테이블 삭제
DROP TABLE IF EXISTS public.payment_orders;

-- 3. 일일 코인 리셋 함수
--    auth.users 기준 UPSERT → user_coins 행이 없는 신규 유저도 포함
CREATE OR REPLACE FUNCTION public.reset_daily_coins()
RETURNS void AS $$
BEGIN
  -- 모든 유저 잔액을 10으로 리셋 (행이 없는 유저는 INSERT)
  INSERT INTO public.user_coins (user_id, balance)
  SELECT id, 10 FROM auth.users
  ON CONFLICT (user_id) DO UPDATE SET balance = 10, updated_at = now();

  -- 오늘 이미 daily_bonus를 받은 유저는 제외 (중복 방지)
  -- amount=10은 실제 증감분이 아닌 "리셋 후 잔액"을 의미한다 (의도적).
  INSERT INTO public.coin_transactions (user_id, type, amount, balance_after)
  SELECT uc.user_id, 'daily_bonus', 10, 10
  FROM public.user_coins uc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coin_transactions ct
    WHERE ct.user_id = uc.user_id
      AND ct.type = 'daily_bonus'
      AND ct.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. pg_cron 스케줄 등록 (KST 자정 = UTC 15:00)
--    사전 조건: Supabase 대시보드 → Database → Extensions → pg_cron 활성화 필요
--    pg_cron 활성화 후 대시보드 SQL Editor에서 아래 구문을 별도 실행할 것:
--
--    SELECT cron.unschedule('daily-coin-reset')
--      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-coin-reset');
--    SELECT cron.schedule('daily-coin-reset', '0 15 * * *', 'SELECT public.reset_daily_coins()');
