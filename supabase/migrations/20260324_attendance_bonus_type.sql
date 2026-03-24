-- coin_transactions.type CHECK 제약 조건에 attendance_bonus 추가
-- 기존 daily_bonus(크론 일일 리셋)와 분리하여 출석 스트릭 보너스 전용 타입
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
    CHECK (type IN ('signup_bonus', 'daily_bonus', 'attendance_bonus', 'spend', 'refund'));
