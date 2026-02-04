-- 경제 보고서 테이블에 새 필드 추가
-- 시장 개요, 섹터 분석, 경제 지표, 투자 시사점

ALTER TABLE daily_economic_reports
  ADD COLUMN IF NOT EXISTS market_overview TEXT,
  ADD COLUMN IF NOT EXISTS sector_analysis JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS market_indicators JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS investment_insights JSONB DEFAULT '[]';
