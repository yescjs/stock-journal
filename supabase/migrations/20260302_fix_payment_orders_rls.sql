-- payment_orders INSERT 정책 추가 (초기 마이그레이션에서 누락)
CREATE POLICY "payment_orders_insert" ON public.payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
