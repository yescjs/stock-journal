-- Phase 1: 전략 관리 및 목표 설정을 위한 DB 스키마 변경
-- 
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- 
-- Author: Antigravity
-- Date: 2025-12-21

-- =====================================================
-- 1. strategies 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entry_rules TEXT,
  exit_rules TEXT,
  risk_notes TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON strategies FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE strategies IS '사용자 정의 매매 전략 템플릿';

-- =====================================================
-- 2. trades 테이블에 전략/복기 관련 컬럼 추가
-- =====================================================
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL;

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS entry_reason TEXT;

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS exit_reason TEXT;

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS emotion_tag TEXT;

COMMENT ON COLUMN trades.strategy_id IS '매매에 사용된 전략 ID';
COMMENT ON COLUMN trades.entry_reason IS '진입 이유 (마크다운)';
COMMENT ON COLUMN trades.exit_reason IS '청산 이유 (마크다운)';
COMMENT ON COLUMN trades.emotion_tag IS '매매 시 심리 상태 (PLANNED, FOMO, FEAR 등)';

-- =====================================================
-- 3. monthly_goals 테이블 생성 (Phase 2용, 미리 생성)
-- =====================================================
CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,           -- YYYY-MM 형식
  target_pnl NUMERIC NOT NULL,   -- 목표 손익
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- RLS 정책
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON monthly_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON monthly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON monthly_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON monthly_goals FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE monthly_goals IS '월별 목표 손익 설정';

-- =====================================================
-- 4. 인덱스 추가
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month ON monthly_goals(user_id, month);
