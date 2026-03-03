-- ============================================================
-- 코인 시스템 마이그레이션
-- ============================================================

-- 1. 코인 잔액 테이블
CREATE TABLE IF NOT EXISTS public.user_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. 코인 거래 내역
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('signup_bonus', 'purchase', 'spend', 'refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Toss 결제 주문
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  toss_payment_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS 정책
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_coins_self" ON public.user_coins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "coin_transactions_self" ON public.coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payment_orders_self" ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

-- 5. 코인 차감 RPC (원자적)
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_ref_type TEXT,
  p_ref_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance INTEGER;
  v_balance_after INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM public.user_coins
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS';
  END IF;

  v_balance_after := v_balance - p_amount;

  UPDATE public.user_coins
  SET balance = v_balance_after, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.coin_transactions
    (user_id, type, amount, balance_after, reference_type, reference_id)
  VALUES
    (p_user_id, 'spend', -p_amount, v_balance_after, p_ref_type, p_ref_id);

  RETURN v_balance_after;
END;
$$;

-- 6. 코인 충전 RPC (원자적)
CREATE OR REPLACE FUNCTION public.add_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_ref_type TEXT,
  p_ref_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance_after INTEGER;
BEGIN
  INSERT INTO public.user_coins (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_coins.balance + p_amount,
      updated_at = now()
  RETURNING balance INTO v_balance_after;

  INSERT INTO public.coin_transactions
    (user_id, type, amount, balance_after, reference_type, reference_id)
  VALUES
    (p_user_id, p_type, p_amount, v_balance_after, p_ref_type, p_ref_id);

  RETURN v_balance_after;
END;
$$;

-- 7. 신규 가입 트리거 (5코인 자동 지급)
CREATE OR REPLACE FUNCTION public.on_new_user_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.add_coins(NEW.id, 5, 'signup_bonus', 'signup_bonus', NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_new_user_signup();
