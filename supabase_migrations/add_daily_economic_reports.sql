-- =====================================================
-- Daily Economic Reports Schema
-- 매일 아침 9시 경제 보고서 저장 테이블
-- 
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- 
-- Author: Antigravity
-- Date: 2026-02-03
-- =====================================================

-- 1. daily_economic_reports 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_economic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,              -- 보고서 날짜 (전날 기준)
  title TEXT NOT NULL,                    -- 보고서 제목
  summary TEXT NOT NULL,                  -- 전체 요약 (AI 생성)
  korean_news JSONB DEFAULT '[]',         -- 국내 뉴스 목록 [{title, source, url, summary}]
  global_news JSONB DEFAULT '[]',         -- 해외 뉴스 목록 [{title, source, url, summary}]
  key_issues JSONB DEFAULT '[]',          -- 핵심 이슈 목록 [{topic, impact, stocks}]
  market_sentiment TEXT,                  -- 시장 심리 (bullish/bearish/neutral)
  ai_generated BOOLEAN DEFAULT true,      -- AI 생성 여부
  is_read BOOLEAN DEFAULT false,        -- 사용자 읽음 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

-- RLS 정책
ALTER TABLE daily_economic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own economic reports"
  ON daily_economic_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own economic reports"
  ON daily_economic_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own economic reports"
  ON daily_economic_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own economic reports"
  ON daily_economic_reports FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE daily_economic_reports IS 'AI 생성 일일 경제 보고서';

-- 2. 인덱스 추가
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_daily_economic_reports_user_id 
  ON daily_economic_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_economic_reports_date 
  ON daily_economic_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_economic_reports_user_date 
  ON daily_economic_reports(user_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_economic_reports_unread 
  ON daily_economic_reports(user_id, is_read) 
  WHERE is_read = false;

-- 3. updated_at 자동 갱신 함수 및 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_daily_economic_reports_updated_at 
  ON daily_economic_reports;

CREATE TRIGGER update_daily_economic_reports_updated_at
  BEFORE UPDATE ON daily_economic_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 시스템 설정 테이블 (경제 보고서 설정)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_daily_report BOOLEAN DEFAULT true,    -- 일일 보고서 활성화
  report_time TIME DEFAULT '09:00',            -- 보고서 생성 시간
  preferred_sources JSONB DEFAULT '["naver", "yahoo", "bloomberg"]',  -- 선호 뉴스 소스
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS 정책
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_preferences IS '사용자 설정 및 선호도';

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON user_preferences(user_id);

-- 트리거 추가
DROP TRIGGER IF EXISTS update_user_preferences_updated_at 
  ON user_preferences;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
